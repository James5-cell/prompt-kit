import { streamText } from 'ai';
import { resolveAIModel } from './_lib/ai/providerFactory.js';
import { FALLBACK_CONFIG } from '../src/config/aiModels.js';
import { getPlatformConfig } from './_lib/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

    const { prompt, provider, model, apiKey } = requestBody || {};

    try {
      console.log(`[ai-test] Incoming request: provider=${provider}, model=${model}, apiKeyLength=${apiKey ? apiKey.length : 0}`);

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
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
          maxTokens: 4096,
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
              maxTokens: 4096,
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

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendSSE = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
            controller.close();
          }
        }
      });

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
      // Hide API key in any error strings if it leaked
      let msg = err instanceof Error ? err.message : 'Internal server error';
      if (apiKey && msg.includes(apiKey)) {
        msg = msg.replace(apiKey, '***');
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
