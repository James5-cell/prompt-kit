import type { Prompt } from '../types';
import { getUsageMode } from './promptUsage';

export interface PromptUsagePlan {
  mode: NonNullable<Prompt['usageMode']>;
  hasVariables: boolean;
  variables: string[];
  needsText: boolean;
  needsExternalSetup: boolean;
  needsPreparation: boolean;
  title: string;
  summary: string;
}

export interface PromptVariable {
  token: string;
  name: string;
}

const PLACEHOLDER_PATTERN =
  /\{\{([^{}\n]+)\}\}|\{([^{}\n]+)\}|\[([^[\]\n]{2,80})\]|<([A-Za-z][\w -]{1,40})>/g;

const NOISE_LINE_PATTERN =
  /^(?:before you start|before starting|instructions?|how to use|usage|使用前|开始前|使用说明|准备|角色|role|objective|task|context)\b.*$/i;

/** Extract visible template variables without treating ordinary bracketed prose as a placeholder. */
export function extractPromptVariables(content: string): string[] {
  const variables = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER_PATTERN)) {
    const variable = (match[1] || match[2] || match[3] || match[4] || '').trim();
    if (!variable || variable.includes('平台轻量试用边界')) continue;
    variables.add(variable);
  }
  return Array.from(variables);
}

/** Preserve the exact token so filled values can replace the original template safely. */
export function extractPromptVariableTokens(content: string): PromptVariable[] {
  const variables = new Map<string, PromptVariable>();
  for (const match of content.matchAll(PLACEHOLDER_PATTERN)) {
    const token = match[0];
    const name = (match[1] || match[2] || match[3] || match[4] || '').trim();
    if (!name || name.includes('平台轻量试用边界') || variables.has(token)) continue;
    variables.set(token, { token, name });
  }
  return Array.from(variables.values());
}

export function fillPromptVariables(content: string, values: Record<string, string>): string {
  return extractPromptVariableTokens(content).reduce((filled, variable) => {
    const value = values[variable.token]?.trim();
    return value ? filled.split(variable.token).join(value) : filled;
  }, content);
}

export function getPromptUsagePlan(prompt: Prompt): PromptUsagePlan {
  const mode = getUsageMode(prompt);
  const variables = extractPromptVariables(prompt.content);
  const needsText = mode === 'text';
  const needsExternalSetup = mode === 'external';
  const hasVariables = variables.length > 0;
  const needsPreparation = needsText || hasVariables || needsExternalSetup;

  let title = '复制即可使用';
  let summary = '复制完整指令，粘贴到常用 AI 工具即可。';
  if (needsExternalSetup) {
    title = '复制后接入外部环境';
    summary = '复制完整指令，在支持所需资料或工具的 Agent 中粘贴使用。';
  } else if (hasVariables && needsText) {
    title = '替换变量并补充文本';
    summary = '复制完整指令后替换占位符，再补充要处理的文本。';
  } else if (hasVariables) {
    title = '替换变量后使用';
    summary = '复制完整指令后，先替换方括号或花括号中的占位内容。';
  } else if (needsText) {
    title = '补充文本后使用';
    summary = '复制完整指令后，补充需要处理的正文。';
  }

  return {
    mode,
    hasVariables,
    variables,
    needsText,
    needsExternalSetup,
    needsPreparation,
    title,
    summary,
  };
}

/** Clean and bound fallback summaries so raw template text never expands a card. */
export function getPromptSummary(prompt: Prompt, fallback = '打开详情查看这条指令的用途。'): string {
  const clean = (value: string) =>
    value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\{[^{}]*\}\}|\{[^{}\n]*\}|\[[^[\]\n]{2,80}\]/g, ' ')
      .replace(/^[\s#>*•-]+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

  const rawCandidates = [prompt.summary, prompt.outputHint]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap(value => value.split(/\n+/));
  const sourceCandidates = rawCandidates.filter(value => !NOISE_LINE_PATTERN.test(value.trim()));
  const candidates = (sourceCandidates.length > 0 ? sourceCandidates : rawCandidates)
    .map(clean)
    .filter(value => value.length > 0 && !NOISE_LINE_PATTERN.test(value));

  const source = candidates[0] || clean(
    prompt.content
      .split('\n')
      .find(line => clean(line).length > 0 && !NOISE_LINE_PATTERN.test(clean(line))) || ''
  );
  if (!source) return fallback;
  return source.length > 180 ? `${source.slice(0, 177).trimEnd()}...` : source;
}
