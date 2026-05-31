// Vercel Serverless Function to proxy NVIDIA API requests
// This solves CORS issues when calling NVIDIA API from the browser
// Route: /api/nvidia/* -> proxies to https://integrate.api.nvidia.com/*
// Reference: https://vercel.com/docs/functions/functions-api-reference

export default {
  async fetch(request: Request): Promise<Response> {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Log request details FIRST for debugging
    const url = new URL(request.url);
    console.log('[NVIDIA Proxy] ===== Request Received =====');
    console.log('[NVIDIA Proxy] Request method:', request.method);
    console.log('[NVIDIA Proxy] Request URL:', request.url);
    console.log('[NVIDIA Proxy] URL pathname:', url.pathname);
    console.log('[NVIDIA Proxy] URL search:', url.search);
    console.log('[NVIDIA Proxy] URL hash:', url.hash);
    console.log('[NVIDIA Proxy] Headers:', Object.fromEntries(request.headers.entries()));

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      console.log('[NVIDIA Proxy] Handling OPTIONS preflight');
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests (NVIDIA chat/completions endpoint)
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

    console.log('[NVIDIA Proxy] POST request confirmed, processing...');

    // Extract path from URL
    // When request is /_nvidia/v1/chat/completions, it gets rewritten to /api/nvidia/v1/chat/completions
    // For catch-all route [...path], Vercel may pass path segments differently
    // Try multiple ways to extract the path
    
    let apiPath = '';
    
    // Method 1: Extract from pathname (after /api/nvidia/)
    const pathMatch = url.pathname.match(/^\/api\/nvidia\/(.+)$/);
    if (pathMatch) {
      apiPath = pathMatch[1];
    } else {
      // Method 2: If rewrite didn't include /api/nvidia, try direct match
      const directMatch = url.pathname.match(/^\/_nvidia\/(.+)$/);
      if (directMatch) {
        apiPath = directMatch[1];
      } else {
        // Method 3: Try to get from search params (Vercel might pass it as query)
        const pathParam = url.searchParams.get('path');
        if (pathParam) {
          apiPath = pathParam;
        } else {
          // Method 4: Default fallback
          apiPath = 'v1/chat/completions';
        }
      }
    }
    
    // Ensure we have a valid path
    if (!apiPath || apiPath.trim() === '') {
      console.error('[NVIDIA Proxy] Could not extract path from URL:', request.url);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid path format',
          debug: {
            pathname: url.pathname,
            search: url.search,
            fullUrl: request.url
          }
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const nvidiaUrl = `https://integrate.api.nvidia.com/${apiPath}`;

    console.log('[NVIDIA Proxy] Extracted API path:', apiPath);
    console.log('[NVIDIA Proxy] NVIDIA URL:', nvidiaUrl);

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
