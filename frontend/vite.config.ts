import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
// e2e 后端地址可配（与 frontend/e2e/helpers.ts 的 E2E_API 保持一致）：
// 显式 E2E_API_ORIGIN 优先，否则从 E2E_API 推导 origin，默认 :8000（e2e-env.sh）
const e2eApiOrigin =
  process.env.E2E_API_ORIGIN ||
  (process.env.E2E_API ? new URL(process.env.E2E_API).origin : 'http://localhost:8000')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  preview: {
    // 与生产 nginx.conf 的安全响应头保持一致（connect-src/img-src 额外放行 e2e 后端来源）
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${e2eApiOrigin}; font-src 'self' data:; connect-src 'self' ${e2eApiOrigin}; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    },
  },
})
