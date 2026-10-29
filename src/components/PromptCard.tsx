import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Zap, Star } from 'lucide-react';
import { Icon as RiIcon } from '@iconify/react';
import type { Prompt } from '../types';
import { canTryPrompt, USAGE_LABELS } from '../utils/promptUsage';
import { getPromptSummary, getPromptUsagePlan } from '../utils/promptDisplay';

interface PromptCardProps {
  prompt: Prompt;
  isAdmin?: boolean;
  /** Safe local return path so the detail page's back link restores filters. */
  returnTo?: string;
  categoryLabel?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onCopy: (id: string, content: string) => void | Promise<void>;
  onTest: (prompt: Prompt) => void;
  onFavorite?: (prompt: Prompt) => Promise<void>;
}

export default function PromptCard({ prompt, isAdmin = false, returnTo, categoryLabel, categoryIcon, categoryColor, onCopy, onTest, onFavorite }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const detailUrl = isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`;
  const linkState = returnTo ? { returnTo } : undefined;
  const usagePlan = getPromptUsagePlan(prompt);
  const mode = usagePlan.mode;
  const canTry = canTryPrompt(prompt);
  const summary = getPromptSummary(prompt);
  const visibleTags = (prompt.tagNames ?? []).slice(0, 3);
  const hiddenTagCount = Math.max(0, (prompt.tagNames?.length ?? 0) - visibleTags.length);

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
    <article className="prompt-summary-card">
      <div className="prompt-summary-card-head">
        <span className="inline-flex items-center gap-2">
          {categoryIcon && <RiIcon icon={categoryIcon} width={16} style={{ color: categoryColor }} />}
          {categoryLabel || prompt.category || '通用'}
        </span>
        <span className={`prompt-usage-pill ${canTry ? 'is-trialable' : 'is-external'}`}>
          {USAGE_LABELS[mode]}
        </span>
        {isAdmin && onFavorite && <button type="button" className="prompt-summary-star" aria-label={prompt.favorite ? '取消首页推荐' : '加星并加入首页推荐'} aria-pressed={!!prompt.favorite} disabled={saving} onClick={toggleStar}>
          <Star size={18} className={prompt.favorite ? 'text-amber-300' : 'text-zinc-400'} fill={prompt.favorite ? 'currentColor' : 'none'} />
        </button>}
      </div>
      <h3 className="prompt-summary-title"><Link to={detailUrl} state={linkState}>{prompt.title}</Link></h3>
      <p className="prompt-summary-text">{summary}</p>
      <div className="prompt-summary-tags">
        {visibleTags.map(tag => <span key={tag}>{tag}</span>)}
        {hiddenTagCount > 0 && <span className="prompt-summary-more">+{hiddenTagCount}</span>}
      </div>
      <div className="flex-1" />
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="prompt-summary-actions">
        <button onClick={copy} className="prompt-summary-copy"><Copy size={15} />{copied ? '已复制' : '复制完整指令'}</button>
        {canTry ? <button onClick={() => onTest(prompt)} className="prompt-summary-trial"><Zap size={15} />{mode === 'text' ? '填写文本并试用' : '立即试用'}</button> : <Link to={`/p/${prompt.id}`} state={linkState} className="prompt-summary-trial">查看详情</Link>}
      </div>
    </article>
  );
}
