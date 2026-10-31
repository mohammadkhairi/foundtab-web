import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'

const TEST_EMAIL = 'mohammadkhairibinali@gmail.com'

async function signIn(page: Page) {
  // Set up route interceptor BEFORE navigation so FAPI requests carry the testing token
  await setupClerkTestingToken({ page })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Sign in via ticket strategy — bypasses email verification entirely
  await clerk.signIn({ page, emailAddress: TEST_EMAIL })

  // clerk.signIn has a timing bug: waitForFunction uses !== null but user starts as undefined.
  // Explicitly wait for the session to be truly active (user.id is truthy).
  await page.waitForFunction(
    () => Boolean((window as any).Clerk?.user?.id),
    { timeout: 30_000 },
  )

  // Ensure the test org exists (idempotent — backend returns 200 if already created)
  await page.evaluate(async () => {
    const token = await (window as any).Clerk?.session?.getToken()
    if (!token) return
    await fetch('/api/v1/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'E2E Test Business', industry: 'food_beverage' }),
    })
  })

  // Mark onboarding as done so RootRedirect goes to /dashboard, not /onboarding
  await page.evaluate(() => localStorage.setItem('ft-onboarding-done', '1'))

  // Navigate to a known authenticated page to force a full session reload from cookies.
  // Without this the React state may not have settled (test 1 URL check races sign-in completion).
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

test.describe('Authenticated app flows', () => {
  test.setTimeout(60_000)

  test('sign in succeeds and reaches home/dashboard', async ({ page }) => {
    await signIn(page)
    const url = page.url()
    expect(url).not.toContain('/sign-in')
    // Should be on some authenticated page
    await expect(page.locator('body')).not.toContainText('Internal server error')
    await page.screenshot({ path: '/tmp/e2e-home.png', fullPage: true })
  })

  test('Materials list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/raw-materials')
    await page.waitForLoadState('networkidle')
    // Should not show error state
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-materials.png', fullPage: true })
  })

  test('Products list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-products.png', fullPage: true })
  })

  test('Orders list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-orders.png', fullPage: true })
  })

  test('Productions list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/productions')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-productions.png', fullPage: true })
  })

  test('Stock movements list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/stock-movements')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-stock-movements.png', fullPage: true })
  })

  test('Purchases list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/purchases')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-purchases.png', fullPage: true })
  })

  test('Receipt scan (OCR) returns mock data without error', async ({ page }) => {
    await signIn(page)

    // Intercept the OCR endpoint at the network level so tests never call real Claude Vision.
    // MOCK_OCR stays false in .env — this interception is test-only.
    await page.route('**/api/v1/uploads/receipt-ocr', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          supplierName: 'Pasar Borong KL',
          receiptDate: '2024-01-15',
          totalAmount: '42.70',
          items: [
            { name: 'Tepung Gandum', quantity: 5, unit: 'kg', unitPrice: 3.50, totalPrice: 17.50 },
            { name: 'Gula Halus', quantity: 3, unit: 'kg', unitPrice: 2.80, totalPrice: 8.40 },
            { name: 'Mentega', quantity: 4, unit: 'pcs', unitPrice: 4.20, totalPrice: 16.80 },
          ],
        }),
      }),
    )

    await page.goto('/purchases/scan')
    await page.waitForLoadState('networkidle')

    // Create a minimal fake JPEG file to upload
    const fakeJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ])
    const tmpFile = '/tmp/test-receipt.jpg'
    fs.writeFileSync(tmpFile, fakeJpeg)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tmpFile)

    // Wait for OCR response — should show review phase, not error
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/e2e-ocr-result.png', fullPage: true })

    await expect(page.locator('body')).not.toContainText('Internal server error')
    // Supplier name input should be pre-filled from mock response
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('input[type="text"]')).some(
        (el) => (el as HTMLInputElement).value.includes('Pasar Borong'),
      ),
      { timeout: 10_000 },
    )
  })

  test('Create a raw material', async ({ page }) => {
    await signIn(page)
    await page.goto('/raw-materials/new')
    await page.waitForLoadState('networkidle')

    // Use the mobile form (md:hidden = visible at mobile viewport)
    const mobileForm = page.locator('form.md\\:hidden')
    await mobileForm.locator('#rm-name').fill(`E2E Material ${Date.now()}`)
    await mobileForm.locator('#qty').fill('50')
    await mobileForm.locator('#reorder').fill('10')

    await page.screenshot({ path: '/tmp/e2e-rm-form.png', fullPage: true })

    await mobileForm.locator('button[type="submit"]').click()

    // Should redirect back to /raw-materials
    await page.waitForURL('**/raw-materials', { timeout: 15_000 })
    await page.screenshot({ path: '/tmp/e2e-rm-after-save.png', fullPage: true })
  })

  test('Create an order', async ({ page }) => {
    await signIn(page)
    await page.goto('/orders/new')
    await page.waitForLoadState('networkidle')

    const mobileForm = page.locator('form.md\\:hidden')

    // Mobile form inputs
    await mobileForm.locator('#cust-name-m').fill('E2E Test Customer')
    await mobileForm.locator('#cust-phone-m').fill('0123456789')

    // Fill item — scope to mobile form to avoid strict-mode violation
    await mobileForm.locator('input[placeholder="Item 1"]').fill('Nasi Lemak')
    await mobileForm.locator('input[aria-label="Qty"]').fill('2')
    await mobileForm.locator('input[aria-label="Price per unit"]').fill('5.50')

    await page.screenshot({ path: '/tmp/e2e-order-form.png', fullPage: true })

    await mobileForm.locator('button[type="submit"]').click()

    // Should navigate to the new order detail
    await page.waitForURL('**/orders/**', { timeout: 15_000 })
    await page.screenshot({ path: '/tmp/e2e-order-detail.png', fullPage: true })
    await expect(page.locator('body')).toContainText('E2E Test Customer')
  })
})
