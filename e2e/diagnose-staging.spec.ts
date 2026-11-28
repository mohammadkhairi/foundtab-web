import { test, expect } from '@playwright/test'

test('diagnose staging login — capture all errors', async ({ page }) => {
  const consoleErrors: string[] = []
  const networkFails: string[] = []
  const apiCalls: { url: string; status: number; body: string }[] = []

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message))
  page.on('requestfailed', req => {
    networkFails.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
  })
  page.on('response', async resp => {
    if (resp.url().includes('/api/')) {
      let body = ''
      try { body = await resp.text() } catch {}
      apiCalls.push({ url: resp.url(), status: resp.status(), body: body.slice(0, 400) })
    }
  })

  // Step 1: load sign-in
  await page.goto('/sign-in', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/diag-1-signin.png', fullPage: true })
  console.log('STEP 1 URL:', page.url())

  // Step 2: fill and submit
  const email = page.locator('input[type="email"]')
  const pass = page.locator('input[type="password"]')
  await expect(email).toBeVisible({ timeout: 15_000 })

  await email.fill('e2e-test@foundtab.com')
  await pass.fill('FoundTab@E2ETest2024!')
  await page.screenshot({ path: '/tmp/diag-2-filled.png', fullPage: true })

  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: '/tmp/diag-3-after-submit.png', fullPage: true })
  console.log('STEP 3 URL:', page.url())

  // Print all diagnostics
  console.log('\n=== CONSOLE ERRORS ===')
  if (consoleErrors.length === 0) console.log('none')
  consoleErrors.forEach(e => console.log('ERR:', e))

  console.log('\n=== NETWORK FAILURES ===')
  if (networkFails.length === 0) console.log('none')
  networkFails.forEach(e => console.log('FAIL:', e))

  console.log('\n=== API CALLS ===')
  apiCalls.forEach(c => console.log(`[${c.status}] ${c.url}\n  ${c.body}`))
})
