import { test, expect } from '@playwright/test'
import { adminToken, apiFetch, uploadImage } from './helpers'

// 首页轮播图「模糊→清晰」渐进加载回归：
// 后端按需生成 24px 模糊占位图，前台先显示占位、原图加载完成后淡入。
// 同时锁定 e2e 环境下原图 src 的 origin 解析（相对 /uploads/ 会 404）。

test.describe('首页轮播图渐进加载', () => {
  test('C1: 上传图片建轮播图，首页渲染占位图与原图并完成淡入', async ({ page }) => {
    const token = await adminToken()

    // 先清掉已有轮播图，保证新 slide 是第 0 张（eager 加载，避免 lazy 离屏图不加载的抖动）
    const existing = await apiFetch<{ items: { id: number }[] }>('/admin/carousel', { token })
    for (const item of existing.items || []) {
      await apiFetch(`/admin/carousel/${item.id}`, { method: 'DELETE', token })
    }

    const title = `渐进加载测试-${Date.now()}`
    let slideId: number | null = null
    try {
      // 上传 1x1 PNG → 建 slide（image_url 为后端返回的相对 /uploads/ 路径）
      const { url } = await uploadImage(token)
      const slide = await apiFetch<{ id: number }>('/admin/carousel', {
        method: 'POST',
        token,
        body: { title, image_url: url, link_url: '', sort_order: 0, is_active: true },
      })
      slideId = slide.id

      await page.goto('/')
      await expect(page.locator('[aria-roledescription="carousel"]')).toBeVisible()

      // 原图：src 必须解析到 API origin（e2e 构建 VITE_API_BASE 为绝对地址）
      const fullImg = page.locator(`img[alt="${title}"]`)
      await expect(fullImg).toHaveAttribute('src', /^http:\/\/localhost:8000\/uploads\//)

      // 占位图：同 slide 内的 aria-hidden 图层，真实加载成功
      const blurImg = page.locator(`[aria-roledescription="carousel"] img[aria-hidden="true"]`)
      await expect(blurImg).toHaveAttribute('src', /\/public\/uploads-blur\//)
      await expect.poll(async () => blurImg.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)

      // 淡入完成：原图 opacity 过渡到 1
      await expect(fullImg).toHaveCSS('opacity', '1')

      // 占位图接口本身返回 200 + image/jpeg
      const blurSrc = await blurImg.getAttribute('src')
      const res = await page.request.get(blurSrc!)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toBe('image/jpeg')
    } finally {
      if (slideId) await apiFetch(`/admin/carousel/${slideId}`, { method: 'DELETE', token })
    }
  })
})
