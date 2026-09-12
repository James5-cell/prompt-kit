// Unified AI Service - Manages multiple AI providers

import { db } from '../storage/db';
import type {
  AIProvider,
  AIProviderResponse,
  AIProviderOptions,
} from './aiProviders/types';
import { GeminiProvider } from './aiProviders/geminiProvider';
import { OpenAIProvider } from './aiProviders/openaiProvider';
import { NVIDIAProvider } from './aiProviders/nvidiaProvider';
import { AnthropicProvider } from './aiProviders/anthropicProvider';
import { GenericOpenAIProvider } from './aiProviders/genericOpenAIProvider';
import type { IAIProvider } from './aiProviders/types';

const SUPPORTED_PROVIDERS: AIProvider[] = ['gemini', 'openai', 'nvidia', 'anthropic', 'groq', 'deepseek'];

function createProviderInstance(provider: AIProvider, apiKey?: string): IAIProvider | null {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'nvidia':
      return new NVIDIAProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'groq':
      return new GenericOpenAIProvider('groq', 'https://api.groq.com/openai/v1', 'llama3-8b-8192', apiKey);
    case 'deepseek':
      return new GenericOpenAIProvider('deepseek', 'https://api.deepseek.com/v1', 'deepseek-chat', apiKey);
    default:
      return null;
  }
}

export class AIService {
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private defaultProvider: AIProvider = 'gemini';

  /**
   * Initialize providers with API keys from storage
   */
  async initialize(): Promise<void> {
    for (const provider of SUPPORTED_PROVIDERS) {
      const key = await db.getSetting(`${provider}ApiKey`);
      if (key) {
        const instance = createProviderInstance(provider, key);
        if (instance) {
          this.providers.set(provider, instance);
        }
      }
    }

    // Set default provider from settings or use first available
    const savedDefault = await db.getSetting('defaultAIProvider');
    if (savedDefault && this.providers.has(savedDefault as AIProvider)) {
      this.defaultProvider = savedDefault as AIProvider;
    } else if (this.providers.size > 0) {
      this.defaultProvider = Array.from(this.providers.keys())[0];
    }
  }

  /**
   * Update API key for a provider
   */
  async setProviderApiKey(
    provider: AIProvider,
    apiKey: string
  ): Promise<void> {
    await db.saveSetting(`${provider}ApiKey`, apiKey);

    // Update or create provider instance
    const providerInstance = createProviderInstance(provider, apiKey);
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    this.providers.set(provider, providerInstance);

    // If this is the first provider, set it as default
    if (this.providers.size === 1) {
      this.defaultProvider = provider;
      await db.saveSetting('defaultAIProvider', provider);
    }
  }

  /**
   * Delete API key for a provider (privacy protection)
   */
  async deleteProviderApiKey(provider: AIProvider): Promise<void> {
    // Remove from storage
    await db.deleteSetting(`${provider}ApiKey`);
    
    // Remove from providers map
    this.providers.delete(provider);
    
    // If this was the default provider, update default to another available provider
    if (this.defaultProvider === provider) {
      if (this.providers.size > 0) {
        this.defaultProvider = Array.from(this.providers.keys())[0];
        await db.saveSetting('defaultAIProvider', this.defaultProvider);
      } else {
        // No providers left, reset to 'gemini' as default
        this.defaultProvider = 'gemini';
        await db.deleteSetting('defaultAIProvider');
      }
    }
  }

  /**
   * Set default provider
   */
  async setDefaultProvider(provider: AIProvider): Promise<void> {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    this.defaultProvider = provider;
    await db.saveSetting('defaultAIProvider', provider);
  }

  /**
   * Get default provider
   */
  getDefaultProvider(): AIProvider {
    return this.defaultProvider;
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get available providers (those with API keys configured)
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Generate text using specified provider or default
   */
  async generateText(
    prompt: string,
    provider?: AIProvider,
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    const targetProvider = provider || this.defaultProvider;
    const providerInstance = this.providers.get(targetProvider);

    if (!providerInstance) {
      return {
        text: '',
        error: `Provider ${targetProvider} is not configured. Please set API key in Settings.`,
      };
    }

    return providerInstance.generateText(prompt, options);
  }

  /**
   * Get provider instance
   */
  getProvider(provider: AIProvider): IAIProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Test API key for a provider
   */
  async testApiKey(
    provider: AIProvider,
    apiKey: string
  ): Promise<boolean> {
    const providerInstance = createProviderInstance(provider);
    if (!providerInstance) {
      return false;
    }

    return providerInstance.testApiKey(apiKey);
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider: AIProvider): string[] {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return [];
    }
    return providerInstance.getAvailableModels();
  }
}

// Export singleton instance
export const aiService = new AIService();
