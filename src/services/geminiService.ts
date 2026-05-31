// Gemini API 服务

import { db } from '../storage/db';

export interface GeminiResponse {
  text: string;
  error?: string;
}

export class GeminiService {
  private async getApiKey(): Promise<string | null> {
    try {
      return await db.getSetting('geminiApiKey');
    } catch (error) {
      console.error('获取 API Key 失败:', error);
      return null;
    }
  }

  /**
   * 调用 Gemini API 生成文本
   */
  async generateText(prompt: string): Promise<GeminiResponse> {
    const apiKey = await this.getApiKey();
    
    if (!apiKey) {
      return {
        text: '',
        error: '请先在设置中配置 Gemini API Key',
      };
    }

    try {
      // 使用 Gemini API v1
      const response = await fetch(
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
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `API 请求失败: ${response.status}`
        );
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        return { text };
      } else {
        throw new Error('API 响应格式错误');
      }
    } catch (error: any) {
      console.error('Gemini API 调用失败:', error);
      return {
        text: '',
        error: error?.message || 'API 调用失败，请检查网络连接和 API Key',
      };
    }
  }

  /**
   * 测试 API Key 是否有效
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
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
                    text: 'test',
                  },
                ],
              },
            ],
          }),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const geminiService = new GeminiService();



