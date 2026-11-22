import { expect, type Page } from '@playwright/test'

export const TEST_EMAIL = process.env.TEST_EMAIL ?? 'e2e-test@foundtab.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ''

async function doLogin(page: Page) {
  await page.goto('/sign-in')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 20_000 })
}

export async function signIn(page: Page) {
  await doLogin(page)
  await page.evaluate(() => localStorage.setItem('ft-onboarding-done', '1'))
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

export async function signInOnly(page: Page) {
  await doLogin(page)
}

type ModuleOverride = Partial<{
  flagEnabled: boolean
  tierAccessible: boolean
  accessible: boolean
}>

export function buildFlagsResponse(overrides: Record<string, ModuleOverride> = {}) {
  const defaults = [
    { key: 'dashboard',    label: 'Summary Dashboard', requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'purchases',    label: 'Purchases',          requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'rawMaterials', label: 'Raw Materials',      requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'products',     label: 'Products / SKU',     requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'recipes',      label: 'Recipes / Costing',  requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'orders',       label: 'Orders / Sales',     requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'productions',  label: 'Productions',        requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
    { key: 'wastageReport',label: 'Wastage Report',     requiredTier: 'GROWTH',  flagEnabled: true,  tierAccessible: false, accessible: false },
  ]
  return {
    plan: 'STARTER' as const,
    modules: defaults.map((mod) => ({ ...mod, ...(overrides[mod.key] ?? {}) })),
  }
}
