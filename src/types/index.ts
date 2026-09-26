// 核心数据模型定义

// ─── Prompt Status ───────────────────────────────────────────────
export type PromptStatus = 'draft' | 'published' | 'private' | 'active' | 'archived';
export type PromptVisibility = 'private' | 'public' | 'team';

// ─── Prompt 实体 ────────────────────────────────────────────────
// All new fields are optional so existing documents are backward-compatible.
export interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;

  // Existing optional fields
  favorite?: boolean;
  usageCount?: number;
  lastUsedAt?: number;

  // ── New: metadata ──────────────────────────────────────────────
  slug?: string;
  summary?: string;
  category?: string;
  language?: string;
  status?: PromptStatus;
  visibility?: PromptVisibility;

  // ── New: tags (denormalized for Firestore query perf) ──────────
  tagIds?: string[];       // references to tags collection
  tagNames?: string[];     // denormalized for display without join

  // ── New: search ────────────────────────────────────────────────
  // Lowercase tokens for Firestore `array-contains` queries.
  // Generated from title + tagNames + category on save.
  searchTokens?: string[];

  // ── New: counters & audit ──────────────────────────────────────
  runCount?: number;
  createdBy?: string;      // uid of creator
  updatedBy?: string;      // uid of last editor
  isDeleted?: boolean;     // soft delete flag

  // ── New: sample output for public display ──────────────────────
  sampleOutput?: string;   // example AI output shown on public detail page
  sampleInput?: string;    // example input used to produce sampleOutput
}

// ─── Tag 实体 ───────────────────────────────────────────────────
// Stored in Firestore `tags` collection.
export interface Tag {
  id: string;
  slug: string;            // URL-safe identifier, e.g. "prompt-engineering"
  name: string;            // Display name, e.g. "Prompt Engineering"
  description?: string;
  color?: string;          // Hex color for UI pills, e.g. "#4a9eff"
  aliases?: string[];      // Alternative names for search
  parentId?: string;       // For hierarchical tags (optional)
  path?: string;           // Materialized path, e.g. "ai/prompt-engineering"
  promptCount: number;     // Denormalized count of prompts using this tag
  usageCount: number;      // How often prompts with this tag have been run
  isActive: boolean;       // Whether the tag is visible / selectable
  isSystem?: boolean;      // System-managed tags cannot be deleted by users
  createdAt: number;
  updatedAt: number;
}

// ─── 以下为原有类型定义，保持向后兼容 ──────────────────────────

// 模型参数（用于 Run 接口）
export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  [key: string]: any;
}

// Collection/Space：项目/团队空间
export interface Collection {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'team' | 'public';
  permissions: {
    ownerId: string;
    editors: string[];
    viewers: string[];
  };
  createdAt: number;
  updatedAt: number;
  promptIds: string[]; // 关联的 Prompt IDs
}

// Run/Session：一次运行的记录
export interface Run {
  id: string;
  promptId: string;
  input: Record<string, any>; // 填充的变量
  output: string;
  model: string;
  parameters: ModelParameters;
  latency: number; // 耗时（毫秒）
  cost?: number; // 花费（如可用）
  rating?: number; // 评分
  tags?: string[]; // 标签（用于离线评估）
  notes?: string; // 注释
  createdAt: number;
  abTestGroup?: string; // A/B 测试组
}

// 智能视图（保存的检索组合）
export interface SmartView {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: number;
}

// 搜索过滤器
export interface SearchFilters {
  title?: string;
  tags?: string[];
  category?: string;
  language?: string;
  models?: string[];
  minRating?: number;
  minUsageCount?: number;
  dateRange?: {
    start: number;
    end: number;
  };
  visibility?: ('private' | 'team' | 'public')[];
}

// 导出格式
export type ExportFormat = 'json' | 'csv' | 'markdown';

// 分享链接类型
export type ShareLinkType = 'readonly' | 'reusable' | 'forkable';

// 分享链接
export interface ShareLink {
  id: string;
  promptId: string;
  type: ShareLinkType;
  token: string;
  expiresAt?: number;
  createdAt: number;
  accessCount: number;
}
