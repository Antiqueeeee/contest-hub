import { test, expect } from '@playwright/test'
import { uniqueEmail, DEFAULT_PASSWORD, checkboxRoot, setRegistrationEnabled } from './helpers'

// 对应 docs/bdd/01-选手注册与登录.feature

test.describe('选手注册', () => {
  test('R1: 注册页不收集身份证号，隐私政策勾选默认未勾且带链接', async ({ page }) => {
    await page.goto('/register')
    // 无身份证号输入框
    await expect(page.getByPlaceholder('18位身份证号码')).toHaveCount(0)
    await expect(page.getByText('身份证号', { exact: true })).toHaveCount(0)
    // 隐私政策勾选框默认未勾选
    const privacy = checkboxRoot(page, 'privacy')
    await expect(privacy).toBeVisible()
    await expect(privacy).not.toBeChecked()
    // 「《隐私政策》」链接存在并指向 /privacy
    const link = page.getByRole('link', { name: '《隐私政策》' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/privacy')
  })

  test('R2: 未勾选隐私政策无法注册', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('用于登录和接收通知').fill(uniqueEmail('r2'))
    await page.getByPlaceholder('报名和成绩单上显示的名称').fill('测试选手')
    await page.getByPlaceholder('8-64位，含字母/数字/符号中至少两种').fill(DEFAULT_PASSWORD)
    await page.getByRole('button', { name: '注册', exact: true }).click()
    await expect(page.getByText('请先阅读并同意《隐私政策》')).toBeVisible()
  })

  test('R3: 弱密码（单一字符类型）无法注册', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('用于登录和接收通知').fill(uniqueEmail('r3'))
    await page.getByPlaceholder('报名和成绩单上显示的名称').fill('测试选手')
    await page.getByPlaceholder('8-64位，含字母/数字/符号中至少两种').fill('aaaaaaaa')
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '注册', exact: true }).click()
    await expect(page.getByText('密码需8-64位，且包含大写字母/小写字母/数字/符号中至少两种')).toBeVisible()
  })

  test('R4: 完整填写并勾选隐私政策后注册成功并自动登录', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('用于登录和接收通知').fill(uniqueEmail('r4'))
    await page.getByPlaceholder('报名和成绩单上显示的名称').fill('测试选手')
    await page.getByPlaceholder('8-64位，含字母/数字/符号中至少两种').fill(DEFAULT_PASSWORD)
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '注册', exact: true }).click()
    // 注册成功进入已登录状态
    await expect(page.getByRole('link', { name: '个人中心' })).toBeVisible()
    await expect(page.getByTitle('退出登录')).toBeVisible()
  })

  test('R5: 关闭注册开关后前台显示未开放提示，重新开启后恢复', async ({ page }) => {
    await setRegistrationEnabled(false)
    try {
      await page.goto('/register')
      await expect(page.getByText('注册暂未开放')).toBeVisible()
      await expect(page.getByPlaceholder('用于登录和接收通知')).toHaveCount(0)
    } finally {
      // 无论断言成败都恢复开关，避免连锁影响其他 spec（registration/minor/results 都依赖注册）
      await setRegistrationEnabled(true)
    }
    await page.goto('/register')
    await expect(page.getByPlaceholder('用于登录和接收通知')).toBeVisible()
  })
})
