export type PromptRunResult = {
  text: string;
  latencyMs: number;
  providerUsed: string;
  modelUsed: string;
};

export async function executePrompt(input: {
  prompt: string;
  provider: string;
  model: string;
  apiKey: string;
}): Promise<PromptRunResult> {
  const res = await fetch('/api/ai-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: input.prompt,
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
    }),
  });

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('AI endpoint returned non-JSON response. Check Vercel rewrites or local dev server.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return data;
}
