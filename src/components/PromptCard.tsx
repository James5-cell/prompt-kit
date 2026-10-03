import { getTrialInputLimit } from '../utils/trialBudget';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Zap, ArrowUpRight, Star } from 'lucide-react';
import { Icon as RiIcon } from '@iconify/react';
import type { Prompt } from '../types';
import { canTryPrompt, getUsageMode, getUsageNotes, USAGE_LABELS } from '../utils/promptUsage';

interface PromptCardProps {
  prompt: Prompt;
  isAdmin?: boolean;
  categoryLabel?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onCopy: (id: string, content: string) => void | Promise<void>;
  onTest: (prompt: Prompt) => void;
  onFavorite?: (prompt: Prompt) => Promise<void>;
}

export default function PromptCard({ prompt, isAdmin = false, categoryLabel, categoryIcon, categoryColor, onCopy, onTest, onFavorite }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const detailUrl = isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`;
  const mode = getUsageMode(prompt);
  const canTry = canTryPrompt(prompt);

  async function copy() {
    try {
      await onCopy(prompt.id, prompt.content);
      setError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError('复制失败，请在详情页手动复制。'); }
  }

  async function toggleStar() {
    if (!onFavorite || saving) return;
    setSaving(true);
    try { await onFavorite(prompt); setError(''); }
    catch { setError('加星失败，请稍后重试。'); }
    finally { setSaving(false); }
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-600">
      <div className="flex items-center justify-between gap-2 text-sm text-zinc-300">
        <span className="inline-flex items-center gap-2">
          {categoryIcon && <RiIcon icon={categoryIcon} width={16} style={{ color: categoryColor }} />}
          {categoryLabel || prompt.category || '通用'}
        </span>
        {isAdmin && onFavorite && <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-zinc-800 focus-visible:outline focus-visible:outline-cyan-400" aria-label={prompt.favorite ? '取消首页推荐' : '加星并加入首页推荐'} aria-pressed={!!prompt.favorite} disabled={saving} onClick={toggleStar}>
          <Star size={18} className={prompt.favorite ? 'text-amber-300' : 'text-zinc-400'} fill={prompt.favorite ? 'currentColor' : 'none'} />
        </button>}
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-snug text-zinc-100"><Link to={detailUrl} className="hover:text-cyan-300 focus-visible:outline focus-visible:outline-cyan-400">{prompt.title}</Link></h2>
      <span className={`mt-3 w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${canTry ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-200' : 'border-amber-700/60 bg-amber-950/30 text-amber-200'}`}>{USAGE_LABELS[mode]}</span>
      {canTry && <p className="mt-2 text-xs text-zinc-400">片段体验 · 每次最多 {getTrialInputLimit(prompt.content)} 字符</p>}
      <dl className="mt-4 space-y-3 text-sm leading-relaxed">
        <div><dt className="text-zinc-400">{canTry ? '输入' : '准备'}</dt><dd className="mt-1 text-zinc-200">{prompt.inputHint || '查看完整指令的输入要求'}</dd></div>
        <div><dt className="text-zinc-400">获得</dt><dd className="mt-1 text-zinc-200">{prompt.outputHint || prompt.summary || '查看详情了解预期结果'}</dd></div>
      </dl>
      {canTry && prompt.sampleInput ? <div className="mt-4 rounded-lg bg-zinc-950/70 p-3 text-sm leading-relaxed text-zinc-300"><p className="mb-1 text-xs text-zinc-400">示例输入</p><p className="line-clamp-3 whitespace-pre-wrap">{prompt.sampleInput}</p></div> : <p className="mt-4 text-sm leading-relaxed text-zinc-300">{getUsageNotes(prompt)}</p>}
      <div className="mt-4 flex flex-wrap gap-1.5">{prompt.tagNames?.slice(0, 3).map(tag => <span key={tag} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{tag}</span>)}</div>
      <div className="flex-1" />
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
        {canTry ? <button onClick={() => onTest(prompt)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><Zap size={16} />{mode === 'text' ? '提供文本后试用' : '立即试用'}</button> : <Link to={`/p/${prompt.id}#usage-guide`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-600 px-3 text-sm text-zinc-100 hover:bg-zinc-800">使用指南<ArrowUpRight size={16} /></Link>}
        <button onClick={copy} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-zinc-300 hover:bg-zinc-800">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制'}</button>
        <Link to={detailUrl} className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm text-zinc-300 hover:text-white">详情<ArrowUpRight size={14} /></Link>
      </div>
    </article>
  );
}
