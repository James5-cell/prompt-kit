// OpenAI AI Provider Implementation

import type {
  IAIProvider,
  AIProviderResponse,
  AIProviderOptions,
} from './types';

export class OpenAIProvider implements IAIProvider {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  getName(): 'openai' {
    return 'openai';
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async generateText(
    prompt: string,
    options?: AIProviderOptions
  ): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      return {
        text: '',
        error: 'OpenAI API Key is not configured. Please set it in Settings.',
      };
    }

    const model = options?.model || 'gpt-4o-mini';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          `API request failed with status ${response.status}`;
        return {
          text: '',
          error: `OpenAI API Error: ${errorMessage}`,
        };
      }

      const data = await response.json();

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const text = data.choices[0].message.content;
        const usage = data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined;

        return {
          text,
          model: data.model || model,
          usage,
        };
      } else {
        return {
          text: '',
          error: 'Invalid response format from OpenAI API',
        };
      }
    } catch (error: any) {
      console.error('OpenAI API call failed:', error);
      return {
        text: '',
        error:
          error?.message ||
          'Failed to call OpenAI API. Please check your network connection and API key.',
      };
    }
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
