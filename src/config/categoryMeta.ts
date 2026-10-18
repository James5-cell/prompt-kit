export interface PromptCategoryMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
  themeClass: string;
  aliases: string[];
}

export const PROMPT_CATEGORY_OPTIONS: PromptCategoryMeta[] = [
  {
    key: 'dev',
    label: '研发工程',
    icon: 'ri:terminal-box-line',
    color: 'var(--color-dev)',
    themeClass: 'theme-dev',
    aliases: ['development', 'coding'],
  },
  {
    key: 'translation',
    label: '双语精译',
    icon: 'ri:translate-2',
    color: 'var(--color-translation)',
    themeClass: 'theme-translation',
    aliases: [],
  },
  {
    key: 'thinking',
    label: '深度思考',
    icon: 'ri:brain-line',
    color: 'var(--color-thinking)',
    themeClass: 'theme-thinking',
    aliases: [],
  },
  {
    key: 'finance',
    label: '商业金融',
    icon: 'ri:line-chart-line',
    color: 'var(--color-finance)',
    themeClass: 'theme-finance',
    aliases: [],
  },
  {
    key: 'tools',
    label: '效率工具',
    icon: 'ri:tools-line',
    color: 'var(--color-tools)',
    themeClass: 'theme-tools',
    aliases: [],
  },
  {
    key: 'learning',
    label: '学习研究',
    icon: 'ri:book-read-line',
    color: 'var(--color-learning)',
    themeClass: 'theme-learning',
    aliases: [],
  },
  {
    key: 'writing',
    label: '内容创作',
    icon: 'ri:quill-pen-line',
    color: 'var(--color-writing)',
    themeClass: 'theme-writing',
    aliases: [],
  },
];

const CATEGORY_LOOKUP = new Map<string, PromptCategoryMeta>();
for (const category of PROMPT_CATEGORY_OPTIONS) {
  CATEGORY_LOOKUP.set(category.key, category);
  for (const alias of category.aliases) CATEGORY_LOOKUP.set(alias, category);
}

export function getPromptCategoryMeta(value?: string | null): PromptCategoryMeta {
  const normalized = value?.trim().toLowerCase();
  if (normalized && CATEGORY_LOOKUP.has(normalized)) {
    return CATEGORY_LOOKUP.get(normalized)!;
  }

  return {
    key: normalized || 'general',
    label: value?.trim() || '通用',
    icon: 'ri:bookmark-line',
    color: 'var(--primary)',
    themeClass: 'theme-default',
    aliases: [],
  };
}

export function isSamePromptCategory(left?: string | null, right?: string | null): boolean {
  return getPromptCategoryMeta(left).key === getPromptCategoryMeta(right).key;
}
