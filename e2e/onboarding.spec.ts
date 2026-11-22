import { test, expect } from '@playwright/test'
import { signInOnly } from './helpers'

test.describe('Onboarding flow', () => {
  test.setTimeout(60_000)

  test('unauthenticated user is redirected to /sign-in when visiting /onboarding', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForURL('**/sign-in**', { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })

  test('signed-in user without onboarding flag is redirected to /onboarding from /', async ({ page }) => {
    await signInOnly(page)
    await page.evaluate(() => localStorage.removeItem('ft-onboarding-done'))
    await page.goto('/')
    await page.waitForURL('**/onboarding**', { timeout: 15_000 })
    expect(page.url()).toContain('/onboarding')
    await page.screenshot({ path: '/tmp/e2e-onboarding-redirect.png', fullPage: true })
  })

  test('language step shows English and Bahasa Melayu as choices', async ({ page }) => {
    await signInOnly(page)
    await page.evaluate(() => localStorage.removeItem('ft-onboarding-done'))
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toContainText('English')
    await expect(page.locator('body')).toContainText('Bahasa Melayu')
    await page.screenshot({ path: '/tmp/e2e-onboarding-lang.png', fullPage: true })
  })

  test('org step blocks submission when business name is empty', async ({ page }) => {
    await signInOnly(page)
    await page.evaluate(() => localStorage.removeItem('ft-onboarding-done'))
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1 — click English to advance to org step
    await page.locator('button', { hasText: 'English' }).click()
    await page.waitForLoadState('networkidle')

    // Step 2 — submit without filling business name
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('body')).toContainText('Business name is required')
    await page.screenshot({ path: '/tmp/e2e-onboarding-org-validation.png', fullPage: true })
  })

  test('full onboarding flow — lang → org → pwa skip → notifications skip → /dashboard', async ({ page }) => {
    await signInOnly(page)

    await page.evaluate(() => localStorage.removeItem('ft-onboarding-done'))

    // Org already exists for the test account — mock returns success so the form proceeds
    await page.route('**/api/v1/orgs', (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-org-id', name: 'My Test Bakery' }),
      })
    })

    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // Step 1 — select English
    await page.locator('button', { hasText: 'English' }).click()

    // Step 2 — fill business name and continue
    await page.locator('#org-name').fill('My Test Bakery')
    await page.locator('button[type="submit"]').click()

    // Step 3 — PWA installation, skip
    await page.locator('button', { hasText: 'Skip for now' }).first().click()

    // Step 4 — Notifications, decline
    await page.locator('button', { hasText: 'No thanks' }).click()

    await page.waitForURL('**/dashboard**', { timeout: 15_000 })
    expect(page.url()).toContain('/dashboard')
    await page.screenshot({ path: '/tmp/e2e-onboarding-complete.png', fullPage: true })
  })
})
