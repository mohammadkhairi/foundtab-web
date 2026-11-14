import { type Page } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

export const TEST_EMAIL = 'mohammadkhairibinali@gmail.com'

export async function signIn(page: Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await clerk.signIn({ page, emailAddress: TEST_EMAIL })
  await page.waitForFunction(
    () => Boolean((window as any).Clerk?.user?.id),
    { timeout: 30_000 },
  )
  await page.evaluate(async () => {
    const token = await (window as any).Clerk?.session?.getToken()
    if (!token) return
    await fetch('/api/v1/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'E2E Test Business', industry: 'food_beverage' }),
    })
  })
  await page.evaluate(() => localStorage.setItem('ft-onboarding-done', '1'))
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

// Signs in only — does NOT create org or set onboarding flag.
// Use for onboarding flow tests that need a clean state.
export async function signInOnly(page: Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await clerk.signIn({ page, emailAddress: TEST_EMAIL })
  await page.waitForFunction(
    () => Boolean((window as any).Clerk?.user?.id),
    { timeout: 30_000 },
  )
}

type ModuleOverride = Partial<{
  flagEnabled: boolean
  tierAccessible: boolean
  accessible: boolean
}>

// Builds a complete /api/v1/feature-flags response with optional per-module overrides.
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
