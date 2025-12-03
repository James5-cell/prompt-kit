// Prompt 服务层

import { type Prompt, type SearchFilters } from '../types';
import { db } from '../storage/db';
import { firebaseService } from '../storage/firebase';
import { generateId } from '../utils/id';

export class PromptService {
  /**
   * 创建新 Prompt
   */
  async createPrompt(data: Partial<Prompt>): Promise<Prompt> {
    const now = Date.now();
    const prompt: Prompt = {
      id: generateId(),
      title: data.title || '未命名 Prompt',
      content: data.content || '',
      createdAt: now,
      updatedAt: now,
    };

    // 使用 Firebase 服务（会自动同步到 IndexedDB）
    await firebaseService.savePrompt(prompt);
    return prompt;
  }

  /**
   * 更新 Prompt
   */
  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    const existing = await firebaseService.getPrompt(id);
    if (!existing) {
      throw new Error(`Prompt ${id} not found`);
    }

    const updated: Prompt = {
      ...existing,
      ...updates,
      id, // 确保 ID 不变
      updatedAt: Date.now(),
    };

    // 使用 Firebase 服务（会自动同步到 IndexedDB）
    await firebaseService.savePrompt(updated);
    return updated;
  }

  /**
   * 删除 Prompt
   */
  async deletePrompt(id: string): Promise<void> {
    await firebaseService.deletePrompt(id);
  }

  /**
   * 获取 Prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    return firebaseService.getPrompt(id);
  }

  /**
   * 获取所有 Prompt
   */
  async getAllPrompts(): Promise<Prompt[]> {
    return firebaseService.getAllPrompts();
  }

  /**
   * 搜索 Prompt
   */
  async searchPrompts(query: string): Promise<Prompt[]> {
    return firebaseService.searchPrompts(query);
  }

  /**
   * 订阅实时更新
   */
  subscribeToPrompts(callback: (prompts: Prompt[]) => void): (() => void) | null {
    return firebaseService.subscribeToPrompts(callback);
  }

  /**
   * 高级搜索
   */
  async advancedSearch(filters: SearchFilters): Promise<Prompt[]> {
    const allPrompts = await db.getAllPrompts();

    return allPrompts.filter((prompt) => {
      // 标题过滤
      if (filters.title) {
        const titleLower = prompt.title.toLowerCase();
        if (!titleLower.includes(filters.title.toLowerCase())) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const createdAt = prompt.createdAt;
        if (
          createdAt < filters.dateRange.start ||
          createdAt > filters.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }
}

export const promptService = new PromptService();

