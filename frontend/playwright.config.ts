import { defineConfig } from '@playwright/test'
import { homedir } from 'os'

// e2e 环境（Ubuntu 22.04 无 root）缺少 libnspr4/libnss3，已用 dpkg -x 解包到用户目录，
// 通过 LD_LIBRARY_PATH 提供给 chromium 子进程。
process.env.LD_LIBRARY_PATH = [
  `${homedir()}/.local/playwright-libs/usr/lib/x86_64-linux-gnu`,
  process.env.LD_LIBRARY_PATH,
].filter(Boolean).join(':')

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
})
