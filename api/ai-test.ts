import { generateText } from 'ai';
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
    
    let text = '';
    try {
      const response = await generateText({
        model: resolvedModel,
        prompt: prompt,
      });
      text = response.text;
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
          const response = await generateText({
            model: fallbackModel,
            prompt: prompt,
          });
          text = response.text;
          console.log(`[ai-test] Prompt execution successful on key 2 fallback.`);
        } catch (fallbackErr: any) {
          console.error(`[ai-test] NVIDIA API key 2 also failed:`, fallbackErr);
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    const latencyMs = Date.now() - start;
    console.log(`[ai-test] Prompt execution successful, latency=${latencyMs}ms`);
    return res.status(200).json({
      text,
      latencyMs,
      providerUsed: finalProvider,
      modelUsed: finalModel,
    });
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
