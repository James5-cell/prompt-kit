// 导入工具

import { type Prompt } from '../types';
import { generateId } from './id';

/**
 * 从 JSON 导入
 */
export function importFromJSON(json: string): Prompt[] {
  try {
    const data = JSON.parse(json);
    const prompts = Array.isArray(data) ? data : [data];
    return prompts.map((p) => normalizePrompt(p));
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error}`);
  }
}

/**
 * 从 CSV 导入（简化版）
 */
export function importFromCSV(csv: string): Prompt[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0]
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim());
  const prompts: Prompt[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(',')
      .map((v) => v.replace(/^"|"$/g, '').trim());
    const prompt: any = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    headers.forEach((header, index) => {
      const value = values[index] || '';
      switch (header) {
        case 'ID':
          prompt.id = value || generateId();
          break;
        case '标题':
          prompt.title = value;
          break;
        case '内容':
          prompt.content = value;
          break;
      }
    });

    prompts.push(normalizePrompt(prompt));
  }

  return prompts;
}

/**
 * 规范化 Prompt 数据
 */
function normalizePrompt(data: any): Prompt {
  const now = Date.now();
  return {
    id: data.id || generateId(),
    title: data.title || '未命名 Prompt',
    content: data.content || data.template?.goal || data.template?.content || '',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    // Carry forward optional fields if present in imported data
    favorite: data.favorite,
    usageCount: data.usageCount,
    lastUsedAt: data.lastUsedAt,
    tagIds: data.tagIds,
    tagNames: data.tagNames,
    category: data.category,
    language: data.language,
    status: data.status,
    visibility: data.visibility,
    summary: data.summary,
    slug: data.slug,
  };
}

/**
 * 读取文件内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

