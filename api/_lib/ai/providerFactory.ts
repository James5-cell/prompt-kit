import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import { FALLBACK_CONFIG } from '../../../src/config/aiModels.js';

export function resolveAIModel({
  provider = FALLBACK_CONFIG.defaultProvider,
  model = FALLBACK_CONFIG.defaultModel,
  apiKey,
}: {
  provider?: string;
  model?: string;
  apiKey?: string;
}): LanguageModel {
  if (!provider) {
    throw new Error('Unsupported AI provider: provider is missing');
  }

  const isSupportedProvider = ['gemini', 'openai', 'nvidia', 'anthropic', 'groq', 'deepseek'].includes(provider);
  if (!isSupportedProvider) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  if (!model) {
    throw new Error(`Missing model for provider: ${provider}`);
  }

  switch (provider) {
    case 'gemini': {
      const finalApiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for Gemini');
      }
      const google = createGoogleGenerativeAI({ apiKey: finalApiKey });
      return google(model);
    }
    case 'openai': {
      const finalApiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for OpenAI');
      }
      const openai = createOpenAI({ apiKey: finalApiKey });
      return openai(model);
    }
    case 'nvidia': {
      const finalApiKey = apiKey || process.env.NVIDIA_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for NVIDIA');
      }
      const nvidiaOpenAI = createOpenAI({
        baseURL: 'https://integrate.api.nvidia.com/v1',
        apiKey: finalApiKey,
      });
      return nvidiaOpenAI.chat(model);
    }
    case 'anthropic': {
      const finalApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for Anthropic');
      }
      const anthropic = createAnthropic({ apiKey: finalApiKey });
      return anthropic(model);
    }
    case 'groq': {
      const finalApiKey = apiKey || process.env.GROQ_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for Groq');
      }
      const groqOpenAI = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: finalApiKey,
      });
      return groqOpenAI.chat(model);
    }
    case 'deepseek': {
      const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
      if (!finalApiKey) {
        throw new Error('Missing env key: API key is required for DeepSeek');
      }
      const deepseekOpenAI = createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: finalApiKey,
      });
      return deepseekOpenAI.chat(model);
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
