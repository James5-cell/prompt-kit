import { firebaseService } from '../storage/firebase';

export type AIModelConfig = {
  id: string;
  name: string;
};

export type AIProviderConfig = {
  id: string;
  name: string;
  models: AIModelConfig[];
};

export const DEFAULT_AI_CONFIG: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    models: [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      { id: 'gemini-pro-latest', name: 'Gemini Pro Latest' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
      { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro Latest' },
      { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest' },
      { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002' },
      { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro (Legacy)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA Build',
    models: [
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
      { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
      { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B Instruct' },
      { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2 Instruct' },
      { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron-4 340B Instruct' },
      { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B IT' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
    ],
  },
];

class AIConfigService {
  private config: AIProviderConfig[] = DEFAULT_AI_CONFIG;
  private isLoaded = false;

  async loadConfig(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      const cloudConfig = await firebaseService.getAiModelsConfig();
      if (cloudConfig && Array.isArray(cloudConfig) && cloudConfig.length > 0) {
        this.config = cloudConfig;
        console.log('Loaded AI Config from Firestore');
      } else {
        console.log('Using default local AI Config');
      }
    } catch (error) {
      console.error('Failed to load AI config from Firebase, using default:', error);
    } finally {
      this.isLoaded = true;
    }
  }

  getAllProviders(): AIProviderConfig[] {
    return this.config;
  }

  getProviderConfig(providerId: string): AIProviderConfig | undefined {
    return this.config.find(p => p.id === providerId);
  }

  getProviderName(providerId: string): string {
    const provider = this.getProviderConfig(providerId);
    if (provider) return provider.name;
    // Fallback strings just in case
    if (providerId === 'gemini') return 'Gemini (Google)';
    if (providerId === 'openai') return 'OpenAI (GPT)';
    if (providerId === 'nvidia') return 'NVIDIA Build';
    if (providerId === 'anthropic') return 'Anthropic (Claude)';
    if (providerId === 'groq') return 'Groq';
    if (providerId === 'deepseek') return 'DeepSeek';
    return providerId;
  }

  getModelsForProvider(providerId: string): AIModelConfig[] {
    return this.getProviderConfig(providerId)?.models || [];
  }
}

export const aiConfigService = new AIConfigService();
