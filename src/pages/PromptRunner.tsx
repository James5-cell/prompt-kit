import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Edit2, 
  Play, 
  Copy, 
  Maximize2, 
  Minimize2, 
  Check, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { type Prompt, type Run } from '../types';
import { promptService } from '../services/promptService';
import { aiConfigService } from '../services/aiConfigService';
import { aiModelRegistry } from '../services/aiModelRegistry';
import type { AIModelConfig } from '../config/aiModels';
import { db } from '../storage/db';
import { generateId } from '../utils/id';
import type { AIProvider } from '../services/aiProviders/types';
import { executePrompt, type PromptRunResult } from '../services/aiTestClient';
import { useNoIndex } from '../hooks/useNoIndex';
import { useAuth } from '../auth/AuthContext';
import './PromptRunner.css';

export default function PromptRunner() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [testInput, setTestInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>('');
  
  const [runResult, setRunResult] = useState<PromptRunResult | null>(null);
  
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<AIModelConfig[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [hasAnyApiKey, setHasAnyApiKey] = useState<boolean>(false);
  
  const [showConfig, setShowConfig] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadPrompt(id);
    }
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

    aiModelRegistry.getModelsForProvider(selectedProvider).then(models => {
      setAvailableModels(models);
      if (models.length > 0) {
        // Only reset selection if the current model is not valid for this provider
        if (!models.some(m => m.id === selectedModelId)) {
          setSelectedModelId(models[0].id);
        }
      } else {
        setSelectedModelId('');
      }
    });
  }, [selectedProvider, isInitializing, selectedModelId]);

  // Smooth scroll to results when result starts running or is generated
  useEffect(() => {
    if (!showConfig && (isRunning || runResult || testError)) {
      const timer = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showConfig, isRunning, !!runResult, !!testError]);

  const loadPrompt = async (promptId: string) => {
    try {
      const loadedPrompt = await promptService.getPrompt(promptId);
      if (loadedPrompt) {
        setPrompt(loadedPrompt);
      } else {
        navigate('/prompts');
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
    }
  };

  const handleRun = async () => {
    if (!prompt) return;
    
    setIsRunning(true);
    setTestError('');
    setRunResult(null);
    setShowConfig(false);
    
    try {
      await aiConfigService.loadConfig();
      // Retrieve the API key for the selected provider directly from IndexedDB settings (optional BYOK)
      const apiKey = (await db.getSetting(`${selectedProvider}ApiKey`)) || '';

      if (hasAnyApiKey && !selectedModelId) {
        throw new Error('Please select an AI model first.');
      }

      let finalContent = prompt.content;
      if (testInput.trim()) {
        if (prompt.content.includes('{{input}}')) {
          finalContent = prompt.content.replace(/\{\{input\}\}/g, testInput);
        } else {
          finalContent = `${prompt.content}\n\nContext/Input:\n${testInput}`;
        }
      }

      const result = await executePrompt(
        {
          prompt: finalContent,
          provider: hasAnyApiKey ? selectedProvider : '',
          model: hasAnyApiKey ? selectedModelId : '',
          apiKey: apiKey,
        },
        (chunkText) => {
          setRunResult({
            text: chunkText,
            latencyMs: 0,
            providerUsed: hasAnyApiKey ? selectedProvider : 'fallback',
            modelUsed: hasAnyApiKey ? selectedModelId : 'fallback',
          });
        }
      );
      
      setRunResult(result);

      const run: Run = {
        id: generateId(),
        promptId: prompt.id,
        input: testInput ? { value: testInput } : {},
        output: result.text,
        model: result.modelUsed || selectedModelId || 'default',
        parameters: {},
        latency: result.latencyMs ?? 0,
        createdAt: Date.now(),
      };

      await db.saveRun(run);
      await promptService.incrementUsageCount(prompt.id);
      
      const updatedPrompt = await promptService.getPrompt(prompt.id);
      if (updatedPrompt) {
        setPrompt(updatedPrompt);
      }

    } catch (error: any) {
      console.error('Execution failed:', error);
      setTestError(error.message || 'An error occurred during prompt execution');
    } finally {
      setIsRunning(false);
    }
  };

  const clearResult = () => {
    setRunResult(null);
    setTestError('');
    setShowConfig(true);
    setIsFocusMode(false);
  };

  const handleEditAndReRun = () => {
    setRunResult(null);
    setTestError('');
    setShowConfig(true);
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (!prompt) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] text-[var(--text-faint)] font-mono" role="status" aria-busy="true">
        Initializing workbench...
      </div>
    );
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
      <title>{prompt.title} | Prompt Runner</title>
      <meta name="description" content={`Evaluate and run the AI prompt: ${prompt.title}. Preview: ${prompt.content.substring(0, 100)}...`} />
      <link rel="canonical" href={`https://yourdomain.com/prompts/${id}`} />
      <meta property="og:title" content={`${prompt.title} - AI Prompt Runner`} />
      <meta property="og:description" content="AI Prompt Evaluation and Execution Environment" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className={`max-w-4xl mx-auto p-4 pb-16 md:p-10 flex flex-col gap-6 text-[var(--text-muted)] relative z-10 ${isFocusMode ? 'focus-mode-active' : ''}`}>
        {!isFocusMode && (
          <RunnerHeader 
            title={prompt.title}
            usageCount={prompt.usageCount}
            lastUsedAt={prompt.lastUsedAt}
            onBack={() => navigate('/dashboard')}
            onEditPrompt={() => navigate(`/prompts/${prompt.id}`)}
            isAdmin={isAdmin}
          />
        )}

        <div className="flex flex-col gap-6" ref={topRef}>
          {/* Collapsed Summary Bar */}
          {!isFocusMode && (
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${!showConfig ? 'max-h-[500px] opacity-100 mb-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              {!showConfig && (
                <RunnerSummaryBar 
                  provider={selectedProvider}
                  model={selectedModelId}
                  hasAnyApiKey={hasAnyApiKey}
                  testInput={testInput}
                  isRunning={isRunning}
                  onExpand={() => setShowConfig(true)}
                />
              )}
            </div>
          )}

          {/* Configuration Workspace (Setup Panel) */}
          {!isFocusMode && (
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showConfig ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <RunnerSetupPanel 
                promptContent={prompt.content}
                hasAnyApiKey={hasAnyApiKey}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                availableModels={availableModels}
                testInput={testInput}
                setTestInput={setTestInput}
                isRunning={isRunning}
                onRun={handleRun}
              />
            </div>
          )}

          {/* Model Output Panel */}
          <div ref={resultRef} className="w-full">
            <RunnerOutputPanel 
              isRunning={isRunning}
              runResult={runResult}
              testError={testError}
              isFocusMode={isFocusMode}
              setIsFocusMode={setIsFocusMode}
              onClear={clearResult}
              onEditConfig={handleEditAndReRun}
            />
          </div>
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
  onBack, 
  onEditPrompt,
  isAdmin
}: { 
  title: string; 
  usageCount?: number; 
  lastUsedAt?: number; 
  onBack: () => void; 
  onEditPrompt: () => void; 
  isAdmin: boolean;
}) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[var(--border)]">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-[var(--text-faint)] mb-1">
          <button onClick={onBack} className="hover:text-[var(--text-muted)] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </button>
          <span>/</span>
          <span className="text-[var(--text-muted)]">Runner</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">
          {title}
        </h1>
        {usageCount !== undefined && (
          <p className="text-xs text-[var(--text-faint)] mt-1 flex items-center gap-2 font-normal">
            <span>Usage: <strong className="text-[var(--text-muted)]">{usageCount}</strong> times</span>
            {lastUsedAt && (
              <>
                <span>•</span>
                <span>
                  Last active:{' '}
                  <time dateTime={new Date(lastUsedAt).toISOString()} className="text-[var(--text-muted)]">
                    {new Date(lastUsedAt).toLocaleDateString()}
                  </time>
                </span>
              </>
            )}
          </p>
        )}
      </div>
      
      {isAdmin && (
        <nav className="flex gap-2">
          <button
            className="btn-secondary py-1.5 px-3 text-xs"
            onClick={onEditPrompt}
          >
            Edit Template
          </button>
        </nav>
      )}
    </header>
  );
}

function RunnerSummaryBar({ 
  provider, 
  model, 
  hasAnyApiKey,
  testInput, 
  isRunning,
  onExpand 
}: { 
  provider: string; 
  model: string; 
  hasAnyApiKey: boolean;
  testInput: string; 
  isRunning: boolean;
  onExpand: () => void; 
}) {
  return (
    <div 
      onClick={onExpand}
      className="w-full bg-[var(--surface)] border border-[var(--border)] p-4 rounded-[var(--radius-md)] hover:border-[var(--border-strong)] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text)]">Configuration Locked</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold border border-[var(--border)]">
              {isRunning ? 'Running...' : 'Output Ready'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-[var(--text-faint)]">
            <div>
              Engine: <strong className="text-[var(--text-muted)] font-medium">{hasAnyApiKey ? `${provider} (${model})` : 'Fallback Engine'}</strong>
            </div>
            {testInput && (
              <div className="flex items-center gap-1 min-w-0">
                <span className="hidden sm:inline text-[var(--border)]">|</span>
                <span className="shrink-0">Input:</span>
                <span className="text-[var(--text-muted)] font-medium italic truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[400px]">"{testInput}"</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="btn-secondary py-1.5 px-3 text-xs gap-1.5 flex items-center justify-center w-full sm:w-auto mt-2 sm:mt-0"
      >
        <Edit2 className="w-3 h-3" /> Adjust Config
      </button>
    </div>
  );
}

function RunnerSetupPanel({
  promptContent,
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
      {/* 1. Prompt Preview Section (Quiet, Compact, Vertical Accordion) */}
      <section className="sandbox-preview-section">
        <div className="sandbox-preview-header">
          <span className="sandbox-preview-title">Prompt Template</span>
          <button 
            type="button"
            className="btn-ghost preview-toggle-btn"
            onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
          >
            <span className="btn-label-desktop">{isTemplateCollapsed ? 'Show Template ↴' : 'Hide Template ⬏'}</span>
            <span className="btn-label-mobile">{isTemplateCollapsed ? 'Show ↴' : 'Hide ⬏'}</span>
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
        {/* Title / Label */}
        <div className="sandbox-card-header">
          <h3 className="sandbox-card-title">Interactive Sandbox</h3>
        </div>

        {/* Integrated shared keys warning Notice */}
        {!hasAnyApiKey && (
          <div className="sandbox-inline-notice">
            <span className="notice-icon">ℹ️</span>
            <span className="notice-text">
              Using shared platform keys. You can connect your personal keys in{' '}
              <a href="/settings" className="notice-link">Settings</a> to unlock custom model options.
            </span>
          </div>
        )}

        {/* Compact Engine Selector inside Sandbox Card (rendered only if they have personal keys) */}
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

        {/* Dynamic focus console-input wrapper */}
        <div className={`console-input-wrapper ${isInputFocused ? 'focused' : ''}`}>
          <textarea
            id="test-input"
            className="console-textarea"
            placeholder="Provide context or variables to test the prompt template..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            disabled={isRunning}
          />
          
          <div className="console-action-bar">
            <span className="console-hint">
              {promptContent.includes('{{input}}')
                ? '{{input}} variables will be replaced in prompt.'
                : 'Input will append at the end of the prompt.'}
            </span>
            <button
              className="btn-primary console-execute-btn"
              onClick={onRun}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-950 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current mr-1.5" /> <span>Test Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function RunnerOutputPanel({
  isRunning,
  runResult,
  testError,
  isFocusMode,
  setIsFocusMode,
  onClear,
  onEditConfig
}: {
  isRunning: boolean;
  runResult: PromptRunResult | null;
  testError: string;
  isFocusMode: boolean;
  setIsFocusMode: (f: boolean) => void;
  onClear: () => void;
  onEditConfig: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (runResult) {
      navigator.clipboard.writeText(runResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isRunning && !runResult && !testError) return null;

  return (
    <article className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-sm flex flex-col animate-in fade-in duration-200">
      {/* Panel Header */}
      <header className="flex justify-between items-center bg-[var(--surface)] p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse"></div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">Model Output</h3>
            {runResult && (
              <p className="text-[10px] text-[var(--text-faint)] m-0 mt-0.5">
                {runResult.providerUsed} ({runResult.modelUsed}){runResult.latencyMs > 0 ? ` • ${runResult.latencyMs}ms` : ''}
              </p>
            )}
          </div>
        </div>
        
        {runResult && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isRunning}
              className="btn-secondary py-1.5 px-3 text-xs gap-1.5 flex items-center disabled:opacity-50"
            >
              {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="btn-secondary py-1.5 px-3 text-xs gap-1.5 flex items-center"
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Focus</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Focus Mode</span>
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Panel Body */}
      <div className="p-6 md:p-8 bg-[var(--surface)] flex-1 min-h-[220px]">
        {/* Loading State Skeleton */}
        {isRunning && !runResult && (
          <div className="flex flex-col gap-4 animate-pulse w-full">
            <div className="h-4 bg-[var(--surface-2)] rounded w-1/3"></div>
            <div className="h-3 bg-[var(--surface-2)] rounded w-full"></div>
            <div className="h-3 bg-[var(--surface-2)] rounded w-5/6"></div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-faint)] mt-4 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
              Generating response...
            </div>
          </div>
        )}

        {/* Error Output */}
        {testError && !isRunning && (
          <div className="bg-red-950/10 border border-[var(--danger)]/20 p-4 rounded-[var(--radius-sm)] text-[var(--danger)] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[var(--danger)] font-semibold text-xs">
              <AlertCircle className="w-4 h-4" />
              Execution Error
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed m-0 bg-black/10 p-3 rounded-[var(--radius-sm)] border border-[var(--danger)]/10">
              {testError}
            </pre>
          </div>
        )}

        {/* Markdown Output */}
        {runResult && (
          <div className="prose prose-sm prose-invert max-w-none text-[var(--text)]">
            <div className="space-y-4 text-sm leading-relaxed animate-in fade-in duration-200">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-base font-bold text-[var(--text)] mt-6 mb-2 border-b border-[var(--border)] pb-1" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-sm font-semibold text-[var(--text)] mt-5 mb-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-[var(--text)] mt-4 mb-2" {...props} />,
                  p: ({node, ...props}) => <p className="leading-relaxed mb-4 text-[var(--text-muted)]" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-[var(--text-muted)]" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-[var(--text-muted)]" {...props} />,
                  li: ({node, ...props}) => <li className="text-[var(--text-muted)]" {...props} />,
                  code: ({node, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const content = String(children).replace(/\n$/, '');
                    const isInline = !match && !content.includes('\n');
                    return isInline ? (
                      <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--text)] border border-[var(--border)]" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-[var(--surface-2)] p-4 rounded-[var(--radius-sm)] border border-[var(--border)] overflow-x-auto my-3 font-mono text-xs text-[var(--text-muted)] leading-normal">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    );
                  },
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-[var(--text-faint)] pl-4 italic my-4 text-[var(--text-muted)] bg-[var(--surface-2)]/30 py-1 pr-2 rounded" {...props} />
                  ),
                }}
              >
                {runResult.text}
              </ReactMarkdown>
              {!isRunning && runResult.finishReason === 'length' && (
                <div className="flex items-center gap-2 text-xs text-amber-500 mt-4 bg-amber-500/5 border border-amber-500/20 p-3 rounded font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    提示：模型输出已被截断，因为达到了该模型本身的单次最大 Token 限制（{runResult.modelUsed} 强制了输出字数上限）。建议在“系统后台设置”中切换为支持更大输出的引擎（如 Google Gemini）。
                  </span>
                </div>
              )}
              {isRunning && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-faint)] mt-4 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"></span>
                  Generating response...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Reset / Re-run Footer */}
      {(runResult || testError) && !isRunning && (
        <footer className="bg-[var(--surface)] p-4 border-t border-[var(--border)] flex justify-between items-center gap-3">
          <button
            onClick={onClear}
            className="btn-ghost py-1.5 px-3 text-xs gap-1.5 text-[var(--text-faint)] hover:text-[var(--text-muted)]"
          >
            <span>Reset Workbench</span>
          </button>
          <button
            onClick={onEditConfig}
            className="btn-primary py-2 px-4 gap-1.5 flex items-center shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Modify & Re-run</span>
          </button>
        </footer>
      )}
    </article>
  );
}
