import { getTrialInputLimit } from '../utils/trialBudget';
import type { Prompt } from '../types';
import { canTryPrompt, getUsageMode, getUsageNotes, USAGE_LABELS } from '../utils/promptUsage';

export default function PromptUsageNotice({ prompt }: { prompt: Prompt }) {
  return (
    <section id="usage-guide" className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300" aria-label="使用条件">
      <p className="font-semibold text-zinc-100">{USAGE_LABELS[getUsageMode(prompt)]}</p>
      <p className="mt-2 leading-relaxed">{getUsageNotes(prompt)}</p>
      {canTryPrompt(prompt) && <p className="mt-2 text-xs text-zinc-400">轻量体验，每次最多输入 {getTrialInputLimit(prompt.content)} 字符；长资料请分段或在其他 Agent 中使用。</p>}
      {prompt.inputHint && <p className="mt-2">准备：{prompt.inputHint}</p>}
      {prompt.outputHint && <p className="mt-2">获得：{prompt.outputHint}</p>}
      {!canTryPrompt(prompt) && <p className="mt-2 text-amber-300">复制下方完整指令 → 在其他 Agent 中打开所需资料或连接工具 → 粘贴指令开始使用。</p>}
    </section>
  );
}
