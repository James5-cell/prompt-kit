import type { Prompt } from '../types';

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();

/** All query terms must match; titles and tags rank ahead of template body matches. */
export function promptSearchScore(prompt: Prompt, query: string): number {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const fields = [
    [normalize(prompt.title), 8],
    [normalize((prompt.tagNames ?? []).join(' ')), 5],
    [normalize([prompt.summary, prompt.inputHint, prompt.outputHint, prompt.category].filter(Boolean).join(' ')), 3],
    [normalize(prompt.content), 1],
  ] as const;
  let score = 0;
  for (const term of terms) {
    const best = fields.find(([text]) => text.includes(term));
    if (!best) return 0;
    score += best[1];
  }
  return score;
}
