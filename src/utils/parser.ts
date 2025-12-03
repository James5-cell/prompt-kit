// Prompt 解析工具：从剪贴板文本自动解析结构化字段

import { type InputSlot } from '../types';
import { generateId } from './id';

export interface ParsedPrompt {
  title: string;
  description?: string;
  role?: string;
  goal?: string;
  inputSlots?: InputSlot[];
  outputFormat?: string;
  style?: string;
  constraints?: string[];
  examples?: string[];
  content: string; // 原始内容
}

/**
 * 从剪贴板文本解析 Prompt
 */
export function parsePromptFromText(text: string): ParsedPrompt {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
  
  const result: ParsedPrompt = {
    title: '',
    content: text,
  };

  let currentSection = '';
  const sections: Record<string, string[]> = {};

  for (const line of lines) {
    // 检测章节标题
    if (line.match(/^(角色|Role|角色：|Role:)/i)) {
      currentSection = 'role';
      sections.role = [];
    } else if (line.match(/^(目标|Goal|目标：|Goal:)/i)) {
      currentSection = 'goal';
      sections.goal = [];
    } else if (line.match(/^(输入|Input|输入：|Input:)/i)) {
      currentSection = 'input';
      sections.input = [];
    } else if (line.match(/^(输出|Output|输出格式|输出：|Output:)/i)) {
      currentSection = 'output';
      sections.output = [];
    } else if (line.match(/^(风格|Style|风格：|Style:)/i)) {
      currentSection = 'style';
      sections.style = [];
    } else if (line.match(/^(约束|Constraints|约束：|Constraints:)/i)) {
      currentSection = 'constraints';
      sections.constraints = [];
    } else if (line.match(/^(示例|Examples|示例：|Examples:)/i)) {
      currentSection = 'examples';
      sections.examples = [];
    } else if (line.match(/^(描述|Description|描述：|Description:)/i)) {
      currentSection = 'description';
      sections.description = [];
    } else if (currentSection && sections[currentSection]) {
      sections[currentSection].push(line);
    } else if (!result.title && line.length > 0) {
      // 第一行作为标题
      result.title = line;
    }
  }

  // 提取角色
  if (sections.role && sections.role.length > 0) {
    result.role = sections.role.join(' ');
  }

  // 提取目标
  if (sections.goal && sections.goal.length > 0) {
    result.goal = sections.goal.join(' ');
  }

  // 提取描述
  if (sections.description && sections.description.length > 0) {
    result.description = sections.description.join(' ');
  }

  // 提取输入槽位（查找占位符）
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    placeholders.add(match[1]);
  }

  if (placeholders.size > 0) {
    result.inputSlots = Array.from(placeholders).map((name) => ({
      id: generateId(),
      name,
      type: 'text' as const,
      required: false,
    }));
  } else if (sections.input && sections.input.length > 0) {
    // 如果没有占位符，尝试从输入章节解析
    result.inputSlots = sections.input.map((line, index) => ({
      id: generateId(),
      name: `input_${index + 1}`,
      type: 'text' as const,
      hint: line,
      required: false,
    }));
  }

  // 提取输出格式
  if (sections.output && sections.output.length > 0) {
    result.outputFormat = sections.output.join('\n');
  }

  // 提取风格
  if (sections.style && sections.style.length > 0) {
    result.style = sections.style.join(' ');
  }

  // 提取约束
  if (sections.constraints && sections.constraints.length > 0) {
    result.constraints = sections.constraints;
  }

  // 提取示例
  if (sections.examples && sections.examples.length > 0) {
    result.examples = sections.examples;
  }

  // 如果没有标题，使用前50个字符
  if (!result.title) {
    result.title = text.substring(0, 50).replace(/\n/g, ' ').trim() || '未命名 Prompt';
  }

  return result;
}

/**
 * 从网页内容提取 Prompt 信息
 */
export function extractPromptFromWebpage(
  title: string,
  selectedText?: string,
  _url?: string
): ParsedPrompt {
  const content = selectedText || title;
  const parsed = parsePromptFromText(content);

  return {
    ...parsed,
    title: parsed.title || title,
  };
}

