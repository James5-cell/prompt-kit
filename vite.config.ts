import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
      // Proxy backend API requests to Vercel dev server to preserve IndexedDB data on 5173
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
