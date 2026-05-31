import type { AIProvider, AIProviderResponse, IAIProvider, AIProviderOptions } from './types';

export class AnthropicProvider implements IAIProvider {
  constructor(_apiKey: string = '') {
    // API key is passed during testApiKey
  }

  getName(): AIProvider {
    return 'anthropic';
  }

  getAvailableModels(): string[] {
    return [];
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Anthropic API key test failed:', error);
      return false;
    }
  }

  async generateText(
    _prompt: string,
    _options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    return { text: '', error: 'Local generateText not supported for Anthropic. Use backend.' };
  }
}
