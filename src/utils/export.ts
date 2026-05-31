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
    '内容',
    'Tags',
    'Category',
    '创建时间',
    '更新时间',
  ];

  const rows = prompts.map((p) => [
    p.id,
    p.title,
    p.content,
    (p.tagNames ?? []).join('; '),
    p.category ?? '',
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

    markdown += `**内容**:\n\`\`\`\n${prompt.content}\n\`\`\`\n\n`;

    markdown += `**元数据**:\n`;
    markdown += `- ID: ${prompt.id}\n`;
    if (prompt.category) markdown += `- Category: ${prompt.category}\n`;
    if (prompt.tagNames && prompt.tagNames.length > 0) markdown += `- Tags: ${prompt.tagNames.join(', ')}\n`;
    if (prompt.language) markdown += `- Language: ${prompt.language}\n`;
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

