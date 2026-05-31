// Vercel Serverless Function to proxy NVIDIA API chat/completions requests
// Direct route: /api/nvidia/v1/chat/completions
// Reference: https://vercel.com/docs/functions/functions-api-reference

export default {
  async fetch(request: Request): Promise<Response> {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Log request details
    console.log('[NVIDIA Proxy] ===== Direct Route Handler =====');
    console.log('[NVIDIA Proxy] Request method:', request.method);
    console.log('[NVIDIA Proxy] Request URL:', request.url);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      console.error('[NVIDIA Proxy] Method not allowed:', request.method);
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          method: request.method,
          allowed: 'POST',
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const nvidiaUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    console.log('[NVIDIA Proxy] Proxying to:', nvidiaUrl);

    try {
      // Get request body
      let requestBody: any = {};
      try {
        const bodyText = await request.text();
        if (bodyText) {
          requestBody = JSON.parse(bodyText);
        }
      } catch (e) {
        console.warn('[NVIDIA Proxy] Failed to parse request body:', e);
      }

      console.log('[NVIDIA Proxy] Request body keys:', Object.keys(requestBody));

      // Get Authorization header
      const authHeader = request.headers.get('authorization') || 
                        request.headers.get('Authorization') ||
                        '';

      if (!authHeader) {
        console.error('[NVIDIA Proxy] No Authorization header found');
        return new Response(
          JSON.stringify({ error: 'Authorization header is required' }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      console.log('[NVIDIA Proxy] Has Authorization:', !!authHeader);

      // Forward the request to NVIDIA API
      const response = await fetch(nvidiaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[NVIDIA Proxy] NVIDIA API response status:', response.status);

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}` };
        }
        
        console.error('[NVIDIA Proxy] API Error:', response.status, errorData);
        return new Response(
          JSON.stringify({
            error: `NVIDIA API Error: ${errorData.error?.message || errorData.message || `HTTP ${response.status}`}`,
            status: response.status,
            details: errorData,
          }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Get response data
      const data = await response.json();

      // Forward the status code and response
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      console.error('[NVIDIA Proxy] Error:', error);
      return new Response(
        JSON.stringify({
          error: 'Proxy error',
          message: error?.message || 'Failed to proxy request to NVIDIA API',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
