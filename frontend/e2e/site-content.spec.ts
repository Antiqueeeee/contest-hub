import { test, expect } from '@playwright/test'
import { adminToken, apiFetch } from './helpers'

// 站点内容页（关于我们/联系我们等）前台排版回归。
// 背景：2026-08 线上事故——前台页面只挂了 prose 类但项目未启用 typography 插件，
// 后台编辑器预览有格式，前台页面却渲染成纯文本。本组用例锁定「后台所见 = 前台所得」。
test.describe('站点内容页排版', () => {
  test('S1: 默认模板在前台渲染时标题/列表格式生效', async ({ page }) => {
    await page.goto('/about')
    const h1 = page.locator('.prose h1')
    await expect(h1).toHaveText('关于我们')
    // prose-sm h1 ≈ 2.14em（约 34px）；排版失效时会被 preflight 重置为 16px 正文大小
    const fontSize = await h1.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(fontSize).toBeGreaterThan(20)
    const listStyle = await page.locator('.prose ul').first().evaluate(el => getComputedStyle(el).listStyleType)
    expect(listStyle).toBe('disc')
  })

  test('S2: 后台保存「联系我们」结构化内容后，前台渲染联系人卡片且提示区格式生效', async ({ page }) => {
    const marker = `咨询提示-${Date.now()}`
    // 与 SiteContentPage 保存逻辑一致：contact 页存结构化 JSON，tips 为富文本 HTML
    await apiFetch('/admin/site-content/contact', {
      method: 'PUT',
      token: await adminToken(),
      body: {
        content: JSON.stringify({
          intro: '如有赛事问题欢迎联系。',
          contacts: [{ name: '王老师', role: '报名咨询', phone: '138-0000-1111' }],
          supervision_phone: '0311-12345678',
          email: 'service@example.com',
          address: '石家庄市测试路 1 号',
          work_hours: '周一至周五 9:00 — 18:00',
          tips: `<p>来电请<strong>说明姓名</strong>与所在学校。</p><h2>${marker}</h2>`,
        }),
      },
    })
    await page.goto('/contact')

    // 结构化字段：联系人卡片与可点击的电话/邮箱
    await expect(page.getByText('王老师')).toBeVisible()
    await expect(page.getByText('报名咨询')).toBeVisible()
    await expect(page.getByRole('link', { name: '138-0000-1111' })).toHaveAttribute('href', 'tel:13800001111')
    await expect(page.getByRole('link', { name: 'service@example.com' })).toHaveAttribute('href', 'mailto:service@example.com')

    // 提示区排版（prose）：标题字号与加粗生效；排版失效时 h2 会被重置为 16px 正文大小
    const tipsSection = page.locator('section', { hasText: '咨询提示' })
    await expect(tipsSection.locator('strong')).toHaveText('说明姓名')
    const h2 = tipsSection.locator('h2', { hasText: marker })
    await expect(h2).toBeVisible()
    expect(await h2.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(18)
  })
})
