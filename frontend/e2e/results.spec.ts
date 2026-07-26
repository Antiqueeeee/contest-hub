import { test, expect } from '@playwright/test'
import {
  uniqueEmail, createContest, apiRegisterContestant, apiRegisterForContest,
  loginContestant, adminToken, apiFetch, VALID_ID_A,
} from './helpers'

// 对应 docs/bdd/04-成绩查询.feature

test.describe('成绩查询', () => {
  // 位于套件末尾，易撞上 contestant_login 限流窗口（10 次/60s），loginContestant 会退避重试，故放宽超时
  test.setTimeout(90_000)

  test('S1: 成绩发布后选手在个人中心可见分数', async ({ page }) => {
    const email = uniqueEmail('s1')
    const { token } = await apiRegisterContestant(email, '成绩选手')
    const c = await createContest(`S1赛事${Date.now()}`)
    const reg = await apiRegisterForContest(c.id, { name: '成绩选手', email, idNumber: VALID_ID_A, token })

    // 成绩只能录入已结束的赛事：open → ongoing → finished
    const tokenAdmin = await adminToken()
    await apiFetch(`/admin/contests/${c.id}/status?status=ongoing`, { method: 'PATCH', token: tokenAdmin })
    await apiFetch(`/admin/contests/${c.id}/status?status=finished`, { method: 'PATCH', token: tokenAdmin })
    // 管理员录入成绩并发布（固件）
    const result = await apiFetch<{ id: number }>('/admin/results', {
      method: 'POST',
      token: tokenAdmin,
      body: { contest_id: c.id, registration_id: reg.id, scores: { 客观题得分: 95 }, total_score: 95 },
    })
    await apiFetch(`/admin/results/${result.id}/publish`, { method: 'PATCH', token: tokenAdmin })

    await loginContestant(page, email)
    await page.goto('/me')
    const row = page.getByRole('row').filter({ hasText: c.title })
    await expect(row).toBeVisible()
    await expect(row.getByText('95')).toBeVisible()
  })
})
