// Prompt 服务层

import { type Prompt, type PromptStatus, type SearchFilters } from '../types';
import { firebaseService, isCurrentUserAdmin, getFirebaseUser } from '../storage/firebase';
import { generateId } from '../utils/id';

/**
 * Generate lowercase search tokens from prompt fields.
 * Used for Firestore `array-contains` queries.
 */
function buildSearchTokens(prompt: Partial<Prompt>): string[] {
  const tokens = new Set<string>();
  const addTokens = (text: string | undefined) => {
    if (!text) return;
    // Split on common delimiters and add individual words
    text.toLowerCase().split(/[\s,;.:!?|/\\]+/).forEach((word) => {
      const trimmed = word.trim();
      if (trimmed.length > 1) tokens.add(trimmed);
    });
  };

  addTokens(prompt.title);
  addTokens(prompt.category);
  prompt.tagNames?.forEach((name) => addTokens(name));

  return Array.from(tokens);
}

/**
 * Generate a URL-safe slug from a title.
 * Only generated once on create — slug is immutable after that.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-') // keep CJK chars, replace rest with hyphens
    .replace(/^-+|-+$/g, '')                   // trim leading/trailing hyphens
    .slice(0, 80)                               // cap length
    || 'untitled';
}

/**
 * Check if a prompt's status counts as "published" for public visibility.
 * Treats legacy 'active' and missing status as published.
 * Shared between PromptList filtering and getPublishedPrompt().
 */
export function isPublishedStatus(status: PromptStatus | undefined): boolean {
  const effective = status ?? 'active'; // legacy docs without status are treated as active/published
  return effective === 'published' || effective === 'active';
}

export class PromptService {
  private async requireAdmin(): Promise<void> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error('Permission denied: admin login required');
    }
  }

  /**
   * 创建新 Prompt
   */
  async createPrompt(data: Partial<Prompt>): Promise<Prompt> {
    await this.requireAdmin();
    const now = Date.now();
    const user = getFirebaseUser();
    const prompt: Prompt = {
      id: generateId(),
      title: data.title || '未命名 Prompt',
      content: data.content || '',
      createdAt: now,
      updatedAt: now,
      favorite: data.favorite ?? false,
      usageCount: data.usageCount ?? 0,
      // New fields
      slug: data.slug || generateSlug(data.title || ''),
      summary: data.summary,
      category: data.category,
      language: data.language,
      status: data.status ?? 'draft',
      visibility: data.visibility ?? 'public',
      tagIds: data.tagIds ?? [],
      tagNames: data.tagNames ?? [],
      runCount: data.runCount ?? 0,
      createdBy: user?.uid,
      updatedBy: user?.uid,
      isDeleted: false,
      sampleOutput: data.sampleOutput,
      sampleInput: data.sampleInput,
    };
    // Auto-generate search tokens
    prompt.searchTokens = buildSearchTokens(prompt);

    // 使用 Firebase 服务（会自动同步到 IndexedDB）
    await firebaseService.savePrompt(prompt);
    return prompt;
  }

  /**
   * 更新 Prompt
   */
  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    await this.requireAdmin();
    const existing = await firebaseService.getPrompt(id);
    if (!existing) {
      throw new Error(`Prompt ${id} not found`);
    }

    const user = getFirebaseUser();
    
    // Explicitly prepare the exact partial updates to send
    const exactUpdates = {
      ...updates,
      updatedBy: user?.uid ?? existing.updatedBy,
    };
    
    // Calculate new search tokens if any field changes
    const updated: Prompt = {
      ...existing,
      ...exactUpdates,
      id,
      updatedAt: Date.now(),
    };
    exactUpdates.searchTokens = buildSearchTokens(updated);
    updated.searchTokens = exactUpdates.searchTokens;

    // Use updatePromptDoc which uses genuine updateDoc API
    await firebaseService.updatePromptDoc(id, exactUpdates);
    
    return updated;
  }

  /**
   * 删除 Prompt
   */
  async deletePrompt(id: string): Promise<void> {
    await this.requireAdmin();
    await firebaseService.deletePrompt(id);
  }

  /**
   * 获取 Prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    return firebaseService.getPrompt(id);
  }

  /**
   * Get a prompt only if it is published (or legacy 'active') and not deleted.
   * Used by the public /p/:id detail page.
   */
  async getPublishedPrompt(id: string): Promise<Prompt | null> {
    const prompt = await firebaseService.getPrompt(id);
    if (!prompt) return null;
    if (prompt.isDeleted) return null;
    if (!isPublishedStatus(prompt.status)) return null;
    return prompt;
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
   * 高级搜索 — now supports tag filtering
   */
  async advancedSearch(filters: SearchFilters): Promise<Prompt[]> {
    const allPrompts = await firebaseService.getAllPrompts();

    return allPrompts.filter((prompt) => {
      // 标题过滤
      if (filters.title) {
        const titleLower = prompt.title.toLowerCase();
        if (!titleLower.includes(filters.title.toLowerCase())) {
          return false;
        }
      }

      // Tag 过滤
      if (filters.tags && filters.tags.length > 0) {
        const promptTagNames = (prompt.tagNames ?? []).map((t) => t.toLowerCase());
        const promptTagIds = prompt.tagIds ?? [];
        const hasMatchingTag = filters.tags.some(
          (filterTag: string) =>
            promptTagIds.includes(filterTag) ||
            promptTagNames.includes(filterTag.toLowerCase())
        );
        if (!hasMatchingTag) return false;
      }

      // Category 过滤
      if (filters.category) {
        if (prompt.category?.toLowerCase() !== filters.category.toLowerCase()) {
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

  /**
   * 切换收藏状态
   */
  async toggleFavorite(id: string): Promise<Prompt> {
    const prompt = await this.getPrompt(id);
    if (!prompt) {
      throw new Error(`Prompt ${id} not found`);
    }

    return this.updatePrompt(id, {
      favorite: !(prompt.favorite || false),
    });
  }

  /**
   * 增加使用次数
   */
  async incrementUsageCount(id: string): Promise<Prompt> {
    const prompt = await this.getPrompt(id);
    if (!prompt) {
      throw new Error(`Prompt ${id} not found`);
    }

    const updates = {
      usageCount: (prompt.usageCount || 0) + 1,
      lastUsedAt: Date.now(),
    };

    await firebaseService.updatePromptDoc(id, updates);

    return {
      ...prompt,
      ...updates,
    };
  }

  /**
   * 获取收藏的 Prompts
   */
  async getFavoritePrompts(): Promise<Prompt[]> {
    const allPrompts = await this.getAllPrompts();
    return allPrompts.filter((p) => p.favorite === true);
  }

  /**
   * Get prompts filtered by tag ID
   */
  async getPromptsByTag(tagId: string): Promise<Prompt[]> {
    const allPrompts = await this.getAllPrompts();
    return allPrompts.filter((p) => p.tagIds?.includes(tagId));
  }
}

export const promptService = new PromptService();
