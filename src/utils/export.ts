// 导出工具

import { type Prompt, type ExportFormat } from '../types';

/**
 * 导出为 JSON
 */
export function exportToJSON(prompts: Prompt[]): string {
  return JSON.stringify(prompts, null, 2);
}

/**
 * 导出为 CSV
 */
export function exportToCSV(prompts: Prompt[]): string {
  const headers = [
    'ID',
    '标题',
    '描述',
    '语言',
    '角色',
    '目标',
    '标签',
    '分类',
    '评分',
    '使用次数',
    '创建时间',
    '更新时间',
  ];

  const rows = prompts.map((p) => [
    p.id,
    p.title,
    p.description || '',
    p.language,
    p.template.role || '',
    p.template.goal || '',
    p.organization.tags.join(';'),
    p.organization.category || '',
    p.quality.rating?.toString() || '',
    p.quality.usageCount.toString(),
    new Date(p.createdAt).toLocaleString(),
    new Date(p.updatedAt).toLocaleString(),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * 导出为 Markdown
 */
export function exportToMarkdown(prompts: Prompt[]): string {
  let markdown = '# Prompt 知识库导出\n\n';
  markdown += `导出时间: ${new Date().toLocaleString()}\n`;
  markdown += `总计: ${prompts.length} 个 Prompt\n\n`;
  markdown += '---\n\n';

  prompts.forEach((prompt, index) => {
    markdown += `## ${index + 1}. ${prompt.title}\n\n`;

    if (prompt.description) {
      markdown += `**描述**: ${prompt.description}\n\n`;
    }

    if (prompt.template.role) {
      markdown += `**角色**: ${prompt.template.role}\n\n`;
    }

    if (prompt.template.goal) {
      markdown += `**目标**: ${prompt.template.goal}\n\n`;
    }

    if (prompt.template.inputSlots && prompt.template.inputSlots.length > 0) {
      markdown += `**输入槽位**:\n`;
      prompt.template.inputSlots.forEach((slot) => {
        markdown += `- ${slot.name}${slot.required ? ' (必填)' : ''}: ${slot.hint || ''}\n`;
      });
      markdown += '\n';
    }

    if (prompt.template.outputFormat) {
      markdown += `**输出格式**:\n\`\`\`\n${prompt.template.outputFormat}\n\`\`\`\n\n`;
    }

    if (prompt.template.constraints && prompt.template.constraints.length > 0) {
      markdown += `**约束**:\n`;
      prompt.template.constraints.forEach((constraint) => {
        markdown += `- ${constraint}\n`;
      });
      markdown += '\n';
    }

    if (prompt.template.examples && prompt.template.examples.length > 0) {
      markdown += `**示例**:\n`;
      prompt.template.examples.forEach((example, i) => {
        markdown += `${i + 1}. ${example}\n`;
      });
      markdown += '\n';
    }

    if (prompt.organization.tags.length > 0) {
      markdown += `**标签**: ${prompt.organization.tags.join(', ')}\n\n`;
    }

    if (prompt.source) {
      markdown += `**来源**: `;
      if (prompt.source.url) {
        markdown += `[${prompt.source.url}](${prompt.source.url})`;
      }
      if (prompt.source.author) {
        markdown += ` | 作者: ${prompt.source.author}`;
      }
      if (prompt.source.license) {
        markdown += ` | 许可: ${prompt.source.license}`;
      }
      markdown += '\n\n';
    }

    markdown += `**元数据**:\n`;
    markdown += `- ID: ${prompt.id}\n`;
    markdown += `- 语言: ${prompt.language}\n`;
    markdown += `- 评分: ${prompt.quality.rating || '未评分'}\n`;
    markdown += `- 使用次数: ${prompt.quality.usageCount}\n`;
    markdown += `- 版本: ${prompt.version.versionNumber}\n`;
    markdown += `- 可见性: ${prompt.version.visibility}\n`;
    markdown += `- 创建时间: ${new Date(prompt.createdAt).toLocaleString()}\n`;
    markdown += `- 更新时间: ${new Date(prompt.updatedAt).toLocaleString()}\n\n`;

    markdown += '---\n\n';
  });

  return markdown;
}

/**
 * 导出 Prompt
 */
export function exportPrompts(prompts: Prompt[], format: ExportFormat): string {
  switch (format) {
    case 'json':
      return exportToJSON(prompts);
    case 'csv':
      return exportToCSV(prompts);
    case 'markdown':
      return exportToMarkdown(prompts);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出并下载
 */
export function exportAndDownload(prompts: Prompt[], format: ExportFormat): void {
  const content = exportPrompts(prompts, format);
  const extensions = {
    json: '.json',
    csv: '.csv',
    markdown: '.md',
  };
  const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    markdown: 'text/markdown',
  };
  const filename = `prompt-kit-export-${Date.now()}${extensions[format]}`;
  downloadFile(content, filename, mimeTypes[format]);
}

