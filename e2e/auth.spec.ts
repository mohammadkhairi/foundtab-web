import { test, expect } from '@playwright/test'

test.describe('Unauthenticated pages', () => {
  test('sign-in page loads with FoundTab heading', async ({ page }) => {
    await page.goto('/sign-in')
    await page.waitForLoadState('domcontentloaded')
    const title = await page.title()
    expect(title).toContain('FoundTab')
    const heading = page.locator('h1', { hasText: 'FoundTab' })
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('sign-up page loads with FoundTab heading', async ({ page }) => {
    await page.goto('/sign-up')
    await page.waitForLoadState('domcontentloaded')
    const title = await page.title()
    expect(title).toContain('FoundTab')
    const heading = page.locator('h1', { hasText: 'FoundTab' })
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('root path redirects unauthenticated user to /sign-in', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/sign-in**', { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })

  test('/dashboard redirects unauthenticated user to /sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/sign-in**', { timeout: 15_000 })
    expect(page.url()).toContain('/sign-in')
  })
})
