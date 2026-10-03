export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageItem = {
  role: ChatRole;
  content: string;
};

export type ExecuteChatOptions = {
  signal?: AbortSignal;
  promptId?: string;
  systemPrompt?: string;
  messages: ChatMessageItem[];
  provider?: string;
  model?: string;
  apiKey?: string;
};

export type PromptRunResult = {
  text: string;
  latencyMs: number;
  providerUsed: string;
  modelUsed: string;
  finishReason?: string;
};

export async function parseSSEResponse(
  res: Response,
  fallbackProvider: string,
  fallbackModel: string,
  onChunk?: (text: string) => void
): Promise<PromptRunResult> {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    } else {
      const errorText = await res.text();
      if (errorText.includes('504') || errorText.includes('Gateway Timeout')) {
        throw new Error('Vercel Gateway Timeout (504): The AI model took too long to respond. Please try again.');
      }
      throw new Error(`Server returned error (${res.status}): ${errorText.substring(0, 100)}`);
    }
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('text/event-stream')) {
    const data = await res.json();
    return data;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Response body reader is not available');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';
  const state: { metadata: Partial<PromptRunResult> | null } = { metadata: null };
  const consume = (line: string) => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let parsed;
    try { parsed = JSON.parse(payload); }
    catch { throw new Error('响应格式异常，请重新试用。'); }
    if (parsed.error) throw new Error(String(parsed.error));
    if (typeof parsed.text === 'string') {
      accumulatedText += parsed.text;
      onChunk?.(accumulatedText);
    }
    if (parsed.metadata) state.metadata = parsed.metadata;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) consume(line.replace(/\r$/, ''));
    }
    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer.trim());
    if (!state.metadata) throw new Error('连接提前中断，当前结果可能不完整，请重新试用。');
    if (!accumulatedText.trim()) throw new Error('模型未返回内容，请重试或缩短输入。');
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }

  return {
    text: accumulatedText,
    latencyMs: state.metadata?.latencyMs ?? 0,
    providerUsed: state.metadata?.providerUsed ?? fallbackProvider,
    modelUsed: state.metadata?.modelUsed ?? fallbackModel,
    finishReason: state.metadata?.finishReason,
  };
}

export async function executeChatStream(
  input: ExecuteChatOptions,
  onChunk?: (text: string) => void
): Promise<PromptRunResult> {
  const res = await fetch('/api/ai-test', {
    method: 'POST',
    signal: input.signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      promptId: input.promptId,
      systemPrompt: input.systemPrompt,
      messages: input.messages,
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
    }),
  });

  return parseSSEResponse(res, input.provider || '', input.model || '', onChunk);
}
