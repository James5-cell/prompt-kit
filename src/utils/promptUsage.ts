import type { Prompt } from '../types';

export const USAGE_LABELS = {
  direct: '直接试用',
  text: '需要文本',
  external: '需要外部环境',
} as const;

export function getUsageMode(prompt: Prompt): NonNullable<Prompt['usageMode']> {
  // Newly imported/unreviewed prompts must be classified before online use.
  return prompt.usageMode ?? 'external';
}

export function canTryPrompt(prompt: Prompt): boolean {
  return getUsageMode(prompt) !== 'external';
}

export function getUsageNotes(prompt: Prompt): string {
  return prompt.usageNotes || (canTryPrompt(prompt)
    ? '轻量试用仅处理输入的文本，不读取网址、附件或外部数据库。'
    : '请复制指令到支持所需文件、知识库或工具的 Agent 中使用。此指令暂不提供在线试用。');
}

export function selectFeatured(prompts: Prompt[], limit = 3): Prompt[] {
  return prompts.filter(p => p.favorite && !p.isDeleted)
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function validateTrialInput(prompt: Prompt, input: string): string | null {
  if (!canTryPrompt(prompt)) return getUsageNotes(prompt);
  if (!input.trim()) return prompt.inputHint || '请先输入内容，或使用示例。';
  if (getUsageMode(prompt) === 'text' && /^https?:\/\/\S+$/i.test(input.trim())) {
    return '请粘贴正文。在线试用不能读取网址内容。';
  }
  return null;
}
