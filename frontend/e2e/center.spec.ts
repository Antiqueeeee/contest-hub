import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import {
  uniqueEmail, createContest, apiRegisterContestant, apiRegisterForContest,
  loginContestant, VALID_ID_A, DEFAULT_PASSWORD,
} from './helpers'

// 对应 docs/bdd/03-个人中心与隐私权利.feature

test.describe('个人中心', () => {
  test('C1: 未绑定选手在个人中心绑定身份证号', async ({ page }) => {
    const email = uniqueEmail('c1')
    await apiRegisterContestant(email, '绑定选手')

    await loginContestant(page, email)
    await page.goto('/me')
    await page.getByRole('button', { name: '账号设置' }).click()
    await expect(page.getByText('未绑定')).toBeVisible()

    await page.getByPlaceholder('输入18位身份证号以绑定').fill(VALID_ID_A)
    await page.getByRole('button', { name: '绑定身份证号' }).click()
    await expect(page.getByText('身份证号保存成功')).toBeVisible()
    await expect(page.getByText('1101****7758')).toBeVisible()
  })

  test('C2: 修改密码——原密码错误被拒，正确流程后新密码可登录', async ({ page }) => {
    const email = uniqueEmail('c2')
    await apiRegisterContestant(email, '改密选手')
    const newPassword = 'NewPass123!'

    await loginContestant(page, email)
    await page.goto('/me')
    await page.getByRole('button', { name: '隐私与安全' }).click()

    // 错误原密码
    await page.getByPlaceholder('请输入原密码').fill('WrongPass1!')
    await page.getByPlaceholder('8-64位，含字母/数字/符号中至少两种').fill(newPassword)
    await page.getByPlaceholder('再次输入新密码').fill(newPassword)
    await page.getByRole('button', { name: '修改密码' }).click()
    await expect(page.getByText('原密码不正确')).toBeVisible()

    // 正确流程
    await page.getByPlaceholder('请输入原密码').fill(DEFAULT_PASSWORD)
    await page.getByRole('button', { name: '修改密码' }).click()
    await expect(page.getByText('密码修改成功')).toBeVisible()

    // 退出后用新密码能登录
    await page.getByText('退出登录', { exact: true }).click()
    await expect(page.getByRole('button', { name: /登录 \/ 注册/ })).toBeVisible()
    await loginContestant(page, email, newPassword)
  })

  test('C4: 已绑定选手在授权管理撤回身份证号同意', async ({ page }) => {
    const email = uniqueEmail('c4')
    const { token } = await apiRegisterContestant(email, '撤回选手')
    const c = await createContest(`C4赛事${Date.now()}`)
    await apiRegisterForContest(c.id, { name: '撤回选手', email, idNumber: VALID_ID_A, token })

    await loginContestant(page, email)
    await page.goto('/me')
    await page.getByRole('button', { name: '隐私与安全' }).click()

    await expect(page.getByText('身份证号收集')).toBeVisible()
    await page.getByRole('button', { name: '撤回' }).click()
    await page.getByRole('button', { name: '确认撤回' }).click()
    await expect(page.getByText(/撤回成功/)).toBeVisible()
    // 授权管理现列出全部同意类型（含未成年人模块两项），断言限定在身份证号行内
    await expect(page.getByText('身份证号收集').locator('..').getByText('未同意')).toBeVisible()
  })

  test('C6: 导出我的数据为 JSON 文件', async ({ page }) => {
    const email = uniqueEmail('c6')
    const { token } = await apiRegisterContestant(email, '导出选手')
    const c = await createContest(`C6赛事${Date.now()}`)
    await apiRegisterForContest(c.id, { name: '导出选手', email, idNumber: VALID_ID_A, token })

    await loginContestant(page, email)
    await page.goto('/me')
    await page.getByRole('button', { name: '隐私与安全' }).click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出 JSON 文件' }).click(),
    ])
    const path = await download.path()
    const data = JSON.parse(readFileSync(path!, 'utf-8'))
    expect(data.profile).toBeTruthy()
    expect(data.profile.email).toBe(email)
    expect(Array.isArray(data.registrations)).toBe(true)
    expect(data.registrations.length).toBeGreaterThan(0)
  })

  test('C7: 注销账号后退出登录，原邮箱无法再登录', async ({ page }) => {
    const email = uniqueEmail('c7')
    await apiRegisterContestant(email, '注销选手')

    await loginContestant(page, email)
    await page.goto('/me')
    await page.getByRole('button', { name: '隐私与安全' }).click()

    page.on('dialog', d => d.accept())
    await page.getByPlaceholder('输入密码以确认注销').fill(DEFAULT_PASSWORD)
    await page.getByRole('button', { name: '确认注销账号' }).click()
    // 注销后回到未登录状态
    await expect(page.getByRole('button', { name: /登录 \/ 注册/ })).toBeVisible()

    // 原邮箱登录提示失败
    await page.goto('/login')
    await page.getByPlaceholder('请输入注册邮箱').fill(email)
    await page.getByPlaceholder('请输入密码').fill(DEFAULT_PASSWORD)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    // 注销后邮箱已匿名化，查无此账号
    await expect(page.getByText(/该账号已注销|邮箱未注册/)).toBeVisible()
  })
})
