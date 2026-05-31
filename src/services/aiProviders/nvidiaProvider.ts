// NVIDIA API Provider Implementation
// Based on NVIDIA GenerativeAIExamples: https://github.com/NVIDIA/GenerativeAIExamples
// API Documentation: https://build.nvidia.com/explore/discover
// Get API Key: https://build.nvidia.com/api-keys

import type {
  IAIProvider,
  AIProviderResponse,
  AIProviderOptions,
} from './types';

export class NVIDIAProvider implements IAIProvider {
  private apiKey: string | null = null;
  private baseUrl = '/_nvidia/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  getName(): 'nvidia' {
    return 'nvidia';
  }

  getAvailableModels(): string[] {
    return [
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.3-70b-instruct',
      'mistralai/mistral-7b-instruct-v0.2',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'nvidia/llama-2-70b-chat',
      'nvidia/mistral-7b-instruct',
      'nvidia/mixtral-8x7b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
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
        error: 'NVIDIA API Key is not configured. Please set it in Settings.',
      };
    }

    const model = options?.model || this.getAvailableModels()[0];

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
          max_tokens: options?.maxTokens || 1024,
          top_p: options?.topP,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          `API request failed with status ${response.status}`;
        return {
          text: '',
          error: `NVIDIA API Error: ${errorMessage}`,
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
          error: 'Invalid response format from NVIDIA API',
        };
      }
    } catch (error: any) {
      console.error('NVIDIA API call failed:', error);
      return {
        text: '',
        error:
          error?.message ||
          'Failed to call NVIDIA API. Please check your network connection and API key.',
      };
    }
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
          model: this.getAvailableModels()[0],
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('NVIDIA API key test failed:', error);
      return false;
    }
  }
}
