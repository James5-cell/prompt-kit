// Gemini AI Provider Implementation

import type {
  IAIProvider,
  AIProviderResponse,
  AIProviderOptions,
} from './types';

export class GeminiProvider implements IAIProvider {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  getName(): 'gemini' {
    return 'gemini';
  }

  getAvailableModels(): string[] {
    return [
      // Latest Gemini 3 models (as of Jan 2026)
      'gemini-3-pro-preview',
      'gemini-3-flash-preview',
      // Latest aliases (point to Gemini 3 as of Jan 21, 2026)
      'gemini-pro-latest',
      'gemini-flash-latest',
      // Stable Gemini 1.5 models
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      // Legacy models
      'gemini-pro',
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
        error: 'Gemini API Key is not configured. Please set it in Settings.',
      };
    }

    const model = options?.model || 'gemini-3-flash-preview';

    try {
      // Use v1beta for generateContent endpoint (more stable)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens,
              topP: options?.topP,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          `API request failed with status ${response.status}`;
        return {
          text: '',
          error: `Gemini API Error: ${errorMessage}`,
        };
      }

      const data = await response.json();

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
      ) {
        const text = data.candidates[0].content.parts[0].text;
        const usage = data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined;

        return {
          text,
          model,
          usage,
        };
      } else {
        return {
          text: '',
          error: 'Invalid response format from Gemini API',
        };
      }
    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      return {
        text: '',
        error:
          error?.message ||
          'Failed to call Gemini API. Please check your network connection and API key.',
      };
    }
  }

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      // Use a simpler test - just check if we can access the models endpoint
      // This is faster and more reliable than generating text
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If models endpoint fails, try a minimal generateContent call
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: 'Hi',
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 5,
              },
            }),
          }
        );
        return testResponse.ok;
      }

      return true;
    } catch (error) {
      console.error('Gemini API Key test failed:', error);
      return false;
    }
  }
}
