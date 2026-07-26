import { test, expect } from '@playwright/test'
import {
  uniqueEmail, createContest, apiRegisterContestant, apiRegisterForContest,
  loginContestant, checkboxRoot, VALID_ID_A, VALID_ID_B,
} from './helpers'

// 对应 docs/bdd/02-赛事报名.feature

test.describe('赛事报名', () => {
  test('B1: 匿名打开报名页显示身份证输入框、敏感提示，两个勾选框默认未勾', async ({ page }) => {
    const c = await createContest(`B1赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await expect(page.getByPlaceholder('18位身份证号码')).toBeVisible()
    await expect(page.getByText('您的身份证号属于敏感个人信息，仅用于赛事报名核验，不会公开')).toBeVisible()
    await expect(checkboxRoot(page, 'idNumberAgreed')).toBeVisible()
    await expect(checkboxRoot(page, 'idNumberAgreed')).not.toBeChecked()
    await expect(checkboxRoot(page, 'privacy')).toBeVisible()
    await expect(checkboxRoot(page, 'privacy')).not.toBeChecked()
  })

  test('B7: 未勾选隐私政策无法报名', async ({ page }) => {
    const c = await createContest(`B7赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await page.getByPlaceholder('请输入真实姓名').fill('匿名选手')
    await page.getByPlaceholder('请输入邮箱地址').fill(uniqueEmail('b7'))
    await page.getByPlaceholder('18位身份证号码').fill(VALID_ID_A)
    await checkboxRoot(page, 'idNumberAgreed').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await expect(page.getByText('请阅读并同意隐私政策')).toBeVisible()
  })

  test('B3: 匿名完整报名成功并显示报名编号', async ({ page }) => {
    const c = await createContest(`B3赛事${Date.now()}`)
    await page.goto(`/contests/${c.id}/register`)

    await page.getByPlaceholder('请输入真实姓名').fill('匿名选手')
    await page.getByPlaceholder('请输入邮箱地址').fill(uniqueEmail('b3'))
    await page.getByPlaceholder('18位身份证号码').fill(VALID_ID_A)
    await checkboxRoot(page, 'idNumberAgreed').click()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()

    await page.waitForURL(`**/contests/${c.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()
    await expect(page.getByText('您的报名编号', { exact: true })).toBeVisible()
    await expect(page.locator('span.font-mono')).not.toHaveText('未知')
  })

  test('B4+B5: 登录选手首次报名绑定身份证，再次报名免填身份证', async ({ page }) => {
    const email = uniqueEmail('b45')
    await apiRegisterContestant(email, '绑定选手')
    const c1 = await createContest(`B4赛事${Date.now()}`)
    const c2 = await createContest(`B5赛事${Date.now()}`)

    await loginContestant(page, email)

    // B4：未绑定账号首次报名——填写身份证并单独同意
    await page.goto(`/contests/${c1.id}/register`)
    await expect(page.getByPlaceholder('18位身份证号码')).toBeVisible()
    await page.getByPlaceholder('18位身份证号码').fill(VALID_ID_A)
    await checkboxRoot(page, 'idNumberAgreed').click()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await page.waitForURL(`**/contests/${c1.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()

    // B5：已绑定账号再次报名——显示脱敏确认文字，无输入框
    await page.goto(`/contests/${c2.id}/register`)
    await expect(page.getByText(/身份证号：1101\*\*\*\*7758（使用账号绑定的身份证信息参赛）/)).toBeVisible()
    await expect(page.getByPlaceholder('18位身份证号码')).toHaveCount(0)
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await page.waitForURL(`**/contests/${c2.id}/register/success`)
    await expect(page.getByText('报名成功！')).toBeVisible()
  })

  test('B6: 同一账号重复报名同一赛事被拒绝', async ({ page }) => {
    const email = uniqueEmail('b6')
    const { token } = await apiRegisterContestant(email, '重复选手')
    const c1 = await createContest(`B6赛事${Date.now()}`)
    await apiRegisterForContest(c1.id, { name: '重复选手', email, idNumber: VALID_ID_B, token })

    let dialogMessage = ''
    page.on('dialog', async d => { dialogMessage = d.message(); await d.accept() })

    await loginContestant(page, email)
    await page.goto(`/contests/${c1.id}/register`)
    await expect(page.getByText(/使用账号绑定的身份证信息参赛/)).toBeVisible()
    await checkboxRoot(page, 'privacy').click()
    await page.getByRole('button', { name: '提交报名' }).click()
    await expect.poll(() => dialogMessage).toContain('报名')
  })
})
