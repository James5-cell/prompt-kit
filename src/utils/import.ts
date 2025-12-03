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
      isFavorite: false,
      template: {},
      runConfig: { targetModels: [] },
      organization: { tags: [], priority: 0, scenario: [] },
      quality: { usageCount: 0, reviewRecords: [], iterationLog: [] },
      version: { versionNumber: '1.0.0', visibility: 'private' },
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
        case '描述':
          prompt.description = value;
          break;
        case '语言':
          prompt.language = value || 'zh-CN';
          break;
        case '角色':
          prompt.template.role = value;
          break;
        case '目标':
          prompt.template.goal = value;
          break;
        case '标签':
          prompt.organization.tags = value ? value.split(';').filter((t) => t) : [];
          break;
        case '分类':
          prompt.organization.category = value;
          break;
        case '评分':
          prompt.quality.rating = value ? parseFloat(value) : undefined;
          break;
        case '使用次数':
          prompt.quality.usageCount = value ? parseInt(value, 10) : 0;
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
    description: data.description,
    language: data.language || 'zh-CN',
    source: data.source,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    isFavorite: data.isFavorite || false,
    template: {
      role: data.template?.role,
      goal: data.template?.goal,
      inputSlots: data.template?.inputSlots || [],
      outputFormat: data.template?.outputFormat,
      style: data.template?.style,
      constraints: data.template?.constraints || [],
      examples: data.template?.examples || [],
    },
    runConfig: {
      targetModels: data.runConfig?.targetModels || [],
      systemPrompt: data.runConfig?.systemPrompt,
      userPrompt: data.runConfig?.userPrompt,
      toolCalls: data.runConfig?.toolCalls,
      parameters: data.runConfig?.parameters || {},
      contextStrategy: data.runConfig?.contextStrategy,
    },
    organization: {
      tags: data.organization?.tags || [],
      category: data.organization?.category,
      projectId: data.organization?.projectId,
      priority: data.organization?.priority || 0,
      scenario: data.organization?.scenario || [],
    },
    quality: {
      rating: data.quality?.rating,
      usageCount: data.quality?.usageCount || 0,
      successRate: data.quality?.successRate,
      abTestGroup: data.quality?.abTestGroup,
      reviewRecords: data.quality?.reviewRecords || [],
      notes: data.quality?.notes,
      iterationLog: data.quality?.iterationLog || [],
    },
    version: {
      versionNumber: data.version?.versionNumber || '1.0.0',
      changeLog: data.version?.changeLog,
      approvalStatus: data.version?.approvalStatus,
      visibility: data.version?.visibility || 'private',
    },
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

