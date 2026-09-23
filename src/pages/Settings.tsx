import { useState, useEffect } from 'react';
import { db } from '../storage/db';
import { aiService } from '../services/aiService';
import { aiConfigService } from '../services/aiConfigService';
import type { AIProvider } from '../services/aiProviders/types';
import { aiModelRegistry } from '../services/aiModelRegistry';
import type { AIModelConfig } from '../config/aiModels';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import './Settings.css';

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
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([]);
  
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
      
      const models = await aiModelRegistry.getModelsForProvider(initialProvider);
      setAvailableModels(models);

      if (savedDefaultModel) {
        setDefaultModel(savedDefaultModel as string);
      } else if (models.length > 0) {
        setDefaultModel(models[0].id);
      }

      // Load config & AI service
      await aiConfigService.loadConfig();
      await aiService.initialize();
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveApiKey(provider: AIProvider, apiKey: string) {
    if (!apiKey.trim()) {
      alert('Please enter an API Key');
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

  async function handleSetDefaultProvider(provider: AIProvider) {
    try {
      await aiService.setDefaultProvider(provider);
      setDefaultProvider(provider);
      
      const models = await aiModelRegistry.getModelsForProvider(provider);
      setAvailableModels(models);
      
      if (models.length > 0) {
        const newModel = models[0].id;
        setDefaultModel(newModel);
        await db.saveSetting('defaultAIModel', newModel);
      }
      
      alert(`Default AI provider set to ${provider.toUpperCase()}`);
    } catch (error: any) {
      alert(`Setting failed: ${error?.message || error}`);
    }
  }

  async function handleSetDefaultModel(modelId: string) {
    try {
      await db.saveSetting('defaultAIModel', modelId);
      setDefaultModel(modelId);
    } catch (error: any) {
      alert(`Setting failed: ${error?.message || error}`);
    }
  }

  async function handleDeleteApiKey(provider: AIProvider) {
    const providerName = aiConfigService.getProviderName(provider) || provider;

    const confirmMessage = `Are you sure you want to delete the ${providerName} API Key?\n\n` +
      `⚠️ Privacy Notice:\n` +
      `- Your API Key will be permanently deleted from local storage\n` +
      `- This action cannot be undone\n` +
      `- All data is stored locally in your browser (IndexedDB)\n` +
      `- No API keys are sent to external servers except for API calls\n\n` +
      `Click OK to confirm deletion.`;

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

      // Reload default provider if it changed
      const savedDefault = await db.getSetting('defaultAIProvider');
      if (savedDefault) {
        setDefaultProvider(savedDefault as AIProvider);
      } else {
        setDefaultProvider('gemini');
      }

      // Reinitialize AI service
      await aiService.initialize();

      alert(`${providerName} API Key has been permanently deleted.\n\nYour privacy is protected - the key has been removed from local storage.`);
    } catch (error: unknown) {
      console.error(`Failed to delete ${provider} API key:`, error);
      alert(`Delete failed: ${error instanceof Error ? error.message : error}`);
    }
  }



  function getProviderHint(provider: AIProvider): { text: string; link?: string; linkText?: string } {
    switch (provider) {
      case 'gemini':
        return {
          text: 'For testing prompt effects. You can get an API Key from',
          link: 'https://makersuite.google.com/app/apikey',
          linkText: 'Google AI Studio',
        };
      case 'openai':
        return {
          text: 'For testing prompt effects. You can get an API Key from',
          link: 'https://platform.openai.com/api-keys',
          linkText: 'OpenAI Platform',
        };
      case 'nvidia':
        return {
          text: 'For testing prompt effects. Visit',
          link: 'https://build.nvidia.com/explore/discover',
          linkText: 'NVIDIA Build',
        };
      case 'anthropic':
        return {
          text: 'For testing prompt effects. You can get an API Key from',
          link: 'https://console.anthropic.com/settings/keys',
          linkText: 'Anthropic Console',
        };
      case 'groq':
        return {
          text: 'Fast inference for open models. Get a key from',
          link: 'https://console.groq.com/keys',
          linkText: 'Groq Console',
        };
      case 'deepseek':
        return {
          text: 'For testing DeepSeek models. Get a key from',
          link: 'https://platform.deepseek.com/api_keys',
          linkText: 'DeepSeek Platform',
        };
      default:
        return { text: '' };
    }
  }

  function getSaveBtn(provider: AIProvider) {
    const state = buttonStates[provider];
    if (state === 'loading') return { label: '⏳ Testing...', disabled: true, style: {} };
    if (state === 'success') return { label: '✓ Saved', disabled: true, style: { background: 'var(--success)', color: 'var(--bg)' } };
    if (state === 'error')   return { label: '✗ Invalid Key',  disabled: true, style: { background: 'var(--danger)', color: 'var(--text)' } };
    return { label: 'Save & Test', disabled: false, style: {} };
  }

  return (
    <div className="settings-page">
      <SEOHead
        title="Settings — 系統設定"
        description="系統偏好設定、AI 模型 Provider 密鑰配置與本地儲存管理。"
        canonical="https://www.205011.xyz/settings"
      />
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>AI Provider Configuration</h2>
        
        {/* Default Provider Selection */}
        <div className="setting-item" style={{ marginBottom: '20px' }}>
          <label htmlFor="default-provider">Default AI Provider</label>
          <select
            id="default-provider"
            name="defaultProvider"
            value={defaultProvider}
            onChange={(e) => handleSetDefaultProvider(e.target.value as AIProvider)}
            disabled={isLoading}
            className="provider-select"
          >
            {aiConfigService.getAllProviders().map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="setting-hint">
            Select the default AI provider to use when running prompts
          </p>
        </div>

        {/* Default Model Selection */}
        {availableModels.length > 0 && (
          <div className="setting-item" style={{ marginBottom: '24px' }}>
            <label htmlFor="default-model">Default AI Model</label>
            <select
              id="default-model"
              name="defaultModel"
              value={defaultModel}
              onChange={(e) => handleSetDefaultModel(e.target.value)}
              disabled={isLoading}
              className="model-select"
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="setting-hint">
              Select the default model to use when testing prompts
            </p>
          </div>
        )}

        <div className="byok-info-banner">
          <h4>🔐 Bring Your Own Key (BYOK) Mode</h4>
          <ul>
            <li>Your API keys are stored <strong>locally</strong> in your browser's IndexedDB.</li>
            <li>During testing, the selected key is sent <strong>once</strong> to our Vercel Serverless Endpoint.</li>
            <li>We use the <strong>Vercel AI SDK Proxy</strong> runtime to safely handle the request.</li>
            <li>Your keys are <strong>never persisted</strong> on our servers.</li>
          </ul>
        </div>
        
        <div className="providers-grid">
          {/* Gemini */}
          <div className="provider-form">
            <h3>Gemini (Google)</h3>
            <p className="provider-desc">
              {getProviderHint('gemini').text}{' '}
              <a href={getProviderHint('gemini').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('gemini').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('gemini'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('gemini', geminiApiKey)}
                    disabled={b.disabled || !geminiApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {geminiApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('gemini')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.gemini === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.gemini === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>

          {/* OpenAI */}
          <div className="provider-form">
            <h3>OpenAI (GPT)</h3>
            <p className="provider-desc">
              {getProviderHint('openai').text}{' '}
              <a href={getProviderHint('openai').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('openai').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="Enter your OpenAI API Key (sk-...)"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('openai'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('openai', openaiApiKey)}
                    disabled={b.disabled || !openaiApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {openaiApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('openai')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.openai === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.openai === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>

          {/* NVIDIA */}
          <div className="provider-form">
            <h3>NVIDIA Build</h3>
            <p className="provider-desc">
              {getProviderHint('nvidia').text}{' '}
              <a href={getProviderHint('nvidia').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('nvidia').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={nvidiaApiKey}
                onChange={(e) => setNvidiaApiKey(e.target.value)}
                placeholder="Enter your NVIDIA API Key (nvapi-...)"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('nvidia'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('nvidia', nvidiaApiKey)}
                    disabled={b.disabled || !nvidiaApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {nvidiaApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('nvidia')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.nvidia === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.nvidia === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>

          {/* Anthropic */}
          <div className="provider-form">
            <h3>Anthropic (Claude)</h3>
            <p className="provider-desc">
              {getProviderHint('anthropic').text}{' '}
              <a href={getProviderHint('anthropic').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('anthropic').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="Enter your Anthropic API Key (sk-ant-...)"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('anthropic'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('anthropic', anthropicApiKey)}
                    disabled={b.disabled || !anthropicApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {anthropicApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('anthropic')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.anthropic === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.anthropic === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>

          {/* Groq */}
          <div className="provider-form">
            <h3>Groq</h3>
            <p className="provider-desc">
              {getProviderHint('groq').text}{' '}
              <a href={getProviderHint('groq').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('groq').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="Enter your Groq API Key (gsk_...)"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('groq'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('groq', groqApiKey)}
                    disabled={b.disabled || !groqApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {groqApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('groq')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.groq === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.groq === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>

          {/* DeepSeek */}
          <div className="provider-form">
            <h3>DeepSeek</h3>
            <p className="provider-desc">
              {getProviderHint('deepseek').text}{' '}
              <a href={getProviderHint('deepseek').link} target="_blank" rel="noopener noreferrer">
                {getProviderHint('deepseek').linkText}
              </a>
            </p>
            
            <div className="api-key-input-group">
              <input
                type="password"
                value={deepseekApiKey}
                onChange={(e) => setDeepseekApiKey(e.target.value)}
                placeholder="Enter your DeepSeek API Key (sk-...)"
                className="settings-input"
              />
              
              <div className="api-key-actions">
                {(() => { const b = getSaveBtn('deepseek'); return (
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveApiKey('deepseek', deepseekApiKey)}
                    disabled={b.disabled || !deepseekApiKey.trim()}
                    style={b.style}
                  >
                    {b.label}
                  </button>
                ); })()}
                
                {deepseekApiKey && (
                  <button 
                    className="btn-danger"
                    onClick={() => handleDeleteApiKey('deepseek')}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            
            {testResults.deepseek === 'success' && (
              <div className="test-success">✅ Connection successful</div>
            )}
            {testResults.deepseek === 'error' && (
              <div className="test-error">❌ Connection failed</div>
            )}
          </div>
        </div>
        
        {/* End of Providers Grid */}
      </div>
    </div>
  );
}
