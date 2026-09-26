import React from 'react';
import { Search, CornerDownLeft, Sparkles } from 'lucide-react';
import { Icon as RiIcon } from '@iconify/react';

export interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  color?: string;
}

interface DashboardHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  categories: CategoryOption[];
  featuredCount: number;
  totalFilteredCount: number;
  totalVaultCount: number;
  onNavigateToLibrary: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  onSearchClear,
  selectedCategory,
  onSelectCategory,
  categories,
  featuredCount,
  totalFilteredCount,
  totalVaultCount,
  onNavigateToLibrary,
}) => {
  return (
    <section className="relative mx-auto mb-10 flex max-w-4xl flex-col items-center text-center">
      {/* ── 1. 极简工件 Eyebrow 规范标签 ── */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3.5 py-1 font-mono text-[11px] text-zinc-400">
        <Sparkles size={11} className="text-zinc-400" />
        <span>PROMPT KIT ARCHIVE // PRODUCTION VAULT</span>
      </div>

      {/* ── 2. 主标题：清晰有力，克制排版 ── */}
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
        高确定性实战指令库
      </h1>

      {/* ── 3. 价值主张说明语（收敛为单段高信噪比文案） ── */}
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-zinc-400">
        拒绝空泛闲聊模板，只收录经工程落地与复杂推理验证的 System Prompts。
        支持免客户端直连沙盒实测，保障大模型推演的高确定性输出。
      </p>

      {/* ── 4. Raycast 风格集成式命令搜索舱 ── */}
      <div className="w-full max-w-2xl">
        <div className="relative flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-2xl transition-all focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600">
          <Search size={16} className="ml-3.5 shrink-0 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="搜索架构设计、代码审查、双语精译、商业金融等实战指令..."
            className="w-full bg-transparent px-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none"
          />

          <div className="mr-3 flex shrink-0 items-center gap-2">
            {searchQuery && (
              <button
                onClick={onSearchClear}
                className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                清空
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
              <CornerDownLeft size={10} />
              <span>Enter 检索全库</span>
            </kbd>
          </div>
        </div>

        {/* 动态实时过滤提示条 */}
        {searchQuery.trim() && (
          <div className="mt-2.5 flex items-center justify-between rounded border border-zinc-800/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400">
            <span>
              已即时呈现前 <strong className="font-mono text-zinc-200">{featuredCount}</strong> 条匹配项
              （全库共 {totalFilteredCount} 项）
            </span>
            <button
              onClick={onNavigateToLibrary}
              className="font-mono text-zinc-400 hover:text-zinc-100 hover:underline"
            >
              按 Enter 前往全量指令库查看 →
            </button>
          </div>
        )}
      </div>

      {/* ── 5. 分类 Segmented Control (横向分段切换，取代散乱堆叠) ── */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-1 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border border-zinc-700/60 bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`}
            >
              <RiIcon
                icon={cat.icon}
                className="h-3.5 w-3.5"
                style={{ color: isActive ? (cat.color || '#f8fafc') : undefined }}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 数量微提示 */}
      <div className="mt-2 text-right w-full max-w-2xl px-1">
        <span className="font-mono text-[11px] text-zinc-500">
          精选推荐 {featuredCount} 项 · 全库共收录 {totalVaultCount} 项
        </span>
      </div>
    </section>
  );
};

export default DashboardHero;
