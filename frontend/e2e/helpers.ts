import { expect, type Page } from '@playwright/test'

export const API = 'http://localhost:8000/api'
export const VALID_ID_A = '110101199003077758'
export const VALID_ID_B = '320102199505124329'
export const DEFAULT_PASSWORD = 'Passw0rd!'

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
}

/**
 * base-ui Checkbox 的可视交互元素是 <span role="checkbox">，
 * 传入的 id 会落在隐藏的 <input type="checkbox"> 上（不可点击）。
 * 通过「label[for=id] 的兄弟 span」定位可点击的勾选框。
 */
export function checkboxRoot(page: Page, id: string) {
  return page.locator(`div:has(> label[for="${id}"]) > span[role="checkbox"]`)
}

interface ApiOptions {
  method?: string
  token?: string
  body?: unknown
}

/** 数据固件专用 API 客户端（仅限 setup，不代替浏览器测试动作）。429 时退避重试。 */
export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = opts
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 8000))
      continue
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`)
    return (res.status === 204 ? null : await res.json()) as T
  }
  throw new Error(`${method} ${path} -> 持续 429，重试耗尽`)
}

let cachedAdminToken: string | null = null

export async function adminToken(): Promise<string> {
  if (cachedAdminToken) return cachedAdminToken
  const r = await apiFetch<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin123!' },
  })
  cachedAdminToken = r.access_token
  return cachedAdminToken
}

/** 创建报名窗口覆盖当前时间的赛事；若初始状态不是 open 则走状态接口置为 open。 */
export async function createContest(title: string): Promise<{ id: number; title: string }> {
  const token = await adminToken()
  const now = Date.now()
  // 后端按赛事时区解析 naive 本地时间（不能带 Z，否则 aware/naive 混比报 500）
  const naiveLocal = (t: number) => {
    const d = new Date(t)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }
  const c = await apiFetch<{ id: number; title: string; status: string }>('/admin/contests', {
    method: 'POST',
    token,
    body: {
      title,
      start_date: new Date(now - 86_400_000).toISOString().slice(0, 10),
      end_date: new Date(now + 30 * 86_400_000).toISOString().slice(0, 10),
      registration_start: naiveLocal(now - 3_600_000),
      registration_end: naiveLocal(now + 7 * 86_400_000),
    },
  })
  if (c.status !== 'open') {
    await apiFetch(`/admin/contests/${c.id}/status?status=open`, { method: 'PATCH', token })
  }
  return { id: c.id, title: c.title }
}

/** API 注册选手（固件），返回登录 token。 */
export async function apiRegisterContestant(
  email: string,
  name: string,
  password = DEFAULT_PASSWORD,
): Promise<{ token: string }> {
  const r = await apiFetch<{ access_token: string }>('/auth/contestant/register', {
    method: 'POST',
    body: { email, password, name, privacy_agreed: true },
  })
  return { token: r.access_token }
}

/** API 报名（固件）。带 token 则为账号报名（绑定身份证），不带则为匿名报名。 */
export async function apiRegisterForContest(
  contestId: number,
  opts: { name: string; email: string; idNumber?: string; token?: string },
): Promise<{ id: number; registration_number: string }> {
  return apiFetch(`/public/contests/${contestId}/register`, {
    method: 'POST',
    token: opts.token,
    body: {
      contest_id: contestId,
      name: opts.name,
      email: opts.email,
      privacy_agreed: true,
      ...(opts.idNumber ? { id_number: opts.idNumber, id_number_agreed: true } : {}),
    },
  })
}

/** 浏览器端选手登录（限流 429 时等待窗口滑动后重试）。 */
export async function loginContestant(page: Page, email: string, password = DEFAULT_PASSWORD) {
  await page.goto('/login')
  await page.getByPlaceholder('请输入注册邮箱').fill(email)
  await page.getByPlaceholder('请输入密码').fill(password)
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByRole('button', { name: '登录', exact: true }).click()
    const outcome = await Promise.race([
      page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 10_000 }).then(() => 'ok' as const),
      page.getByText('请求过于频繁').waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'limited' as const),
    ]).catch(() => 'timeout' as const)
    if (outcome === 'ok') break
    if (outcome === 'timeout') throw new Error(`选手登录未成功跳转：${email}`)
    await page.waitForTimeout(10_000)
  }
  await expect(page.getByRole('link', { name: '个人中心' })).toBeVisible()
}

/** 浏览器端管理员登录。 */
export async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.locator('#username').fill('admin')
  await page.locator('#password').fill('Admin123!')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  // 注意不能用 startsWith('/admin/')——/admin/login 本身会提前命中
  await page.waitForURL(url => url.pathname === '/admin', { timeout: 10_000 })
}
