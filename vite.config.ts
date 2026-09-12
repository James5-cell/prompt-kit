import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/api')) {
          return next();
        }

        const url = new URL(rawUrl, `http://${req.headers.host || 'localhost:5173'}`);
        const pathname = url.pathname;

        if (pathname === '/api/ai-test') {
          try {
            const mod = await server.ssrLoadModule('/api/ai-test.ts');
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const bodyBuffer = Buffer.concat(chunks);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) {
                if (Array.isArray(v)) {
                  v.forEach(val => headers.append(k, val));
                } else {
                  headers.set(k, v);
                }
              }
            }

            const webRequest = new Request(url.href, {
              method: req.method,
              headers,
              body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method || '') ? undefined : bodyBuffer,
            });

            const webResponse = await mod.default.fetch(webRequest);
            res.statusCode = webResponse.status;
            webResponse.headers.forEach((val: string, key: string) => {
              res.setHeader(key, val);
            });

            if (webResponse.body) {
              const reader = webResponse.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            } else {
              res.end();
            }
            return;
          } catch (err: any) {
            console.error('[dev-api] Error in /api/ai-test:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Local API error: ${err.message || err}` }));
            return;
          }
        }

        if (pathname === '/api/admin/platform-config') {
          try {
            const mod = await server.ssrLoadModule('/api/admin/platform-config.ts');
            let body: any = undefined;
            if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              const raw = Buffer.concat(chunks).toString('utf8');
              if (raw) {
                try {
                  body = JSON.parse(raw);
                } catch {
                  body = raw;
                }
              }
            }
            (req as any).body = body;

            const vercelRes = {
              status(code: number) {
                res.statusCode = code;
                return vercelRes;
              },
              json(data: unknown) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              setHeader(k: string, v: string) {
                res.setHeader(k, v);
              },
              end() {
                res.end();
              },
            };

            await mod.default(req, vercelRes);
            return;
          } catch (err: any) {
            console.error('[dev-api] Error in /api/admin/platform-config:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Local API error: ${err.message || err}` }));
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    let clean = v;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
      clean = clean.slice(1, -1);
    }
    process.env[k] = clean;
  }

  return {
    plugins: [react(), devApiPlugin()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.NEXT_PUBLIC_GA_ID': JSON.stringify(process.env.NEXT_PUBLIC_GA_ID),
    },
    server: {
      proxy: {
        // NVIDIA API Catalog (dev-only) proxy to avoid browser CORS
        // Use via fetch('/_nvidia/v1/...')
        '/_nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/_nvidia/, ''),
        },
      },
    },
  };
});
