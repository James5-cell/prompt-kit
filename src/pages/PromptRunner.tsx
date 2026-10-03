import { buildTrialSystem, estimateContext, getTrialInputLimit, trialBudgetError, TRIAL_INPUT_TOKENS } from '../utils/trialBudget';
import { Link } from 'react-router-dom';
import { canTryPrompt, validateTrialInput } from '../utils/promptUsage';
import PromptUsageNotice from '../components/PromptUsageNotice';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { ICON_SIZE } from '../config/iconSizes';
import ReactMarkdown from 'react-markdown';

import { type Prompt, type Run } from '../types';
import { promptService } from '../services/promptService';
import { aiConfigService } from '../services/aiConfigService';
import { aiModelRegistry } from '../services/aiModelRegistry';
import type { AIModelConfig } from '../config/aiModels';
import { db } from '../storage/db';
import { generateId } from '../utils/id';
import type { AIProvider } from '../services/aiProviders/types';
import { executeChatStream, type ChatMessageItem } from '../services/aiTestClient';
import { useNoIndex } from '../hooks/useNoIndex';
import { useAuth } from '../auth/AuthContext';
import SEOHead from '../components/SEOHead';
import './PromptRunner.css';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  latencyMs?: number;
  providerUsed?: string;
  modelUsed?: string;
  isStreaming?: boolean;
  finishReason?: string;
}

export const MAX_TURNS = 5;

export default function PromptRunner() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  
  const [testInput, setTestInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>('');
  
  // Multi-turn conversation state & turn counter
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const turnCount = messages.filter(m => m.role === 'user').length;

  
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [hasAnyApiKey, setHasAnyApiKey] = useState<boolean>(false);
  const isMaxTurnsReached = !hasAnyApiKey && turnCount >= MAX_TURNS;
  
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [showTemplateDuringChat, setShowTemplateDuringChat] = useState<boolean>(false);
  
  const chatFeedEndRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const failedInputRef = useRef('');
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrompt(null);
    setMessages([]);
    setTestInput('');
    setTestError('');
    let active = true;
    if (id) promptService.getPrompt(id).then(loaded => {
      if (!active) return;
      if (loaded) { setPrompt(loaded); setIsFavorite(!!loaded.favorite); }
      else navigate('/prompts');
    }).catch(() => { if (active) navigate('/prompts'); });
    return () => { active = false; requestRef.current?.abort(); requestRef.current = null; };
  }, [id]);

  // Load default provider and model from Settings on mount
  useEffect(() => {
    const initSettings = async () => {
      try {
        // Check if user has configured any API Key
        const providers: AIProvider[] = ['gemini', 'openai', 'nvidia', 'anthropic', 'groq', 'deepseek'];
        let foundAny = false;
        for (const p of providers) {
          const key = await db.getSetting(`${p}ApiKey`);
          if (key && key.trim()) {
            foundAny = true;
            break;
          }
        }
        setHasAnyApiKey(foundAny);

        const savedDefaultProvider = await db.getSetting('defaultAIProvider');
        const savedDefaultModel = await db.getSetting('defaultAIModel');
        
        if (savedDefaultProvider) {
          setSelectedProvider(savedDefaultProvider as AIProvider);
          const models = await aiModelRegistry.getModelsForProvider(savedDefaultProvider);
          setAvailableModels(models);
          
          if (savedDefaultModel && models.some(m => m.id === savedDefaultModel)) {
            setSelectedModelId(savedDefaultModel);
          } else if (models.length > 0) {
            setSelectedModelId(models[0].id);
          }
        } else {
          const models = await aiModelRegistry.getModelsForProvider('gemini');
          setAvailableModels(models);
          if (models.length > 0) {
            setSelectedModelId(models[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to initialize settings in PromptRunner:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    initSettings();
  }, []);

  // Update models list when selectedProvider changes after initialization
  useEffect(() => {
    if (isInitializing) return;

    db.getSetting(`${selectedProvider}ApiKey`).then(key => setHasAnyApiKey(!!key?.trim()));
    aiModelRegistry.getModelsForProvider(selectedProvider).then(models => {
      setAvailableModels(models);
      if (models.length > 0) {
        if (!models.some(m => m.id === selectedModelId)) {
          setSelectedModelId(models[0].id);
        }
      } else {
        setSelectedModelId('');
      }
    });
  }, [selectedProvider, isInitializing, selectedModelId]);

  // Auto-scroll chat feed when messages update or streaming
  useEffect(() => {
    if (messages.length > 0) {
      chatFeedEndRef.current?.scrollIntoView({ behavior: isRunning ? 'auto' : 'smooth' });
    }
  }, [messages, isRunning]);

  const handleToggleFavorite = async () => {
    if (!prompt) return;
    try {
      const updated = await promptService.toggleFavorite(prompt.id);
      setPrompt(updated);
      setIsFavorite(!!updated.favorite);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch { setTestError('复制失败，请手动选中完整指令复制。'); }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (!prompt || !canTryPrompt(prompt) || isRunning || requestRef.current || isMaxTurnsReached) return;

    const rawInput = (textToSend !== undefined ? textToSend : testInput).trim();
    const inputError = validateTrialInput(prompt, rawInput);
    if (inputError) { setTestError(inputError); return; }
    const userMsgContent = rawInput;

    const firstInput = messages.find(m => m.role === 'user')?.content ?? userMsgContent;
    const effectiveSystemPrompt = buildTrialSystem(prompt.content, firstInput);
    const historyForApi: ChatMessageItem[] = [
      ...messages.filter(m => !m.isStreaming && m.content.trim()).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsgContent },
    ];
    const budgetError = trialBudgetError(effectiveSystemPrompt, historyForApi, getTrialInputLimit(prompt.content));
    if (budgetError) { setTestError(budgetError); return; }

    const controller = new AbortController();
    requestRef.current = controller;
    failedInputRef.current = userMsgContent;
    setIsRunning(true);
    setTestError('');

    const userMsgId = generateId();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMsgContent,
      createdAt: Date.now(),
    };

    const assistantMsgId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    const startTime = Date.now();

    try {
      await aiConfigService.loadConfig();
      const apiKey = (await db.getSetting(`${selectedProvider}ApiKey`)) || '';

      if (hasAnyApiKey && !selectedModelId) {
        throw new Error('Please select an AI model first.');
      }

      if (controller.signal.aborted) return;
      const result = await executeChatStream(
        {
          signal: controller.signal,
          promptId: prompt.id,
          systemPrompt: effectiveSystemPrompt,
          messages: historyForApi,
          provider: hasAnyApiKey ? selectedProvider : '',
          model: hasAnyApiKey ? selectedModelId : '',
          apiKey: apiKey,
        },
        (chunkText) => {
          // Real-time incremental streaming update to the specific assistant message
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: chunkText, isStreaming: true }
                : msg
            )
          );
        }
      );

      if (controller.signal.aborted) return;
      setTestInput('');
      // Finalize assistant message with performance and model details
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: result.text,
                isStreaming: false,
                latencyMs: result.latencyMs || (Date.now() - startTime),
                providerUsed: result.providerUsed,
                modelUsed: result.modelUsed,
                finishReason: result.finishReason,
              }
            : msg
        )
      );

      // Archive run to IndexedDB
      const run: Run = {
        id: generateId(),
        promptId: prompt.id,
        input: {
          turn: historyForApi.filter(m => m.role === 'user').length,
          message: userMsgContent,
        },
        output: result.text,
        model: result.modelUsed || selectedModelId || 'default',
        parameters: {},
        latency: result.latencyMs ?? (Date.now() - startTime),
        createdAt: Date.now(),
      };

      try {
        await db.saveRun(run);
        await promptService.incrementUsageCount(prompt.id);
      } catch (archiveError) {
        console.warn('试用已完成，记录暂时无法保存：', archiveError);
      }
    } catch (error: any) {
      console.error('Execution failed:', error);
      if (controller.signal.aborted) return;
      setTestError(error.message || '试用失败，请重试。');
      setTestInput(userMsgContent);
      // Clean up empty streaming placeholder if call failed completely
      setMessages(prev => {
        const partial = prev.find(m => m.id === assistantMsgId)?.content;
        return partial ? prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false, finishReason: 'interrupted' } : m) : prev.filter(m => m.id !== assistantMsgId && m.id !== userMsgId);
      });
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setIsRunning(false); }
    }
  };

  const handleResetChat = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsRunning(false);
    setMessages([]);
    setTestInput('');
    setTestError('');
    setIsFocusMode(false);
    setShowTemplateDuringChat(false);
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  if (!prompt) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] text-[var(--text-faint)] font-mono" role="status" aria-busy="true">
        Initializing workbench...
      </div>
    );
  }

  if (!canTryPrompt(prompt)) {
    return <main className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">{prompt.title}</h1>
      <PromptUsageNotice prompt={prompt} />
      <div className="flex gap-3"><button className="btn-primary" onClick={handleCopyPrompt}>{copiedPrompt ? '已复制' : '复制完整指令'}</button><Link className="btn-secondary" to={`/p/${prompt.id}`}>查看详情</Link></div>
    </main>;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": prompt.title,
    "description": `AI Prompt Template: ${prompt.title}. Interactive test and evaluation environment.`,
    "text": prompt.content,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/UseAction",
      "userInteractionCount": prompt.usageCount || 0
    }
  };

  return (
    <>
      <SEOHead
        title={`${prompt.title} — Prompt Runner`}
        description={`Evaluate and run the AI prompt: ${prompt.title}. Preview: ${prompt.content.substring(0, 100)}...`}
        canonical={`https://www.205011.xyz/prompts/${id}/run`}
        jsonLd={jsonLd}
      />

      <main className={`max-w-4xl mx-auto p-4 pb-20 md:p-8 flex flex-col gap-6 text-[var(--text-muted)] relative z-10 ${isFocusMode ? 'focus-mode-active' : ''}`}>
        {!isFocusMode && (
          <RunnerHeader 
            title={prompt.title}
            usageCount={prompt.usageCount}
            lastUsedAt={prompt.lastUsedAt}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onBack={() => navigate('/dashboard')}
            onEditPrompt={() => navigate(`/prompts/${prompt.id}`)}
            isAdmin={isAdmin}
          />
        )}

        <p className="rounded-lg border border-zinc-700 p-3 text-sm leading-relaxed text-zinc-300">
          轻量试用：当前指令每次最多输入 {getTrialInputLimit(prompt.content)} 字符。只处理文本片段；完整文章、书籍或复杂工作流请复制到其他 Agent。
          <span className="mt-1 block text-xs text-zinc-400">当前估算输入上下文：{estimateContext(buildTrialSystem(prompt.content, messages.find(m => m.role === 'user')?.content ?? testInput), [...messages.filter(m => m.content.trim()), ...(!isRunning && testInput.trim() ? [{ role: 'user', content: testInput }] : [])])} / {TRIAL_INPUT_TOKENS} tokens（含指令与历史，估算值）；另预留输出空间。</span>
        </p>
        {isRunning && <button type="button" className="btn-secondary self-start" onClick={() => { requestRef.current?.abort(); requestRef.current = null; setIsRunning(false); setMessages(prev => prev.filter(m => !m.isStreaming || m.content.trim()).map(m => m.isStreaming ? { ...m, isStreaming: false, finishReason: 'interrupted' } : m)); setTestError('已停止生成，部分输出可能不完整。'); }}>停止生成</button>}
        <div className="flex flex-col gap-6" ref={topRef}>
          {/* Initial State / Config View (when no messages yet) */}
          {messages.length === 0 && (
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
              {testError && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{testError}</p>}
              <RunnerSetupPanel 
                promptContent={prompt.content}
                prompt={prompt}
                hasAnyApiKey={hasAnyApiKey}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                availableModels={availableModels}
                testInput={testInput}
                setTestInput={setTestInput}
                isRunning={isRunning}
                onRun={() => handleSendMessage(testInput)}
              />
            </div>
          )}

          {/* Active Multi-Turn Sandbox View (when messages exist) */}
          {messages.length > 0 && (
            <div className="flex flex-col gap-5 w-full animate-in fade-in duration-200">
              {/* Sticky / Top HUD Progress & Status Bar */}
              <PlaygroundStatusBar 
                turnCount={turnCount}
                maxTurns={hasAnyApiKey ? 0 : MAX_TURNS}
                provider={selectedProvider}
                model={selectedModelId}
                hasAnyApiKey={hasAnyApiKey}
                isFocusMode={isFocusMode}
                setIsFocusMode={setIsFocusMode}
                showTemplate={showTemplateDuringChat}
                setShowTemplate={setShowTemplateDuringChat}
                onReset={handleResetChat}
              />

              {/* Collapsible Prompt Template Drawer */}
              {showTemplateDuringChat && (
                <div className="sandbox-preview-box animate-in fade-in slide-in-from-top-1 duration-150 border border-cyan-500/30">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--border)]">
                    <span className="text-xs font-semibold uppercase text-cyan-400 flex items-center gap-1.5">
                      <RiIcon icon="ri:file-code-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                      System Prompt Template
                    </span>
                    <button 
                      onClick={handleCopyPrompt}
                      className="btn-ghost py-0.5 px-2 text-[11px] gap-1 flex items-center text-zinc-300 hover:text-white"
                    >
                      {copiedPrompt ? (
                        <><RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.xs} height={ICON_SIZE.xs} className="text-emerald-400" /> Copied</>
                      ) : (
                        <><RiIcon icon="ri:clipboard-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} /> Copy Template</>
                      )}
                    </button>
                  </div>
                  <pre className="mono-code">
                    <code>{prompt.content}</code>
                  </pre>
                </div>
              )}

              {/* Multi-turn Interactive Chat Feed */}
              <InteractiveChatFeed 
                messages={messages}
                isRunning={isRunning}
                testError={testError}
                onRetryLast={() => {
                  setTestInput(failedInputRef.current);
                  setTestError('已恢复输入。请先检查内容；若上一轮已有部分结果，可清空对话后重新试用。');
                }}
              />

              {/* Conversion Card when reaching 5-turn demo limit */}
              {isMaxTurnsReached && !isRunning && (
                <ConversionCard 
                  promptContent={prompt.content}
                  isAdmin={isAdmin}
                  isFavorite={isFavorite}
                  copiedPrompt={copiedPrompt}
                  onToggleFavorite={handleToggleFavorite}
                  onCopyPrompt={handleCopyPrompt}
                  onRestart={handleResetChat}
                  onGoSettings={() => navigate('/settings')}
                />
              )}

              {/* Bottom Continuous Floating Input Deck */}
              <ContinuousChatInput 
                testInput={testInput}
                setTestInput={setTestInput}
                isRunning={isRunning}
                isMaxTurnsReached={isMaxTurnsReached}
                turnCount={turnCount}
                maxTurns={hasAnyApiKey ? 0 : MAX_TURNS}
                onSend={() => handleSendMessage(testInput)}
                onRestart={handleResetChat}
              />

              <div ref={chatFeedEndRef} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ==========================================
// Sub-components
// ==========================================

function RunnerHeader({ 
  title, 
  usageCount, 
  lastUsedAt, 
  isFavorite,
  onToggleFavorite,
  onBack, 
  onEditPrompt,
  isAdmin
}: { 
  title: string; 
  usageCount?: number; 
  lastUsedAt?: number; 
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void; 
  onEditPrompt: () => void; 
  isAdmin: boolean;
}) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/[0.08]">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5">
          <button onClick={onBack} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
            <RiIcon icon="ri:arrow-left-s-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} /> Dashboard
          </button>
          <span>/</span>
          <span className="text-cyan-400">Interactive Sandbox</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {title}
        </h1>
        {usageCount !== undefined && (
          <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-2 font-normal">
            <span>Runs: <strong className="text-zinc-200">{usageCount}</strong></span>
            {lastUsedAt && (
              <>
                <span>•</span>
                <span>
                  Last active:{' '}
                  <time dateTime={new Date(lastUsedAt).toISOString()} className="text-zinc-300">
                    {new Date(lastUsedAt).toLocaleDateString()}
                  </time>
                </span>
              </>
            )}
          </p>
        )}
      </div>
      
      <nav className="flex items-center gap-2.5">
        {isAdmin && (
        <button
          onClick={onToggleFavorite}
          className={`btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 transition-all ${
            isFavorite 
              ? 'text-amber-400 border-amber-400/40 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.2)]' 
              : 'text-zinc-300 hover:text-white'
          }`}
          title={isFavorite ? '取消首页推荐' : '加星并加入首页推荐'}
        >
          <RiIcon 
            icon={isFavorite ? 'ri:star-fill' : 'ri:star-line'} 
            width={ICON_SIZE.sm} 
            height={ICON_SIZE.sm} 
          />
          <span>{isFavorite ? '已推荐' : '加星推荐'}</span>
        </button>
        )}

        {isAdmin && (
          <button
            className="btn-secondary py-1.5 px-3.5 text-xs text-zinc-300 hover:text-white"
            onClick={onEditPrompt}
          >
            Edit Template
          </button>
        )}
      </nav>
    </header>
  );
}

function PlaygroundStatusBar({
  turnCount,
  maxTurns,
  provider,
  model,
  hasAnyApiKey,
  isFocusMode,
  setIsFocusMode,
  showTemplate,
  setShowTemplate,
  onReset
}: {
  turnCount: number;
  maxTurns: number;
  provider: string;
  model: string;
  hasAnyApiKey: boolean;
  isFocusMode: boolean;
  setIsFocusMode: (f: boolean) => void;
  showTemplate: boolean;
  setShowTemplate: (s: boolean | ((prev: boolean) => boolean)) => void;
  onReset: () => void;
}) {
  return (
    <div className="playground-status-bar">
      <div className="playground-progress-wrap">
        {/* Progress Pill */}
        <div className="hud-progress-pill">
          <RiIcon icon="ri:gamepad-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
          <span>{maxTurns ? `试用：${turnCount}/${maxTurns} 轮` : `对话：${turnCount} 轮`}</span>
          
          {/* 5-Segment Visual Glowing Dots */}
          <div className="turn-dots ml-1" title={`${turnCount} of ${maxTurns} turns completed`}>
            {Array.from({ length: maxTurns }).map((_, idx) => {
              const isCompleted = idx < turnCount;
              const isActive = idx === turnCount && turnCount < maxTurns;
              return (
                <div 
                  key={idx} 
                  className={`turn-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`} 
                />
              );
            })}
          </div>
        </div>

        {/* Engine Capsule */}
        <div className="hud-engine-capsule">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-zinc-300">
            {hasAnyApiKey ? `${provider} (${model})` : '平台免费模型（完成后显示实际模型）'}
          </span>
        </div>
      </div>

      {/* Unified Glassmorphic Action Tools */}
      <div className="hud-actions-group">
        <button
          onClick={() => setShowTemplate(prev => !prev)}
          className={`hud-glass-btn ${showTemplate ? 'active' : ''}`}
          title="View Prompt Template"
        >
          <RiIcon icon="ri:file-text-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
          <span>{showTemplate ? 'Hide Template' : 'Template'}</span>
        </button>

        <button
          onClick={onReset}
          className="hud-glass-btn"
          title="Restart Sandbox"
        >
          <RiIcon icon="ri:refresh-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={() => setIsFocusMode(!isFocusMode)}
          className={`hud-glass-btn ${isFocusMode ? 'active' : ''}`}
          title={isFocusMode ? 'Exit Fullscreen Focus' : 'Fullscreen Focus Mode'}
        >
          <RiIcon icon={isFocusMode ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'} width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
        </button>
      </div>
    </div>
  );
}

function RunnerSetupPanel({
  promptContent,
  prompt,
  hasAnyApiKey,
  selectedProvider,
  setSelectedProvider,
  selectedModelId,
  setSelectedModelId,
  availableModels,
  testInput,
  setTestInput,
  isRunning,
  onRun
}: {
  promptContent: string;
  prompt: Prompt;
  hasAnyApiKey: boolean;
  selectedProvider: AIProvider;
  setSelectedProvider: (p: AIProvider) => void;
  selectedModelId: string;
  setSelectedModelId: (m: string) => void;
  availableModels: AIModelConfig[];
  testInput: string;
  setTestInput: (input: string) => void;
  isRunning: boolean;
  onRun: () => void;
}) {
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <div className="flex flex-col gap-6 w-full">
      <PromptUsageNotice prompt={prompt} />
      {prompt.sampleInput && <button type="button" className="btn-secondary self-start" onClick={() => setTestInput(prompt.sampleInput || "")} disabled={isRunning}>使用示例输入</button>}
      {/* 1. Prompt Preview Section */}
      <section className="sandbox-preview-section">
        <div className="sandbox-preview-header">
          <span className="sandbox-preview-title">Prompt Template</span>
          <button 
            type="button"
            className="btn-ghost preview-toggle-btn"
            onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
          >
            <span className="btn-label-desktop">
              {isTemplateCollapsed
                ? <><RiIcon icon="ri:arrow-down-s-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '3px' }} /> Show Template</>
                : <><RiIcon icon="ri:arrow-up-s-line"   width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '3px' }} /> Hide Template</>}
            </span>
            <span className="btn-label-mobile">
              {isTemplateCollapsed
                ? <><RiIcon icon="ri:arrow-down-s-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '3px' }} /> Show</>
                : <><RiIcon icon="ri:arrow-up-s-line"   width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: '3px' }} /> Hide</>}
            </span>
          </button>
        </div>
        {!isTemplateCollapsed && (
          <div className="sandbox-preview-box animate-in fade-in slide-in-from-top-1 duration-150">
            <pre className="mono-code">
              <code>{promptContent}</code>
            </pre>
          </div>
        )}
      </section>

      {/* 2. Interactive Test Sandbox Card */}
      <section className="test-sandbox-card">
        <div className="sandbox-card-header flex justify-between items-center">
          <h3 className="sandbox-card-title">轻量文本试用</h3>
          <span className="text-[11px] text-cyan-400 font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
            支持继续追问
          </span>
        </div>

        {/* Integrated shared keys warning Notice */}
        {!hasAnyApiKey && (
          <div className="sandbox-inline-notice">
            <span className="notice-icon">
              <RiIcon icon="ri:information-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
            </span>
            <span className="notice-text">
              平台免费模型：每次体验最多 5 轮。长内容请缩短为片段；个人 API Key 可在{' '}
              <a href="/settings" className="notice-link font-medium">Settings</a>中设置，仍遵守轻量试用的输入预算。
            </span>
          </div>
        )}

        {/* Engine Selector inside Sandbox Card */}
        {hasAnyApiKey && (
          <div className="sandbox-engine-row">
            <div className="engine-select-group">
              <label htmlFor="provider-select">AI Provider</label>
              <select
                id="provider-select"
                className="input-base"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="nvidia">NVIDIA NIM</option>
                <option value="groq">Groq</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>
            
            <div className="engine-select-group">
              <label htmlFor="model-select">AI Model</label>
              <select
                id="model-select"
                className="input-base"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        )}

        {/* Console-input wrapper */}
        <div className={`console-input-wrapper ${isInputFocused ? 'focused' : ''}`}>
          <textarea
            id="test-input"
            className="console-textarea"
            aria-label={prompt.inputHint || "试用输入"}
            placeholder={prompt.inputHint || "输入内容，或点击上方使用示例输入"}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onRun();
              }
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            disabled={isRunning}
          />
          
          <div className="console-action-bar">
            <span className="console-hint">
              {promptContent.includes('{{input}}')
                ? '{{input}} in prompt template will be replaced on initial turn.'
                : 'Enter 发送，Shift+Enter 换行。请先输入内容或使用示例。'}
            </span>
            <button
              className="btn-primary console-execute-btn"
              onClick={onRun}
              disabled={isRunning || !testInput.trim()}
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-950 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <RiIcon icon="ri:play-fill" width={ICON_SIZE.xs} height={ICON_SIZE.xs} style={{ marginRight: '6px' }} /> 
                  <span>开始试用</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InteractiveChatFeed({
  messages,
  isRunning,
  testError,
  onRetryLast
}: {
  messages: ChatMessage[];
  isRunning: boolean;
  testError: string;
  onRetryLast: () => void;
}) {
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="playground-feed">
      {messages.map((msg, index) => {
        if (msg.role === 'user') {
          // Calculate user turn index
          const userTurnIndex = messages.slice(0, index + 1).filter(m => m.role === 'user').length;
          
          return (
            <div key={msg.id || index} className="chat-row-user animate-in fade-in duration-150">
              <div className="chat-bubble-user">
                <div className="chat-user-header">
                  <div className="flex items-center gap-1.5">
                    <RiIcon icon="ri:user-3-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
                    <span>You</span>
                  </div>
                  <span className="text-[10px] text-cyan-300/80 font-mono">
                    第 {userTurnIndex} 轮
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id || index} className="chat-row-assistant animate-in fade-in duration-200">
            <article className="chat-bubble-assistant">
              {/* Modular Meta Header */}
              <header className="assistant-meta-header">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="model-chip">
                    <RiIcon icon="ri:cpu-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} className="text-cyan-400" />
                    <span className="model-chip-title">
                      {msg.modelUsed || 'AI Model'}
                    </span>
                  </div>

                  {msg.latencyMs !== undefined && msg.latencyMs > 0 && (
                    <span className="latency-micro-tag">
                      <RiIcon icon="ri:flashlight-fill" width={10} height={10} />
                      {(msg.latencyMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {msg.content && !msg.isStreaming && (
                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="btn-ghost py-1 px-2.5 text-[11px] gap-1 flex items-center text-zinc-400 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedMsgId === msg.id ? (
                        <><RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.xs} height={ICON_SIZE.xs} className="text-emerald-400" /> Copied</>
                      ) : (
                        <><RiIcon icon="ri:clipboard-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} /> Copy</>
                      )}
                    </button>
                  )}
                </div>
              </header>

              {/* Markdown Body Content with Enhanced Typography */}
              <div className="assistant-body-content">
                {msg.isStreaming && !msg.content ? (
                  <div className="flex flex-col gap-2.5 py-3 animate-pulse">
                    <div className="h-3.5 bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-white/5 rounded w-full"></div>
                    <div className="h-3 bg-white/5 rounded w-4/5"></div>
                    <div className="flex items-center gap-2 text-xs text-cyan-400 mt-2 font-mono">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      AI is generating response...
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none text-zinc-200">
                    <div className="space-y-4 text-[13.5px] leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({node: _, ...props}) => (
                            <h1 className="text-base font-bold text-white mt-5 mb-2.5 pb-1.5 border-b border-white/10 flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:bg-cyan-400 before:rounded-full" {...props} />
                          ),
                          h2: ({node: _, ...props}) => (
                            <h2 className="text-sm font-semibold text-cyan-200 mt-4 mb-2" {...props} />
                          ),
                          h3: ({node: _, ...props}) => (
                            <h3 className="text-xs font-semibold text-zinc-300 mt-3 mb-1.5 uppercase tracking-wider" {...props} />
                          ),
                          p: ({node: _, ...props}) => (
                            <p className="leading-relaxed mb-3.5 text-zinc-300" {...props} />
                          ),
                          strong: ({node: _, ...props}) => (
                            <strong className="font-semibold text-white" {...props} />
                          ),
                          ul: ({node: _, ...props}) => (
                            <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-zinc-300" {...props} />
                          ),
                          ol: ({node: _, ...props}) => (
                            <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-zinc-300" {...props} />
                          ),
                          li: ({node: _, ...props}) => (
                            <li className="text-zinc-300 leading-normal" {...props} />
                          ),
                          code: ({node: _, className, children, ...props}: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const content = String(children).replace(/\n$/, '');
                            const isInline = !match && !content.includes('\n');
                            
                            if (isInline) {
                              return (
                                <code className="bg-cyan-950/40 text-cyan-300 border border-cyan-500/25 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            return (
                              <div className="codeblock-container">
                                <div className="codeblock-header">
                                  <div className="macos-dots">
                                    <div className="macos-dot dot-red"></div>
                                    <div className="macos-dot dot-yellow"></div>
                                    <div className="macos-dot dot-green"></div>
                                  </div>
                                  <span className="uppercase text-[10px] tracking-wider text-zinc-500">
                                    {match ? match[1] : 'code'}
                                  </span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(content)}
                                    className="hover:text-white transition-colors"
                                    title="Copy Code"
                                  >
                                    <RiIcon icon="ri:clipboard-line" width={12} height={12} />
                                  </button>
                                </div>
                                <pre className="p-4 font-mono text-xs text-zinc-200 overflow-x-auto m-0 leading-relaxed">
                                  <code className={className} {...props}>{children}</code>
                                </pre>
                              </div>
                            );
                          },
                          blockquote: ({node: _, ...props}) => (
                            <blockquote className="border-l-2 border-cyan-400/70 bg-cyan-950/20 pl-4 py-2 my-3.5 rounded-r-lg text-zinc-300 italic text-sm" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {msg.isStreaming && (
                        <div className="flex items-center gap-2 text-xs text-cyan-400 mt-3 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                          Streaming response...
                        </div>
                      )}

                      {!msg.isStreaming && msg.finishReason === 'length' && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 mt-3 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-lg">
                          <RiIcon icon="ri:error-warning-line" width={ICON_SIZE.md} height={ICON_SIZE.md} className="shrink-0 text-amber-400" />
                          <span>Output was truncated due to model max token limit.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        );
      })}

      {/* Error Output Banner */}
      {testError && !isRunning && (
        <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-red-300 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-red-400">
              <RiIcon icon="ri:error-warning-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
              Execution Error
            </div>
            <button
              onClick={onRetryLast}
              className="btn-secondary py-1 px-3 text-xs gap-1 flex items-center border-red-500/30 hover:border-red-400 text-red-300"
            >
              <RiIcon icon="ri:refresh-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} /> 恢复输入
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed m-0 bg-black/40 p-3 rounded-lg border border-red-500/20 text-red-200">
            {testError}
          </pre>
        </div>
      )}
    </div>
  );
}

function ContinuousChatInput({
  testInput,
  setTestInput,
  isRunning,
  isMaxTurnsReached,
  turnCount,
  maxTurns,
  onSend,
  onRestart
}: {
  testInput: string;
  setTestInput: (s: string) => void;
  isRunning: boolean;
  isMaxTurnsReached: boolean;
  turnCount: number;
  maxTurns: number;
  onSend: () => void;
  onRestart: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  if (isMaxTurnsReached) {
    return (
      <div className="w-full bg-[#0d121d] border border-white/10 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-zinc-300 shadow-lg">
        <div className="flex items-center gap-2">
          <RiIcon icon="ri:lock-2-line" width={ICON_SIZE.md} height={ICON_SIZE.md} className="text-amber-400" />
          <span>Demo turn limit reached ({maxTurns}/{maxTurns}). See options below to continue or save.</span>
        </div>
        <button
          onClick={onRestart}
          className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 shrink-0 text-zinc-200 hover:text-white"
        >
          <RiIcon icon="ri:refresh-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div className={`floating-input-deck ${isFocused ? 'focused' : ''}`}>
      <textarea
        className="deck-textarea"
        placeholder={`第 ${turnCount + 1} 轮：输入追问或新的文本片段…`}
        value={testInput}
        onChange={(e) => setTestInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSend();
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={isRunning}
        rows={2}
      />

      <div className="deck-footer">
        <span className="text-[11px] text-zinc-400">
          第 <strong className="text-cyan-400">{turnCount + 1}</strong> 轮{maxTurns ? ` / ${maxTurns}` : ""} · Enter 发送，Shift+Enter 换行
        </span>

        <button
          className="deck-send-btn"
          onClick={onSend}
          disabled={isRunning || !testInput.trim()}
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-zinc-950 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <RiIcon icon="ri:send-plane-fill" width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
              <span>Send Reply</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ConversionCard({
  isAdmin,
  promptContent: _promptContent,
  isFavorite,
  copiedPrompt,
  onToggleFavorite,
  onCopyPrompt,
  onRestart,
  onGoSettings
}: {
  isAdmin: boolean;
  promptContent: string;
  isFavorite: boolean;
  copiedPrompt: boolean;
  onToggleFavorite: () => void;
  onCopyPrompt: () => void;
  onRestart: () => void;
  onGoSettings: () => void;
}) {
  return (
    <section className="conversion-card animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="conversion-header">
        <div className="conversion-title-row">
          <div className="conversion-icon-badge">
            <RiIcon icon="ri:sparkling-2-fill" width={ICON_SIZE.lg} height={ICON_SIZE.lg} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight m-0">
              🎉 5 轮互动试玩已完成！ / Demo Completed
            </h3>
            <p className="text-xs text-zinc-300 mt-1 m-0">
              你已直观体验该 Prompt 的完整多轮效果。选择以下操作进行深度使用或收藏管理：
            </p>
          </div>
        </div>
      </div>

      {/* 4-Card Action Grid */}
      <div className="conversion-grid">
        {/* 管理员推荐 */}
        {isAdmin && (
        <div 
          onClick={onToggleFavorite}
          className="conversion-action-item group"
          role="button"
          tabIndex={0}
        >
          <div className={`conversion-action-icon ${isFavorite ? 'text-amber-400 border-amber-400/40 bg-amber-400/10' : ''}`}>
            <RiIcon 
              icon={isFavorite ? 'ri:star-fill' : 'ri:star-line'} 
              width={ICON_SIZE.lg} 
              height={ICON_SIZE.lg} 
            />
          </div>
          <div className="conversion-action-content">
            <span className="conversion-action-title flex items-center gap-1.5">
              {isFavorite ? '已加入首页推荐' : '加星并加入首页推荐'}
              {isFavorite && <span className="text-[10px] text-amber-400 font-normal">(Saved)</span>}
            </span>
            <span className="conversion-action-desc">
              管理员加星的指令会进入首页精选。
            </span>
          </div>
        </div>

        )}

        {/* 2. 复制完整 Prompt */}
        <div 
          onClick={onCopyPrompt}
          className="conversion-action-item group"
          role="button"
          tabIndex={0}
        >
          <div className={`conversion-action-icon ${copiedPrompt ? 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' : ''}`}>
            <RiIcon 
              icon={copiedPrompt ? 'ri:checkbox-circle-fill' : 'ri:clipboard-line'} 
              width={ICON_SIZE.lg} 
              height={ICON_SIZE.lg} 
            />
          </div>
          <div className="conversion-action-content">
            <span className="conversion-action-title">
              {copiedPrompt ? '已复制到剪贴板！' : '复制完整 Prompt 模版'}
            </span>
            <span className="conversion-action-desc">
              一键带走完整设定，直接粘贴到 ChatGPT 或 Claude 使用。
            </span>
          </div>
        </div>

        {/* 3. 配置个人 API Key (BYOK) */}
        <div 
          onClick={onGoSettings}
          className="conversion-action-item group border-cyan-500/30 hover:border-cyan-400/60"
          role="button"
          tabIndex={0}
        >
          <div className="conversion-action-icon text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
            <RiIcon icon="ri:key-2-line" width={ICON_SIZE.lg} height={ICON_SIZE.lg} />
          </div>
          <div className="conversion-action-content">
            <span className="conversion-action-title text-cyan-400 flex items-center gap-1">
              配置个人 API Key (BYOK)
              <RiIcon icon="ri:arrow-right-line" width={ICON_SIZE.xs} height={ICON_SIZE.xs} />
            </span>
            <span className="conversion-action-desc">
              前往 Settings 连接私有 Key，解锁无轮次限制与自由模型切换。
            </span>
          </div>
        </div>

        {/* 4. 清空重玩 */}
        <div 
          onClick={onRestart}
          className="conversion-action-item group"
          role="button"
          tabIndex={0}
        >
          <div className="conversion-action-icon">
            <RiIcon icon="ri:refresh-line" width={ICON_SIZE.lg} height={ICON_SIZE.lg} />
          </div>
          <div className="conversion-action-content">
            <span className="conversion-action-title">
              清空并重新试玩
            </span>
            <span className="conversion-action-desc">
              重置对话历史，以新的输入变量开启新一轮沙盒体验。
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
