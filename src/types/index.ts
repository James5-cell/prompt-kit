// 核心数据模型定义

// Prompt 实体核心字段 - 简化版本
export interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// 保留其他类型定义以支持向后兼容（如果需要）
// 这些类型现在主要用于导入/导出功能

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

// 用户
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
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

// A/B 测试配置
export interface ABTest {
  id: string;
  name: string;
  promptId: string;
  variants: ABTestVariant[];
  createdAt: number;
  status: 'running' | 'completed' | 'paused';
  winner?: string; // 获胜变体 ID
}

export interface ABTestVariant {
  id: string;
  name: string;
  promptId: string; // 可能是原 Prompt 的变体
  runs: string[]; // Run IDs
  averageRating?: number;
  successRate?: number;
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

