export interface AIModelConfig {
  id: string;        // 真实模型 id
  name: string;      // UI 展示名称
  provider: string;  // provider id
}

export const SUPPORTED_MODELS: AIModelConfig[] = [
  // Gemini Models
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'gemini' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', provider: 'gemini' },
  { id: 'gemini-pro-latest', name: 'Gemini Pro Latest', provider: 'gemini' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', provider: 'gemini' },
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro Latest', provider: 'gemini' },
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest', provider: 'gemini' },
  { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002', provider: 'gemini' },
  { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002', provider: 'gemini' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
  { id: 'gemini-pro', name: 'Gemini Pro (Legacy)', provider: 'gemini' },
  
  // OpenAI Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  
  // NVIDIA Models
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'nvidia' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', provider: 'nvidia' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'nvidia' },
  { id: 'mistralai/mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct v0.2', provider: 'nvidia' },
  { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B Instruct v0.1', provider: 'nvidia' },
  { id: 'nvidia/llama-2-70b-chat', name: 'Llama 2 70B Chat', provider: 'nvidia' },
  { id: 'nvidia/mistral-7b-instruct', name: 'Mistral 7B Instruct', provider: 'nvidia' },
  { id: 'nvidia/mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct', provider: 'nvidia' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron 70B Instruct', provider: 'nvidia' },
  
  // Anthropic Models
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', provider: 'anthropic' },
  
  // Groq Models
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' },
  
  // DeepSeek Models
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek' },
];

export const FALLBACK_CONFIG = {
  defaultProvider: 'gemini',
  defaultModel: 'gemini-1.5-flash',
};
