import { test, expect } from '@playwright/test'
import { uniqueEmail, apiRegisterContestant, loginContestant } from './helpers'

// 对应 docs/bdd/01-选手注册与登录.feature

test.describe('选手登录', () => {
  test('R6: 已注册选手登录成功进入个人中心', async ({ page }) => {
    const email = uniqueEmail('r6')
    await apiRegisterContestant(email, '登录选手')

    await loginContestant(page, email)
    await page.goto('/me')
    await expect(page.getByRole('heading', { name: '登录选手' })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })
})
