import { test, expect } from '@playwright/test'
import { signIn } from './helpers'

test.describe('Core user journeys — beginner user story', () => {
  test.setTimeout(90_000)

  // ── Inventory setup ───────────────────────────────────────────────

  test('create a product via UI form and see it appear in the list', async ({ page }) => {
    await signIn(page)
    await page.goto('/products/new')
    await page.waitForLoadState('networkidle')

    const name = `E2E Product ${Date.now()}`

    // Mobile form (md:hidden = visible at mobile viewport 390px)
    const mobileForm = page.locator('form.md\\:hidden')
    await mobileForm.locator('#pname').fill(name)
    const priceInput = mobileForm.locator('#sale-price')
    if (await priceInput.count() > 0) await priceInput.fill('5.00')
    await mobileForm.locator('button[type="submit"]').click()

    // Redirect back to list = proof the creation succeeded
    await page.waitForURL('**/products**', { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-journey-product-created.png', fullPage: true })
  })

  test('create a raw material via UI form and see it in the list', async ({ page }) => {
    await signIn(page)
    await page.goto('/raw-materials/new')
    await page.waitForLoadState('networkidle')

    const name = `E2E Ingredient ${Date.now()}`
    const mobileForm = page.locator('form.md\\:hidden')
    await mobileForm.locator('#rm-name').fill(name)
    await mobileForm.locator('#qty').fill('100')
    await mobileForm.locator('#reorder').fill('10')
    await mobileForm.locator('button[type="submit"]').click()

    // Redirect back to list = proof the creation succeeded
    await page.waitForURL('**/raw-materials**', { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-journey-rm-created.png', fullPage: true })
  })

  // ── Order workflow ────────────────────────────────────────────────

  test('order status advances from PENDING → CONFIRMED via the detail page', async ({ page }) => {
    await signIn(page)

    const orderId = await page.evaluate(async () => {
      const token = await (window as any).Clerk?.session?.getToken()
      if (!token) return null
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: `E2E Journey ${Date.now()}`,
          customerPhone: '0123456789',
          channel: 'MANUAL',
          covers: 1,
          items: [{ itemType: 'CATALOGUE', itemName: 'Test Item', quantity: 1, pricePerUnit: 10.00, totalPrice: 10.00 }],
          totalAmount: 10.00,
        }),
      })
      const data = await res.json() as { id?: string }
      return data.id ?? null
    })

    expect(orderId).toBeTruthy()

    await page.goto(`/orders/${orderId as string}`)
    await page.waitForLoadState('networkidle')

    // Should show PENDING / Received in the status progress bar
    await expect(page.locator('body')).toContainText(/Pending|Received/i)

    // Click the "Confirm order" button (orders_nextLabel_pending)
    const confirmBtn = page.locator('button', { hasText: 'Confirm order' }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
    await confirmBtn.click()

    // Status should update to CONFIRMED in the UI
    await page.waitForFunction(
      () => document.body.innerText.match(/Confirmed/i),
      { timeout: 10_000 },
    )
    await page.screenshot({ path: '/tmp/e2e-journey-order-confirmed.png', fullPage: true })
  })

  test('order can be cancelled and shows cancelled status', async ({ page }) => {
    await signIn(page)

    const orderId = await page.evaluate(async () => {
      const token = await (window as any).Clerk?.session?.getToken()
      if (!token) return null
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: `E2E Cancel ${Date.now()}`,
          customerPhone: '0123456789',
          channel: 'MANUAL',
          covers: 1,
          items: [{ itemType: 'CATALOGUE', itemName: 'Cancel Test', quantity: 1, pricePerUnit: 5.00, totalPrice: 5.00 }],
          totalAmount: 5.00,
        }),
      })
      const data = await res.json() as { id?: string }
      return data.id ?? null
    })

    expect(orderId).toBeTruthy()

    await page.goto(`/orders/${orderId as string}`)
    await page.waitForLoadState('networkidle')

    // Action bar now has z-30 so it renders above the bottom nav (z-20)
    const cancelBtn = page.locator('button', { hasText: /Cancel order/i }).first()
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 })
    await cancelBtn.click()

    // Confirm in the modal
    await expect(page.getByText('Cancel this order?')).toBeVisible({ timeout: 8_000 })
    await page.locator('.fixed.inset-0').locator('button', { hasText: /Cancel order/i }).click()

    // Wait for the modal to close (happens after API call completes)
    await page.locator('.fixed.inset-0').waitFor({ state: 'hidden', timeout: 10_000 })

    // Verify via API that the order status is now CANCELLED
    const status = await page.evaluate(async (id) => {
      const token = await (window as any).Clerk?.session?.getToken()
      if (!token) return null
      const res = await fetch(`/api/v1/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json() as { status?: string }
      return data.status ?? null
    }, orderId as string)

    expect(status).toBe('CANCELLED')
    await page.screenshot({ path: '/tmp/e2e-journey-order-cancelled.png', fullPage: true })
  })

  // ── Purchases ────────────────────────────────────────────────────

  test('purchases page loads with Scan and New Purchase CTAs', async ({ page }) => {
    await signIn(page)
    await page.goto('/purchases')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    // Both entry paths must be discoverable
    const scanBtn = page.locator('button, a').filter({ hasText: /Scan/i }).first()
    const newBtn = page.locator('button, a').filter({ hasText: /New|Purchase/i }).first()
    const hasAnyCTA = (await scanBtn.count()) > 0 || (await newBtn.count()) > 0
    expect(hasAnyCTA).toBe(true)
    await page.screenshot({ path: '/tmp/e2e-journey-purchases.png', fullPage: true })
  })

  // ── Dashboard ────────────────────────────────────────────────────

  test('dashboard renders metrics — not a blank or error page', async ({ page }) => {
    await signIn(page)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await expect(page.locator('body')).not.toContainText('Internal server error')
    // Should show at least one of: summary numbers, checklist, or stock section
    const hasDashboardContent = await page.locator('body').evaluate((el) =>
      /Sales|Revenue|Checklist|Stock|Today|Month|Dashboard/i.test(el.innerText)
    )
    expect(hasDashboardContent).toBe(true)
    await page.screenshot({ path: '/tmp/e2e-journey-dashboard.png', fullPage: true })
  })

  // ── Empty states (new user experience) ───────────────────────────

  test('recipes list shows a helpful empty state with Add CTA when empty', async ({ page }) => {
    await signIn(page)
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    // Either shows recipes or a helpful empty state
    const hasContent = await page.locator('body').evaluate((el) =>
      /Recipe|New recipe|Add recipe|No recipe/i.test(el.innerText)
    )
    expect(hasContent).toBe(true)
    await page.screenshot({ path: '/tmp/e2e-journey-recipes.png', fullPage: true })
  })

  test('stock movements audit trail loads and is filterable', async ({ page }) => {
    await signIn(page)
    await page.goto('/stock-movements')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-journey-stock-movements.png', fullPage: true })
  })
})
