import { test, expect } from '@playwright/test'
import { signIn, buildFlagsResponse } from './helpers'

// Intercepts the main flags endpoint and returns a mock response.
// The /version endpoint is left unintercepted so it doesn't break the version poller.
function mockFlags(page: Parameters<typeof signIn>[0], overrides: Parameters<typeof buildFlagsResponse>[0] = {}) {
  return page.route('**/api/v1/feature-flags', (route) => {
    if (route.request().url().includes('/version')) return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildFlagsResponse(overrides)),
    })
  })
}

test.describe('Feature flag gating — portal effects on the app', () => {
  test.setTimeout(60_000)

  test('globally disabled module redirects to /dashboard', async ({ page }) => {
    // flagEnabled: false means portal kill-switch is OFF → not locked, just hidden
    await mockFlags(page, { recipes: { flagEnabled: false, tierAccessible: true, accessible: false } })
    await signIn(page)

    await page.goto('/recipes')
    // ModuleGate: !isAccessible && !isLocked → /dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10_000 })
    expect(page.url()).toContain('/dashboard')
    await page.screenshot({ path: '/tmp/e2e-flags-disabled.png', fullPage: true })
  })

  test('plan-locked module redirects to /billing', async ({ page }) => {
    // flagEnabled: true but plan tier too low → locked
    await mockFlags(page, { recipes: { flagEnabled: true, tierAccessible: false, accessible: false } })
    await signIn(page)

    await page.goto('/recipes')
    // ModuleGate: isLocked → /billing
    await page.waitForURL('**/billing**', { timeout: 10_000 })
    expect(page.url()).toContain('/billing')
    await page.screenshot({ path: '/tmp/e2e-flags-locked.png', fullPage: true })
  })

  test('billing page is always accessible regardless of locked modules', async ({ page }) => {
    // Even with many modules locked, billing must be reachable (it has no ModuleGate)
    await mockFlags(page, {
      recipes:      { flagEnabled: true, tierAccessible: false, accessible: false },
      orders:       { flagEnabled: true, tierAccessible: false, accessible: false },
      productions:  { flagEnabled: true, tierAccessible: false, accessible: false },
    })
    await signIn(page)

    await page.goto('/billing')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/billing')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-flags-billing-accessible.png', fullPage: true })
  })

  test('accessible module renders its page without redirect', async ({ page }) => {
    await mockFlags(page) // all defaults, everything accessible
    await signIn(page)

    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/orders')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-flags-orders-ok.png', fullPage: true })
  })

  test('dashboard module is always required — disabling it still loads something', async ({ page }) => {
    // Dashboard is the redirect target for disabled modules, so if it's also disabled
    // the app would loop. Verify the app doesn't crash in this edge case.
    await mockFlags(page, { dashboard: { flagEnabled: false, tierAccessible: true, accessible: false } })
    await signIn(page)

    // After sign-in lands on /dashboard, ModuleGate fires, tries to redirect to /dashboard again
    // The app should not crash with an infinite loop or white screen
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Internal server error')
    await page.screenshot({ path: '/tmp/e2e-flags-dashboard-disabled.png', fullPage: true })
  })
})
