import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { signIn } from './helpers'

test.describe('Authenticated app flows', () => {
  test.setTimeout(60_000)

  test('sign in succeeds and reaches home/dashboard', async ({ page }) => {
    await signIn(page)
    const url = page.url()
    expect(url).not.toContain('/sign-in')
    await expect(page.locator('body')).not.toContainText('Internal server error')
    await page.screenshot({ path: '/tmp/e2e-home.png', fullPage: true })
  })

  test('Materials list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/raw-materials')
    await page.waitForLoadState('networkidle')
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

    await page.route('**/api/v1/uploads/receipt-ocr', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          supplierName: 'Pasar Borong KL',
          receiptDate: '2024-01-15',
          totalAmount: 42.70,
          items: [
            { itemName: 'Tepung Gandum', quantity: 5, unit: 'kg', unitPrice: 3.50, totalPrice: 17.50, suggestedRawMaterialId: null, suggestedGenericName: null },
            { itemName: 'Gula Halus', quantity: 3, unit: 'kg', unitPrice: 2.80, totalPrice: 8.40, suggestedRawMaterialId: null, suggestedGenericName: null },
            { itemName: 'Mentega', quantity: 4, unit: 'pcs', unitPrice: 4.20, totalPrice: 16.80, suggestedRawMaterialId: null, suggestedGenericName: null },
          ],
        }),
      }),
    )
    await page.route('**/api/v1/purchases/ocr-draft', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
      }
      return route.continue()
    })

    await page.goto('/purchases/scan')
    await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 15_000 })

    const fakeJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ])
    fs.writeFileSync('/tmp/test-receipt.jpg', fakeJpeg)

    await page.locator('input[type="file"]').setInputFiles('/tmp/test-receipt.jpg')

    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('input[type="text"]')).some(
        (el) => (el as HTMLInputElement).value.includes('Pasar Borong'),
      ),
      { timeout: 20_000 },
    )
    await page.screenshot({ path: '/tmp/e2e-ocr-result.png', fullPage: true })
    await expect(page.locator('body')).not.toContainText('Internal server error')
  })

  test('Create a raw material', async ({ page }) => {
    await signIn(page)
    await page.goto('/raw-materials/new')
    await page.waitForLoadState('networkidle')

    const mobileForm = page.locator('form.md\\:hidden')
    await mobileForm.locator('#rm-name').fill(`E2E Material ${Date.now()}`)
    await mobileForm.locator('#qty').fill('50')
    await mobileForm.locator('#reorder').fill('10')

    await page.screenshot({ path: '/tmp/e2e-rm-form.png', fullPage: true })

    await mobileForm.locator('button[type="submit"]').click()

    await page.waitForURL('**/raw-materials', { timeout: 15_000 })
    await page.screenshot({ path: '/tmp/e2e-rm-after-save.png', fullPage: true })
  })

  test('Consignments list loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/consignments')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-consignments.png', fullPage: true })
  })

  test('Create an order and view detail', async ({ page }) => {
    await signIn(page)

    const orderId = await page.evaluate(async () => {
      const token = window.localStorage.getItem('ft-auth-token')
      if (!token) return null
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: 'E2E Test Customer',
          customerPhone: '0123456789',
          channel: 'MANUAL',
          covers: 2,
          items: [{ itemType: 'CATALOGUE', itemName: 'Nasi Lemak', quantity: 1, pricePerUnit: 5.50, totalPrice: 5.50 }],
          totalAmount: 5.50,
        }),
      })
      const data = await res.json() as { id?: string }
      return data.id ?? null
    })

    expect(orderId).toBeTruthy()

    await page.goto('/orders')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await page.screenshot({ path: '/tmp/e2e-order-form.png', fullPage: true })

    await page.goto(`/orders/${orderId as string}`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: '/tmp/e2e-order-detail.png', fullPage: true })
    await expect(page.locator('body')).toContainText('E2E Test Customer')
  })
})
