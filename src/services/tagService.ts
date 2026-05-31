// Tag 服务层
// Provides business logic for tag management on top of FirebaseService.

import { type Tag } from '../types';
import { firebaseService, isCurrentUserAdmin } from '../storage/firebase';
import { generateId } from '../utils/id';

/**
 * Generate a URL-safe slug from a tag name.
 * e.g. "Prompt Engineering" → "prompt-engineering"
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-') // keep CJK chars, replace others with dash
    .replace(/^-+|-+$/g, '');
}

export class TagService {
  private async requireAdmin(): Promise<void> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      throw new Error('Permission denied: admin login required');
    }
  }

  /**
   * Create a new tag
   */
  async createTag(data: Partial<Tag>): Promise<Tag> {
    await this.requireAdmin();
    const now = Date.now();
    const name = (data.name || '').trim();
    if (!name) throw new Error('Tag name is required');

    const tag: Tag = {
      id: data.id || generateId(),
      slug: data.slug || slugify(name),
      name,
      description: data.description,
      color: data.color,
      aliases: data.aliases ?? [],
      parentId: data.parentId,
      path: data.path,
      promptCount: data.promptCount ?? 0,
      usageCount: data.usageCount ?? 0,
      isActive: data.isActive ?? true,
      isSystem: data.isSystem ?? false,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };

    await firebaseService.saveTag(tag);
    return tag;
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    await this.requireAdmin();
    const existing = await firebaseService.getTag(id);
    if (!existing) {
      throw new Error(`Tag ${id} not found`);
    }

    const updated: Tag = {
      ...existing,
      ...updates,
      id, // preserve original ID
      updatedAt: Date.now(),
    };
    // Re-slug if name changed and no explicit slug provided
    if (updates.name && !updates.slug) {
      updated.slug = slugify(updates.name);
    }

    await firebaseService.saveTag(updated);
    return updated;
  }

  /**
   * Delete a tag. Also removes the tag from all prompts that use it.
   */
  async deleteTag(id: string): Promise<void> {
    await this.requireAdmin();
    // Remove tag references from prompts
    const allPrompts = await firebaseService.getAllPrompts();
    for (const prompt of allPrompts) {
      if (prompt.tagIds?.includes(id)) {
        const updatedTagIds = prompt.tagIds.filter((tid) => tid !== id);
        const updatedTagNames = (prompt.tagNames ?? []).filter((_name, idx) => {
          // tagNames and tagIds are parallel arrays
          return prompt.tagIds![idx] !== id;
        });
        await firebaseService.savePrompt({
          ...prompt,
          tagIds: updatedTagIds,
          tagNames: updatedTagNames,
          updatedAt: Date.now(),
        });
      }
    }
    await firebaseService.deleteTag(id);
  }

  /**
   * Get a single tag
   */
  async getTag(id: string): Promise<Tag | null> {
    return firebaseService.getTag(id);
  }

  /**
   * Get all active tags
   */
  async getAllTags(): Promise<Tag[]> {
    return firebaseService.getAllTags();
  }

  /**
   * Subscribe to real-time tag updates
   */
  subscribeToTags(callback: (tags: Tag[]) => void): (() => void) | null {
    return firebaseService.subscribeToTags(callback);
  }

  /**
   * Increment the promptCount for given tag IDs.
   * Call this when a prompt is saved with tags.
   */
  async incrementPromptCount(tagIds: string[], delta: number): Promise<void> {
    for (const tagId of tagIds) {
      const tag = await firebaseService.getTag(tagId);
      if (tag) {
        await firebaseService.saveTag({
          ...tag,
          promptCount: Math.max(0, (tag.promptCount ?? 0) + delta),
          updatedAt: Date.now(),
        });
      }
    }
  }
}

export const tagService = new TagService();
