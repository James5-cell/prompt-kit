import { streamText } from 'ai';
import { resolveAIModel } from './_lib/ai/providerFactory.js';
import { FALLBACK_CONFIG } from '../src/config/aiModels.js';
import { getPlatformConfig } from './_lib/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface VercelRequest {
  method?: string;
  body?: {
    prompt?: string;
    provider?: string;
    model?: string;
    apiKey?: string;
    [key: string]: unknown;
  };
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
  writeHead: (statusCode: number, headers?: Record<string, string>) => VercelResponse;
  write: (chunk: string) => boolean;
  end: () => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, provider, model, apiKey } = req.body || {};

    console.log(`[ai-test] Incoming request: provider=${provider}, model=${model}, apiKeyLength=${apiKey ? apiKey.length : 0}`);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let targetProvider = provider;
    let targetModel = model;
    let targetApiKey = apiKey;

    if (!targetApiKey) {
      // Fallback: Read platform default config from Firestore
      const platformConfig = await getPlatformConfig();
      if (platformConfig && platformConfig.defaultProvider && platformConfig.defaultModel) {
        targetProvider = platformConfig.defaultProvider;
        targetModel = platformConfig.defaultModel;
        console.log(`[ai-test] Fallback to platform default config: provider=${targetProvider}, model=${targetModel}`);
      }
    }

    const finalProvider = targetProvider || FALLBACK_CONFIG.defaultProvider;
    const finalModel = targetModel || FALLBACK_CONFIG.defaultModel;

    let attemptApiKey = targetApiKey;
    if (!attemptApiKey && finalProvider === 'nvidia') {
      attemptApiKey = process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY;
    }

    const start = Date.now();
    const resolvedModel = resolveAIModel({
      provider: finalProvider,
      model: finalModel,
      apiKey: attemptApiKey
    });

    console.log(`[ai-test] Executing user prompt with model ${finalModel}...`);
    
    let result;
    try {
      result = await streamText({
        model: resolvedModel,
        prompt: prompt,
      });
    } catch (err: any) {
      const isUserKey = !!targetApiKey;
      const hasKey2 = !!process.env.NVIDIA_API_KEY_2;
      const status = err?.status ?? err?.statusCode ?? err?.response?.status;
      const isRetryable = status === 401 || status === 403 || status === 429 || status >= 500 || status === undefined;

      if (finalProvider === 'nvidia' && !isUserKey && hasKey2 && isRetryable) {
        console.warn(`[ai-test] First NVIDIA API key failed (status=${status}). Attempting fallback to key 2...`);
        try {
          const fallbackModel = resolveAIModel({
            provider: finalProvider,
            model: finalModel,
            apiKey: process.env.NVIDIA_API_KEY_2,
          });
          result = await streamText({
            model: fallbackModel,
            prompt: prompt,
          });
          console.log(`[ai-test] Prompt execution successful on key 2 fallback.`);
        } catch (fallbackErr: any) {
          console.error(`[ai-test] NVIDIA API key 2 also failed:`, fallbackErr);
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    // Set up SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
      ...corsHeaders
    });

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    try {
      for await (const textPart of result.textStream) {
        sendSSE({ text: textPart });
      }

      const latencyMs = Date.now() - start;
      console.log(`[ai-test] Stream completed successfully, latency=${latencyMs}ms`);
      
      sendSSE({
        metadata: {
          latencyMs,
          providerUsed: finalProvider,
          modelUsed: finalModel,
        }
      });
    } catch (streamErr: any) {
      console.error('[ai-test] Error during streaming:', streamErr);
      sendSSE({ error: streamErr?.message || 'Error during stream generation' });
    } finally {
      res.end();
    }

  } catch (err: unknown) {
    console.error('[ai-test] Error caught during prompt evaluation:', err);
    // Hide API key in any error strings if it leaked
    let msg = err instanceof Error ? err.message : 'Internal server error';
    if (req.body?.apiKey && msg.includes(req.body.apiKey)) {
      msg = msg.replace(req.body.apiKey, '***');
    }
    return res.status(500).json({ error: `Server error: ${msg}` });
  }
}

