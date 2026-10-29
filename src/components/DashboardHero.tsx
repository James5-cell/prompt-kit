import React from 'react';
import { Link } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
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
  isSearching: boolean;
  /** Library matches for the current query + category filter (honest total). */
  matchCount: number;
  /** How many matches the dashboard actually renders below the hero. */
  shownCount: number;
  /** Single destination that keeps q + category for the full result list. */
  resultsHref: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  onSearchClear,
  selectedCategory,
  onSelectCategory,
  categories,
  isSearching,
  matchCount,
  shownCount,
  resultsHref,
}) => {
  return (
    <section className="relative mx-auto mb-10 flex max-w-4xl flex-col items-center text-center">
      {/* ── 2. 主标题：清晰有力，克制排版 ── */}
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
        找到实用指令，立即体验效果
      </h1>

      {/* ── 3. 价值主张说明语（收敛为单段高信噪比文案） ── */}
      <p className="mb-8 max-w-2xl text-base leading-relaxed text-zinc-300">
        收集翻译、写作、学习、思考与研发指令。支持轻量文本试用，
        每条指令都标明所需资料和使用环境。
      </p>

      {/* ── 4. Raycast 风格集成式命令搜索舱 ── */}
      <div className="w-full max-w-2xl">
        <div className="relative flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-2xl transition-all focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600">
          <Search size={16} className="ml-3.5 shrink-0 text-zinc-500" />
          <input
            aria-label="搜索指令库"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="搜索翻译、词典、文章分析、代码审查…"
            className="min-h-11 w-full min-w-0 bg-transparent px-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none"
          />

          <div className="mr-3 flex shrink-0 items-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={onSearchClear}
                aria-label="清空搜索内容"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1.5 text-xs text-zinc-400 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                清空
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
              <CornerDownLeft size={10} />
              <span>Enter 查看全部</span>
            </kbd>
          </div>
        </div>

        {/* 搜索结果提示条：显式标注展示的是前 N 条，并给出唯一的「查看全部」入口 */}
        {isSearching && matchCount > 0 && (
          <div className="mt-2.5 flex flex-col gap-1.5 rounded border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-left text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 break-words">
              匹配 <strong className="font-mono text-zinc-200">{matchCount}</strong> 条
              {shownCount < matchCount ? `，首页预览前 ${shownCount} 条` : '，已全部显示'}
            </span>
            <Link
              to={resultsHref}
              className="inline-flex min-h-11 shrink-0 items-center font-medium text-cyan-300 hover:text-cyan-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:min-h-0"
            >
              查看全部匹配结果 →
            </Link>
          </div>
        )}
      </div>

      {/* ── 5. 分类 Segmented Control (横向分段切换，取代散乱堆叠) ── */}
      <div className="mt-5 grid w-full grid-cols-2 items-center justify-center gap-1 sm:flex sm:flex-wrap rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-1">
        <span className="col-span-2 px-2 text-left text-xs text-zinc-400 sm:sr-only">
          按分类浏览指令
        </span>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              aria-pressed={selectedCategory === cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-all ${
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
    </section>
  );
};

export default DashboardHero;
