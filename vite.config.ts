/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import sri from 'vite-plugin-sri'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'
  return {
    base: env.VITE_BASE_PATH || '/Aravadistillery---CRM/',
    plugins: [
      // Block access to .git and .env in dev server
      {
        name: 'block-sensitive-paths',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && /\/\.git(\/|$)|\/\.env(\.|$)/.test(req.url)) {
              _res.statusCode = 403
              _res.end('Forbidden')
              return
            }
            next()
          })
        },
      },
      react(),
      ...(isProd ? [sri()] : []),
    ],
    build: {
      esbuild: {
        drop: isProd ? ['debugger', 'console'] : [],
      },
    },
    server: {
      fs: {
        deny: ['.git', '.env', '.env.*'],
      },
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      },
    },
  }
})
