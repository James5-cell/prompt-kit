import { type Prompt } from '../types';

export interface TagOption {
  id: string; // normalized lowercased name
  name: string; // display name (original casing)
  promptCount: number;
}

/**
 * Normalizes a tag string by trimming and lowercasing.
 */
export function normalizeTag(tag: string): string {
  return (tag || '').trim().toLowerCase();
}

/**
 * Aggregates and normalizes tag options directly from the list of prompts.
 */
export function aggregateTags(prompts: Prompt[]): TagOption[] {
  const tagMap = new Map<string, { name: string; count: number }>();

  prompts.forEach((p) => {
    if (p.tagNames && p.tagNames.length > 0) {
      p.tagNames.forEach((name) => {
        const clean = (name || '').trim();
        if (!clean) return;
        const normalized = normalizeTag(clean);
        const existing = tagMap.get(normalized);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(normalized, { name: clean, count: 1 });
        }
      });
    }
  });

  return Array.from(tagMap.entries())
    .map(([id, val]) => ({
      id,
      name: val.name,
      promptCount: val.count,
    }))
    .sort((a, b) => b.promptCount - a.promptCount || a.name.localeCompare(b.name));
}

/**
 * Filters a list of prompts based on selected tags using OR logic.
 * A prompt matches if it contains any of the selected tags (case-insensitive).
 */
export function filterPromptsByTags(prompts: Prompt[], activeTagIds: string[]): Prompt[] {
  if (!activeTagIds || activeTagIds.length === 0) {
    return prompts;
  }

  const normalizedActiveTags = activeTagIds.map(normalizeTag);

  return prompts.filter((p) => {
    const promptTags = (p.tagNames ?? []).map(normalizeTag);
    return normalizedActiveTags.some((activeTag) => promptTags.includes(activeTag));
  });
}
