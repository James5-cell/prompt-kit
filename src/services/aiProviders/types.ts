// Unified AI Provider Types

export type AIProvider = 'gemini' | 'openai' | 'nvidia' | 'anthropic' | 'groq' | 'deepseek';

export interface AIProviderResponse {
  text: string;
  error?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProviderOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  [key: string]: any;
}

export interface IAIProvider {
  /**
   * Generate text from a prompt
   */
  generateText(
    prompt: string,
    options?: AIProviderOptions
  ): Promise<AIProviderResponse>;

  /**
   * Test if the API key is valid
   */
  testApiKey(apiKey: string): Promise<boolean>;

  /**
   * Get the provider name
   */
  getName(): AIProvider;

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[];
}
