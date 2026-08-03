import { test, expect } from '@playwright/test'
import {
  uniqueEmail, createContest, createMinorContest, enableMinorProtection,
  apiRegisterContestant, apiRegisterForContest, loginContestant,
  checkboxRoot, VALID_ID_A,
} from './helpers'

// 对应 docs/bdd/07-未成年人保护.feature（@M1/M2/M3/M4/M10 的浏览器流程）

function birthYearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

test.describe('未成年人保护（可选启用）', () => {
  test('M1: 系统开关关闭时，赛事报名与常规完全一致', async ({ page }) => {
    const c = await createContest(`M1赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await expect(page.getByPlaceholder('18位身份证号码')).toBeVisible()
    await expect(page.locator('input[type="date"]')).toHaveCount(0)
    await expect(page.getByText('监护人姓名')).toHaveCount(0)
  })

  test('M2: 开关开启但赛事未声明面向未成年人，流程不变', async ({ page }) => {
    await enableMinorProtection()
    const c = await createContest(`M2赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await expect(page.getByPlaceholder('18位身份证号码')).toBeVisible()
    await expect(page.locator('input[type="date"]')).toHaveCount(0)
    await expect(page.getByText('本赛事面向未成年人')).toHaveCount(0)
  })

  test('M4: 14 周岁以下报名需监护人同意', async ({ page }) => {
    await enableMinorProtection()
    const c = await createMinorContest(`M4赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    // 出现出生日期输入与提示
    await expect(page.getByText('本赛事面向未成年人，报名需确认年龄')).toBeVisible()
    await page.locator('input[type="date"]').fill(birthYearsAgo(10))
    await expect(page.getByText('监护人姓名')).toBeVisible()
    await expect(page.getByText('14 周岁以下选手需监护人同意')).toBeVisible()

    // 未勾选监护人同意提交 → 前端拦截
    await page.getByPlaceholder('请输入真实姓名').fill('小选手')
    await page.getByPlaceholder('请输入邮箱地址').fill(uniqueEmail('m4'))
    await page.getByPlaceholder('18位身份证号码').fill(VALID_ID_A)
    await checkboxRoot(page, 'idNumberAgreed').click()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await expect(page.getByText('14周岁以下选手报名须征得监护人同意')).toBeVisible()

    // 补齐监护人信息与同意后提交成功
    await page.getByPlaceholder('监护人真实姓名').fill('家长甲')
    await page.getByPlaceholder('联系电话或邮箱').fill('13800000000')
    await checkboxRoot(page, 'guardianAgreed').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await page.waitForURL(`**/contests/${c.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()
  })

  test('M3: 14-18 周岁需勾选「已满 14 周岁」声明', async ({ page }) => {
    await enableMinorProtection()
    const c = await createMinorContest(`M3赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await page.locator('input[type="date"]').fill(birthYearsAgo(16))
    await expect(page.getByText('我确认本人已满 14 周岁')).toBeVisible()

    // 未勾选声明提交 → 前端拦截
    await page.getByPlaceholder('请输入真实姓名').fill('少年选手')
    await page.getByPlaceholder('请输入邮箱地址').fill(uniqueEmail('m3'))
    await page.getByPlaceholder('18位身份证号码').fill(VALID_ID_A)
    await checkboxRoot(page, 'idNumberAgreed').click()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await expect(page.getByText('请勾选确认本人已满 14 周岁')).toBeVisible()

    // 勾选声明后提交成功
    await checkboxRoot(page, 'minorStatement').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await page.waitForURL(`**/contests/${c.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()
  })

  test('M10: 开关开启时隐私政策包含儿童个人信息保护章节', async ({ page }) => {
    await enableMinorProtection()
    await page.goto('/privacy')
    await expect(page.getByText('儿童个人信息保护')).toBeVisible()
    await expect(page.getByText('14 周岁以下的儿童，我们仅在取得其监护人同意后收集')).toBeVisible()
  })

  test('M8: 账号已绑定出生日期的选手再次报名无需重复填写', async ({ page }) => {
    await enableMinorProtection()
    const email = uniqueEmail('m8')
    const { token } = await apiRegisterContestant(email, '绑定选手')
    const c1 = await createMinorContest(`M8赛事1${Date.now()}`)
    await apiRegisterForContest(c1.id, {
      name: '绑定选手', email, idNumber: VALID_ID_A, token,
      birthDate: birthYearsAgo(16), minorStatementAgreed: true,
    })
    const c2 = await createMinorContest(`M8赛事2${Date.now()}`)

    await loginContestant(page, email)
    await page.goto(`/contests/${c2.id}/register`)
    // 出生日期不重复填写：显示脱敏确认信息，无出生日期输入框
    await expect(page.getByText(/使用账号已绑定的出生日期/)).toBeVisible()
    await expect(page.locator('input[type="date"]')).toHaveCount(0)
    // 16 岁 → 只需「已满 14 周岁」声明
    await expect(page.getByText('我确认本人已满 14 周岁')).toBeVisible()
    await checkboxRoot(page, 'minorStatement').click()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await page.waitForURL(`**/contests/${c2.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()
  })
})
