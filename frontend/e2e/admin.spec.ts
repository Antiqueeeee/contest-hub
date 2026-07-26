import { test, expect } from '@playwright/test'
import {
  uniqueEmail, createContest, apiRegisterContestant, apiRegisterForContest,
  loginAdmin, VALID_ID_A,
} from './helpers'

// 对应 docs/bdd/05-后台管理.feature、06-合规与安全.feature

test.describe('后台管理与合规', () => {
  test('A1: 报名管理列表可见选手报名，身份证为脱敏形式', async ({ page }) => {
    const email = uniqueEmail('a1')
    const name = `脱敏选手${Math.random().toString(36).slice(2, 6)}`
    const { token } = await apiRegisterContestant(email, name)
    const c = await createContest(`A1赛事${Date.now()}`)
    await apiRegisterForContest(c.id, { name, email, idNumber: VALID_ID_A, token })

    await loginAdmin(page)
    await page.goto('/admin/registrations')
    const row = page.getByRole('row').filter({ hasText: name })
    await expect(row).toBeVisible()
    // 打开报名详情，身份证号应为脱敏形式（含 ****）
    await row.getByRole('button').first().click()
    await expect(page.getByText('1101****7758')).toBeVisible()
  })

  test('A5: 系统设置页修改导出保留天数为 3', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/settings')
    await expect(page.getByText('数据保留策略')).toBeVisible()

    const exportInput = page.getByText('导出文件在服务器上的保留天数').locator('..').getByRole('spinbutton')
    await exportInput.fill('3')
    await page.getByRole('button', { name: '保存设置' }).click()
    await expect(page.getByText('保存成功')).toBeVisible()
  })

  test('P1: 首页页脚可进入隐私政策页且有内容', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: '隐私政策' }).click()
    await page.waitForURL('**/privacy')
    await expect(page.getByRole('heading', { name: '隐私政策' })).toBeVisible()
    await expect(page.getByText('敏感个人信息').first()).toBeVisible()
  })

  test('P6: 页面响应头包含安全响应头', async ({ page }) => {
    const resp = await page.goto('/')
    const headers = resp!.headers()
    expect(headers['content-security-policy']).toBeTruthy()
    expect(headers['x-frame-options']).toBeTruthy()
  })
})
