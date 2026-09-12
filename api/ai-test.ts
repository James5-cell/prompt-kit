import { streamText } from 'ai';
import { resolveAIModel } from './_lib/ai/providerFactory.js';
import { FALLBACK_CONFIG } from '../src/config/aiModels.js';
import { getPlatformConfig } from './_lib/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MAX_CONTEXT_MESSAGES = 8;

/**
 * Normalizes input messages or fallback prompt into a validated sliding-window array.
 */
function normalizeRequestMessages(
  messages?: unknown,
  prompt?: unknown
): ChatMessage[] | null {
  if (Array.isArray(messages) && messages.length > 0) {
    const validMessages: ChatMessage[] = messages
      .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0 && ['user', 'assistant', 'system'].includes(m.role))
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content.trim(),
      }));

    if (validMessages.length === 0 && !prompt) {
      return null;
    }

    return validMessages.length > MAX_CONTEXT_MESSAGES
      ? validMessages.slice(-MAX_CONTEXT_MESSAGES)
      : validMessages;
  }

  if (prompt && typeof prompt === 'string' && prompt.trim()) {
    return [{ role: 'user', content: prompt.trim() }];
  }

  return null;
}

// Model aliases for sunset or deprecated models
const MODEL_ALIASES: Record<string, string> = {
  'meta/llama-3.1-8b-instruct': 'meta/llama-3.2-11b-vision-instruct',
  'meta/llama-3.1-70b-instruct': 'meta/llama-3.2-90b-vision-instruct',
  'meta/llama-3.3-70b-instruct': 'meta/llama-3.2-90b-vision-instruct',
};

/**
 * Resolves the provider, model, and API key using user input or platform fallbacks.
 */
async function resolveCredentials(
  provider?: string,
  model?: string,
  apiKey?: string
): Promise<{ finalProvider: string; finalModel: string; attemptApiKey?: string }> {
  let targetProvider = provider;
  let targetModel = model;

  if (!apiKey) {
    const platformConfig = await getPlatformConfig();
    if (platformConfig?.defaultProvider && platformConfig?.defaultModel) {
      targetProvider = targetProvider || platformConfig.defaultProvider;
      targetModel = targetModel || platformConfig.defaultModel;
      console.log(`[ai-test] Fallback to platform default config: provider=${targetProvider}, model=${targetModel}`);
    }
  }

  const finalProvider = targetProvider || FALLBACK_CONFIG.defaultProvider;
  let finalModel = targetModel || FALLBACK_CONFIG.defaultModel;

  if (MODEL_ALIASES[finalModel]) {
    console.log(`[ai-test] Migrating deprecated model: ${finalModel} -> ${MODEL_ALIASES[finalModel]}`);
    finalModel = MODEL_ALIASES[finalModel];
  }

  let attemptApiKey = apiKey;
  if (!attemptApiKey && finalProvider === 'nvidia') {
    attemptApiKey = process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY;
  }
  if (attemptApiKey) {
    attemptApiKey = attemptApiKey.replace(/^['"]|['"]$/g, '').trim();
  }

  return { finalProvider, finalModel, attemptApiKey };
}

/**
 * Executes streamText with automatic fallback for secondary NVIDIA API key on transient errors.
 */
async function executeStreamWithFallback(
  finalProvider: string,
  finalModel: string,
  attemptApiKey: string | undefined,
  isUserKey: boolean,
  streamParams: any
) {
  try {
    return await streamText(streamParams);
  } catch (err: any) {
    const hasKey2 = !!process.env.NVIDIA_API_KEY_2;
    const status = err?.status ?? err?.statusCode ?? err?.response?.status;
    const isRetryable = status === 401 || status === 403 || status === 429 || status >= 500 || status === undefined;

    if (finalProvider === 'nvidia' && !isUserKey && hasKey2 && isRetryable) {
      console.warn(`[ai-test] First NVIDIA API key failed (status=${status}). Attempting fallback to key 2...`);
      const key2 = (process.env.NVIDIA_API_KEY_2 || '').replace(/^['"]|['"]$/g, '').trim();
      const fallbackModel = resolveAIModel({
        provider: finalProvider,
        model: finalModel,
        apiKey: key2,
      });
      const fallbackResult = await streamText({
        ...streamParams,
        model: fallbackModel,
      });
      console.log('[ai-test] Prompt execution successful on key 2 fallback.');
      return fallbackResult;
    }
    throw err;
  }
}

/**
 * Creates SSE response stream and pipes text chunks and metadata to client.
 */
function createSSEStream(
  result: any,
  finalProvider: string,
  finalModel: string,
  start: number,
  apiKey?: string
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const sendSSE = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const textPart of result.textStream) {
          sendSSE({ text: textPart });
        }

        const latencyMs = Date.now() - start;
        let finishReason = 'unknown';
        try {
          finishReason = await result.finishReason;
        } catch (reasonErr) {
          console.warn('[ai-test] Failed to get finishReason:', reasonErr);
        }

        console.log(`[ai-test] Stream completed successfully, latency=${latencyMs}ms, finishReason=${finishReason}`);
        sendSSE({
          metadata: {
            latencyMs,
            providerUsed: finalProvider,
            modelUsed: finalModel,
            finishReason,
          },
        });
      } catch (streamErr: any) {
        console.error('[ai-test] Error during streaming:', streamErr);
        let errMsg = streamErr?.message || 'Error during stream generation';
        if (apiKey && typeof apiKey === 'string' && apiKey.length > 0 && errMsg.includes(apiKey)) {
          errMsg = errMsg.replaceAll(apiKey, '***');
        }
        sendSSE({ error: errMsg });
      } finally {
        controller.close();
      }
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    let requestBody: any = {};
    try {
      const text = await request.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch (e) {
      console.warn('[ai-test] Failed to parse request body:', e);
    }

    const { prompt, systemPrompt, messages, provider, model, apiKey } = requestBody || {};

    try {
      const normalizedMessages = normalizeRequestMessages(messages, prompt);
      if (!normalizedMessages) {
        return new Response(JSON.stringify({ error: 'Valid messages or prompt is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }

      console.log(`[ai-test] Incoming request: provider=${provider}, model=${model}, hasSystemPrompt=${!!systemPrompt}, messagesCount=${normalizedMessages.length}, apiKeyLength=${apiKey ? apiKey.length : 0}`);

      const { finalProvider, finalModel, attemptApiKey } = await resolveCredentials(provider, model, apiKey);

      const resolvedModel = resolveAIModel({
        provider: finalProvider,
        model: finalModel,
        apiKey: attemptApiKey,
      });

      const streamParams: any = {
        model: resolvedModel,
        messages: normalizedMessages,
        maxOutputTokens: 4096,
      };

      if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim()) {
        streamParams.system = systemPrompt.trim();
      }

      const start = Date.now();
      const result = await executeStreamWithFallback(
        finalProvider,
        finalModel,
        attemptApiKey,
        Boolean(apiKey),
        streamParams
      );

      const stream = createSSEStream(result, finalProvider, finalModel, start, apiKey);

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Content-Encoding': 'none',
          ...corsHeaders,
        },
      });
    } catch (err: unknown) {
      console.error('[ai-test] Error caught during prompt evaluation:', err);
      let msg = err instanceof Error ? err.message : 'Internal server error';
      if (apiKey && typeof apiKey === 'string' && apiKey.length > 0 && msg.includes(apiKey)) {
        msg = msg.replaceAll(apiKey, '***');
      }
      return new Response(JSON.stringify({ error: `Server error: ${msg}` }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};
