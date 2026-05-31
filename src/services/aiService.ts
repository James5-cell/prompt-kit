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

export class AIService {
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private defaultProvider: AIProvider = 'gemini';

  /**
   * Initialize providers with API keys from storage
   */
  async initialize(): Promise<void> {
    // Load API keys from storage
    const geminiKey = await db.getSetting('geminiApiKey');
    const openaiKey = await db.getSetting('openaiApiKey');
    const nvidiaKey = await db.getSetting('nvidiaApiKey');
    const anthropicKey = await db.getSetting('anthropicApiKey');
    const groqKey = await db.getSetting('groqApiKey');
    const deepseekKey = await db.getSetting('deepseekApiKey');

    // Initialize providers
    if (geminiKey) {
      const provider = new GeminiProvider(geminiKey);
      this.providers.set('gemini', provider);
    }

    if (openaiKey) {
      const provider = new OpenAIProvider(openaiKey);
      this.providers.set('openai', provider);
    }

    if (nvidiaKey) {
      const provider = new NVIDIAProvider(nvidiaKey);
      this.providers.set('nvidia', provider);
    }

    if (anthropicKey) {
      const provider = new AnthropicProvider(anthropicKey);
      this.providers.set('anthropic', provider);
    }

    if (groqKey) {
      const provider = new GenericOpenAIProvider('groq', 'https://api.groq.com/openai/v1', 'llama3-8b-8192', groqKey);
      this.providers.set('groq', provider);
    }

    if (deepseekKey) {
      const provider = new GenericOpenAIProvider('deepseek', 'https://api.deepseek.com/v1', 'deepseek-chat', deepseekKey);
      this.providers.set('deepseek', provider);
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
    let providerInstance: IAIProvider;
    switch (provider) {
      case 'gemini':
        providerInstance = new GeminiProvider(apiKey);
        break;
      case 'openai':
        providerInstance = new OpenAIProvider(apiKey);
        break;
      case 'nvidia':
        providerInstance = new NVIDIAProvider(apiKey);
        break;
      case 'anthropic':
        providerInstance = new AnthropicProvider(apiKey);
        break;
      case 'groq':
        providerInstance = new GenericOpenAIProvider('groq', 'https://api.groq.com/openai/v1', 'llama3-8b-8192', apiKey);
        break;
      case 'deepseek':
        providerInstance = new GenericOpenAIProvider('deepseek', 'https://api.deepseek.com/v1', 'deepseek-chat', apiKey);
        break;
      default:
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
      throw new Error(
        `Provider ${provider} is not configured. Please set API key first.`
      );
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
   * Get available providers (those with API keys configured)
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
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
    let providerInstance: IAIProvider;
    switch (provider) {
      case 'gemini':
        providerInstance = new GeminiProvider();
        break;
      case 'openai':
        providerInstance = new OpenAIProvider();
        break;
      case 'nvidia':
        providerInstance = new NVIDIAProvider();
        break;
      case 'anthropic':
        providerInstance = new AnthropicProvider();
        break;
      case 'groq':
        providerInstance = new GenericOpenAIProvider('groq', 'https://api.groq.com/openai/v1', 'llama3-8b-8192');
        break;
      case 'deepseek':
        providerInstance = new GenericOpenAIProvider('deepseek', 'https://api.deepseek.com/v1', 'deepseek-chat');
        break;
      default:
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
