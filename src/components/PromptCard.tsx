import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Zap, ArrowUpRight } from 'lucide-react';
import { Icon as RiIcon } from '@iconify/react';
import { type Prompt } from '../types';
import { extractPromptValuePoints } from '../utils/promptParser';

interface PromptCardProps {
  prompt: Prompt;
  isAdmin?: boolean;
  categoryLabel?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onCopy: (id: string, content: string) => void;
  onTest: (prompt: Prompt) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  isAdmin = false,
  categoryLabel,
  categoryIcon,
  categoryColor,
  onCopy,
  onTest,
}) => {
  const [copied, setCopied] = useState(false);
  const { scenario, deliverable, cleanCodeSnippet } = extractPromptValuePoints(prompt);

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(prompt.id, prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const detailUrl = isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`;

  return (
    <article className="group relative flex flex-col justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-black/40">
      <div className="flex flex-col gap-3.5">
        {/* ── 顶部元数据：分类标与呼吸留白（彻底移除主观模型打标） ── */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300">
            {categoryIcon && (
              <RiIcon
                icon={categoryIcon}
                className="h-3.5 w-3.5"
                style={{ color: categoryColor || '#00e5ff' }}
              />
            )}
            <span className="font-medium tracking-tight">
              {categoryLabel || prompt.category || 'General'}
            </span>
          </div>
        </div>

        {/* ── 指令标题 ── */}
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-white">
          <Link to={detailUrl} className="hover:underline line-clamp-1">
            {prompt.title}
          </Link>
        </h2>

        {/* ── 核心双价值点（痛点与产出） ── */}
        <div className="flex flex-col gap-2 rounded-md border border-zinc-800/60 bg-zinc-950/50 p-2.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-amber-500/10 text-[9px] font-bold text-amber-400">
              P
            </span>
            <span className="text-zinc-300 line-clamp-1 leading-snug">
              <strong className="font-medium text-zinc-400">痛点：</strong>
              {scenario}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
              O
            </span>
            <span className="text-zinc-300 line-clamp-1 leading-snug">
              <strong className="font-medium text-zinc-400">产出：</strong>
              {deliverable}
            </span>
          </div>
        </div>

        {/* ── 代码微质感预览窗口（固定高度 108px + 渐隐遮罩） ── */}
        <div className="relative h-[108px] overflow-hidden rounded border border-zinc-800/70 bg-zinc-950/90 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
          <pre className="overflow-hidden whitespace-pre-wrap select-none opacity-85">
            <code>{cleanCodeSnippet}</code>
          </pre>
          {/* 底部平滑渐隐遮罩 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        </div>

        {/* ── 标签列表 ── */}
        {prompt.tagNames && prompt.tagNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {prompt.tagNames.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-zinc-800 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 底部操作工具栏 ── */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs">
        <div className="flex items-center gap-2">
          {/* 一键复制 (未登录可用) */}
          <button
            onClick={handleCopyClick}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
              copied
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            title="复制完整 Prompt"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>

          {/* ⚡ 在线测试 (权限硬卡点) */}
          <button
            onClick={() => onTest(prompt)}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-700"
            title="直连沙盒在线调测"
          >
            <Zap size={12} className="text-amber-400" />
            <span>在线测试</span>
          </button>
        </div>

        {/* 详情链接 */}
        <Link
          to={detailUrl}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <span>详情</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </article>
  );
};

export default PromptCard;
