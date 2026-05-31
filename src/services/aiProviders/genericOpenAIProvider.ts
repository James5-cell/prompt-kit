import type { AIProvider, AIProviderResponse, IAIProvider, AIProviderOptions } from './types';

export class GenericOpenAIProvider implements IAIProvider {
  private providerId: AIProvider;
  private baseUrl: string;
  private testModel: string;

  constructor(providerId: AIProvider, baseUrl: string, testModel: string, _apiKey: string = '') {
    this.providerId = providerId;
    this.baseUrl = baseUrl;
    this.testModel = testModel;
  }

  getName(): AIProvider {
    return this.providerId;
  }

  getAvailableModels(): string[] {
    return [];
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.testModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
      });

      return response.ok;
    } catch (error) {
      console.error(`${this.providerId} API key test failed:`, error);
      return false;
    }
  }

  async generateText(
    _prompt: string,
    _options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    return { text: '', error: `Local generateText not supported for ${this.providerId}. Use backend.` };
  }
}
