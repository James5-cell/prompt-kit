export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageItem = {
  role: ChatRole;
  content: string;
};

export type ExecuteChatOptions = {
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

async function parseSSEResponse(
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
  let metadata: any = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
              if (onChunk) {
                onChunk(accumulatedText);
              }
            } else if (parsed.metadata) {
              metadata = parsed.metadata;
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e: any) {
            if (e.message && trimmed.includes('error')) {
              throw e;
            }
            console.warn('Failed to parse SSE line:', trimmed, e);
          }
        }
      }
    }

    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.text) {
          accumulatedText += parsed.text;
          if (onChunk) {
            onChunk(accumulatedText);
          }
        } else if (parsed.metadata) {
          metadata = parsed.metadata;
        } else if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch (e) {
        console.warn('Failed to parse trailing SSE buffer:', buffer, e);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    text: accumulatedText,
    latencyMs: metadata?.latencyMs ?? 0,
    providerUsed: metadata?.providerUsed ?? fallbackProvider,
    modelUsed: metadata?.modelUsed ?? fallbackModel,
    finishReason: metadata?.finishReason,
  };
}

export async function executeChatStream(
  input: ExecuteChatOptions,
  onChunk?: (text: string) => void
): Promise<PromptRunResult> {
  const res = await fetch('/api/ai-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt: input.systemPrompt,
      messages: input.messages,
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
    }),
  });

  return parseSSEResponse(res, input.provider || '', input.model || '', onChunk);
}
