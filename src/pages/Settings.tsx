import { useState, useEffect } from 'react';
import { db } from '../storage/db';
import { aiService } from '../services/aiService';
import { aiConfigService } from '../services/aiConfigService';
import type { AIProvider } from '../services/aiProviders/types';
import { SUPPORTED_MODELS, type AIModelConfig } from '../config/aiModels';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import { Icon as RiIcon } from '@iconify/react';
import './Settings.css';

// Canonical labels for every provider the app can talk to. The cloud config may
// omit providers, so the default-provider select falls back to these instead of
// rendering a blank value when the stored provider is missing from that config.
const KNOWN_PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini (Google)',
  openai: 'OpenAI (GPT)',
  nvidia: 'NVIDIA Build',
  anthropic: 'Anthropic (Claude)',
  groq: 'Groq',
  deepseek: 'DeepSeek',
};

const KNOWN_PROVIDER_ORDER: AIProvider[] = ['gemini', 'openai', 'nvidia', 'anthropic', 'groq', 'deepseek'];

interface ProviderDefinition {
  id: AIProvider;
  name: string;
  summary: string;
  placeholder: string;
}

const PROVIDERS: ProviderDefinition[] = KNOWN_PROVIDER_ORDER.map(id => ({
  id,
  name: KNOWN_PROVIDER_LABELS[id],
  summary: {
    gemini: 'Google 多模态模型',
    openai: 'GPT 系列模型',
    nvidia: 'NIM 开源模型',
    anthropic: 'Claude 系列模型',
    groq: '低延迟推理服务',
    deepseek: 'DeepSeek 对话与推理模型',
  }[id],
  placeholder: {
    gemini: '输入你的 Gemini API Key',
    openai: '输入你的 OpenAI API Key (sk-...)',
    nvidia: '输入你的 NVIDIA API Key (nvapi-...)',
    anthropic: '输入你的 Anthropic API Key (sk-ant-...)',
    groq: '输入你的 Groq API Key (gsk_...)',
    deepseek: '输入你的 DeepSeek API Key (sk-...)',
  }[id],
}));

export default function Settings() {
  useNoIndex();
  const [isLoading, setIsLoading] = useState(true);
  
  // API Keys
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [nvidiaApiKey, setNvidiaApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  
  // Default provider and model
  const [defaultProvider, setDefaultProvider] = useState<AIProvider>('gemini');
  const [defaultModel, setDefaultModel] = useState<string>('');
  
  // API key button states: 'idle' | 'loading' | 'success' | 'error'
  const [buttonStates, setButtonStates] = useState<Record<AIProvider, 'idle' | 'loading' | 'success' | 'error'>>({
    gemini: 'idle',
    openai: 'idle',
    nvidia: 'idle',
    anthropic: 'idle',
    groq: 'idle',
    deepseek: 'idle',
  });

  // Keep testResults for the existing success/error indicators below each form
  const [testResults, setTestResults] = useState<Record<AIProvider, 'success' | 'error' | null>>({
    gemini: null,
    openai: null,
    nvidia: null,
    anthropic: null,
    groq: null,
    deepseek: null,
  });
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>('gemini');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      // Load API keys
      const keySetters: Array<{ key: string; setter: (v: string) => void }> = [
        { key: 'geminiApiKey', setter: setGeminiApiKey },
        { key: 'openaiApiKey', setter: setOpenaiApiKey },
        { key: 'nvidiaApiKey', setter: setNvidiaApiKey },
        { key: 'anthropicApiKey', setter: setAnthropicApiKey },
        { key: 'groqApiKey', setter: setGroqApiKey },
        { key: 'deepseekApiKey', setter: setDeepseekApiKey },
      ];

      for (const { key, setter } of keySetters) {
        const val = await db.getSetting(key);
        if (val) setter(val);
      }

      const savedDefaultProvider = await db.getSetting('defaultAIProvider');
      const savedDefaultModel = await db.getSetting('defaultAIModel');
      
      const initialProvider = (savedDefaultProvider as AIProvider) || 'gemini';
      setDefaultProvider(initialProvider);
      setExpandedProvider(initialProvider);

      const models = SUPPORTED_MODELS.filter(model => model.provider === initialProvider);

      if (savedDefaultModel) {
        setDefaultModel(savedDefaultModel as string);
      } else if (models.length > 0) {
        setDefaultModel(models[0].id);
      }

      // Load config & AI service
      await aiConfigService.loadConfig();
      await aiService.initialize();

      setExpandedProvider(initialProvider);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveApiKey(provider: AIProvider, apiKey: string) {
    if (!apiKey.trim()) {
      alert('请输入 API Key');
      return;
    }

    const setBtn = (state: 'idle' | 'loading' | 'success' | 'error') =>
      setButtonStates((prev) => ({ ...prev, [provider]: state }));

    try {
      setBtn('loading');
      setTestResults((prev) => ({ ...prev, [provider]: null }));

      // Test API key first
      const isValid = await aiService.testApiKey(provider, apiKey.trim());
      
      if (!isValid) {
        setBtn('error');
        setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
        setTimeout(() => setBtn('idle'), 3000);
        return;
      }

      // Save API key
      await aiService.setProviderApiKey(provider, apiKey.trim());
      
      // Update local state
      switch (provider) {
        case 'gemini': setGeminiApiKey(apiKey.trim()); break;
        case 'openai': setOpenaiApiKey(apiKey.trim()); break;
        case 'nvidia': setNvidiaApiKey(apiKey.trim()); break;
        case 'anthropic': setAnthropicApiKey(apiKey.trim()); break;
        case 'groq': setGroqApiKey(apiKey.trim()); break;
        case 'deepseek': setDeepseekApiKey(apiKey.trim()); break;
      }

      setBtn('success');
      setTestResults((prev) => ({ ...prev, [provider]: 'success' }));
      setTimeout(() => setBtn('idle'), 3000);
    } catch (error: unknown) {
      setBtn('error');
      setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
      setTimeout(() => setBtn('idle'), 3000);
      console.error(`Failed to save ${provider} API key:`, error);
    }
  }

  async function handleSelectModel(provider: AIProvider, modelId: string) {
    try {
      if (provider !== defaultProvider) {
        await aiService.setDefaultProvider(provider);
        setDefaultProvider(provider);
      }

      await db.saveSetting('defaultAIModel', modelId);
      setDefaultModel(modelId);
      setExpandedProvider(provider);
    } catch (error: any) {
      alert(`设置失败：${error?.message || error}`);
    }
  }

  async function handleSetDefaultProvider(provider: AIProvider) {
    const models = SUPPORTED_MODELS.filter(model => model.provider === provider);
    const nextModel = provider === defaultProvider
      ? defaultModel
      : models.find(model => model.id === defaultModel)?.id || models[0]?.id;

    if (!nextModel) {
      alert('该服务商暂无可用模型');
      return;
    }

    await handleSelectModel(provider, nextModel);
  }

  async function handleDeleteApiKey(provider: AIProvider) {
    const providerName = aiConfigService.getProviderName(provider) || provider;

    const confirmMessage = `确定要删除 ${providerName} 的 API Key 吗？\n\n` +
      `⚠️ 隐私提示：\n` +
      `- 你的 API Key 将从本地存储中永久删除\n` +
      `- 此操作无法撤销\n` +
      `- 所有数据仅保存在你的浏览器（IndexedDB）中\n` +
      `- 除 API 调用外，不会将 API Key 发送到外部服务器\n\n` +
      `点击“确定”确认删除。`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete from service (removes from storage and providers map)
      await aiService.deleteProviderApiKey(provider);

      // Clear local state
      switch (provider) {
        case 'gemini':
          setGeminiApiKey('');
          break;
        case 'openai':
          setOpenaiApiKey('');
          break;
        case 'nvidia':
          setNvidiaApiKey('');
          break;
        case 'anthropic':
          setAnthropicApiKey('');
          break;
        case 'groq':
          setGroqApiKey('');
          break;
        case 'deepseek':
          setDeepseekApiKey('');
          break;
      }

      // Clear test results
      setTestResults((prev) => ({ ...prev, [provider]: null }));
      setExpandedProvider(current => current === provider ? null : current);

      // Reload default provider if it changed
      const savedDefault = await db.getSetting('defaultAIProvider');
      if (savedDefault) {
        setDefaultProvider(savedDefault as AIProvider);
      } else {
        setDefaultProvider('gemini');
      }

      // Reinitialize AI service
      await aiService.initialize();

      alert(`${providerName} API Key 已被永久删除。\n\n你的隐私已受保护 —— 该密钥已从本地存储中移除。`);
    } catch (error: unknown) {
      console.error(`Failed to delete ${provider} API key:`, error);
      alert(`删除失败：${error instanceof Error ? error.message : error}`);
    }
  }



  function getProviderHint(provider: AIProvider): { text: string; link?: string; linkText?: string } {
    switch (provider) {
      case 'gemini':
        return {
          text: '用于测试提示词效果，可前往',
          link: 'https://makersuite.google.com/app/apikey',
          linkText: 'Google AI Studio',
        };
      case 'openai':
        return {
          text: '用于测试提示词效果，可前往',
          link: 'https://platform.openai.com/api-keys',
          linkText: 'OpenAI Platform',
        };
      case 'nvidia':
        return {
          text: '用于测试提示词效果，请访问',
          link: 'https://build.nvidia.com/explore/discover',
          linkText: 'NVIDIA Build',
        };
      case 'anthropic':
        return {
          text: '用于测试提示词效果，可前往',
          link: 'https://console.anthropic.com/settings/keys',
          linkText: 'Anthropic Console',
        };
      case 'groq':
        return {
          text: '面向开源模型的快速推理，可前往',
          link: 'https://console.groq.com/keys',
          linkText: 'Groq Console',
        };
      case 'deepseek':
        return {
          text: '用于测试 DeepSeek 模型，可前往',
          link: 'https://platform.deepseek.com/api_keys',
          linkText: 'DeepSeek Platform',
        };
      default:
        return { text: '' };
    }
  }

  function getSaveBtn(provider: AIProvider) {
    const state = buttonStates[provider];
    if (state === 'loading') return { label: '⏳ 测试中…', disabled: true, style: {} };
    if (state === 'success') return { label: '✓ 已保存', disabled: true, style: { background: 'var(--success)', color: 'var(--bg)' } };
    if (state === 'error')   return { label: '✗ 密钥无效',  disabled: true, style: { background: 'var(--danger)', color: 'var(--text)' } };
    return { label: '保存并测试', disabled: false, style: {} };
  }

  const apiKeyByProvider: Record<AIProvider, string> = {
    gemini: geminiApiKey,
    openai: openaiApiKey,
    nvidia: nvidiaApiKey,
    anthropic: anthropicApiKey,
    groq: groqApiKey,
    deepseek: deepseekApiKey,
  };

  const apiKeySetterByProvider: Record<AIProvider, (value: string) => void> = {
    gemini: setGeminiApiKey,
    openai: setOpenaiApiKey,
    nvidia: setNvidiaApiKey,
    anthropic: setAnthropicApiKey,
    groq: setGroqApiKey,
    deepseek: setDeepseekApiKey,
  };

  const providerModels = Object.fromEntries(
    PROVIDERS.map(provider => [
      provider.id,
      SUPPORTED_MODELS.filter(model => model.provider === provider.id),
    ]),
  ) as Record<AIProvider, AIModelConfig[]>;

  const toggleProvider = (provider: AIProvider) => {
    setExpandedProvider(current => current === provider ? null : provider);
  };

  return (
    <div className="settings-page">
      <SEOHead
        title="模型设置 — Prompt Kit"
        description="选择默认 AI 服务商与模型，并在浏览器本地配置 API Key。"
        canonical="https://www.205011.xyz/settings"
      />

      <header className="settings-header">
        <div>
          <h1>模型设置</h1>
          <p>选择服务商和模型，API Key 只保存在当前浏览器。</p>
        </div>
        <p className="settings-privacy-note">
          <RiIcon icon="ri:lock-2-line" width={14} height={14} aria-hidden="true" />
          API Key 仅保存在当前浏览器本地，绝不上传服务器。
        </p>
      </header>

      <div className="providers-list">
        {PROVIDERS.map(provider => {
          const apiKey = apiKeyByProvider[provider.id];
          const isConfigured = Boolean(apiKey.trim());
          const isExpanded = expandedProvider === provider.id;
          const isDefault = defaultProvider === provider.id;
          const hint = getProviderHint(provider.id);
          const models = providerModels[provider.id];
          const selectedModelId = isDefault
            ? defaultModel
            : models.find(model => model.id === defaultModel)?.id || models[0]?.id || '';
          const selectedModel = models.find(model => model.id === selectedModelId);
          const modelLabel = selectedModel?.name || '暂无可用模型';
          const panelId = `provider-panel-${provider.id}`;
          const buttonState = getSaveBtn(provider.id);

          return (
            <section
              className={`provider-card${isExpanded ? ' is-expanded' : ''}`}
              key={provider.id}
              aria-labelledby={`provider-title-${provider.id}`}
            >
              <div className="provider-card-head">
                <button
                  type="button"
                  className="provider-summary"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleProvider(provider.id)}
                >
                  <span className="provider-identity">
                    <span id={`provider-title-${provider.id}`} className="provider-name">{provider.name}</span>
                    <span className="provider-model-label">{modelLabel}</span>
                  </span>
                  <span className="provider-status">
                    {isDefault && <span className="provider-badge is-default">当前默认</span>}
                    <span className={`provider-badge ${isConfigured ? 'is-configured' : ''}`}>
                      {isConfigured ? '已配置' : '未配置'}
                    </span>
                    <RiIcon
                      className={`provider-chevron${isExpanded ? ' is-open' : ''}`}
                      icon="ri:arrow-down-s-line"
                      width={18}
                      height={18}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </div>

              {isExpanded && (
                <div className="provider-panel" id={panelId}>
                  <div className="provider-panel-meta">
                    <span>{provider.summary}</span>
                    {!isDefault && (
                      <button
                        type="button"
                        className="set-default-button"
                        onClick={() => handleSetDefaultProvider(provider.id)}
                      >
                        设为默认
                      </button>
                    )}
                  </div>

                  <div className="provider-config-grid">
                    <div className="provider-field">
                      <label htmlFor={`${provider.id}-model`}>使用模型</label>
                      <select
                        id={`${provider.id}-model`}
                        value={selectedModelId}
                        onChange={(event) => handleSelectModel(provider.id, event.target.value)}
                        disabled={isLoading || models.length === 0}
                        className="model-select"
                      >
                        {models.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="provider-field">
                      <label htmlFor={`${provider.id}-api-key`}>API Key</label>
                      <div className="api-key-inline">
                        <input
                          id={`${provider.id}-api-key`}
                          type="password"
                          value={apiKey}
                          onChange={(event) => apiKeySetterByProvider[provider.id](event.target.value)}
                          placeholder={provider.placeholder}
                          autoComplete="off"
                          className="settings-input"
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleSaveApiKey(provider.id, apiKey)}
                          disabled={buttonState.disabled || !apiKey.trim()}
                          style={buttonState.style}
                        >
                          {buttonState.label}
                        </button>
                        {isConfigured && (
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => handleDeleteApiKey(provider.id)}
                            aria-label={`删除 ${provider.name} API Key`}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="provider-key-link">
                    {hint.text}{' '}
                    {hint.link && (
                      <a href={hint.link} target="_blank" rel="noopener noreferrer">
                        {hint.linkText}
                      </a>
                    )}
                    {hint.link && <span aria-hidden="true"> ↗</span>}
                  </p>

                  {testResults[provider.id] === 'success' && (
                    <div className="test-success" role="status">✅ 连接成功</div>
                  )}
                  {testResults[provider.id] === 'error' && (
                    <div className="test-error" role="alert">❌ 连接失败</div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
