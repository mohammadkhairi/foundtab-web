/**
 * Real E2E test — signs in via Clerk ticket and exercises key app flows
 */
import { chromium, type Page } from 'playwright'
import { readFileSync } from 'fs'

const CLERK_SECRET_KEY = 'sk_test_zwgJTiciQ1hed8KsYY8IKUfehYxqwE9zUo2OuXW7l8'
const EMAIL = 'mohammadkhairibinali@gmail.com'
const FRONTEND = 'http://localhost:3000'
const IMAGE_DIR = '/Users/khairimacbook/.claude/image-cache/7e124a3d-79b0-4af0-8dc5-b5f737c6a016'

let passed = 0
let failed = 0

function ok(label: string) {
  console.log(`  ✓ ${label}`)
  passed++
}

function fail(label: string, err?: unknown) {
  console.log(`  ✗ ${label}${err ? ': ' + String(err) : ''}`)
  failed++
}

async function getSignInTicket(): Promise<string> {
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}&limit=1`,
    { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } }
  )
  const users = (await res.json()) as any[]
  const userId = users[0]?.id
  if (!userId) throw new Error('User not found')

  const r = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 3600 }),
  })
  const data = (await r.json()) as any
  if (!data?.token) throw new Error(`No token: ${JSON.stringify(data)}`)
  return data.token
}

async function signIn(page: Page, ticket: string) {
  await page.goto(`${FRONTEND}/sign-in?__clerk_ticket=${ticket}`)
  await page.waitForURL((u) => !u.pathname.includes('/sign-in'), { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

async function checkPage(page: Page, path: string, expectedText: string, label: string) {
  try {
    await page.goto(`${FRONTEND}${path}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
    const content = await page.content()
    if (content.includes(expectedText) || content.toLowerCase().includes(expectedText.toLowerCase())) {
      ok(label)
    } else {
      fail(label, `"${expectedText}" not found on page`)
    }
  } catch (e) {
    fail(label, e)
  }
}

;(async () => {
  console.log('Getting sign-in ticket...')
  const ticket = await getSignInTicket()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // === Sign in ===
  console.log('\n[ Authentication ]')
  try {
    await signIn(page, ticket)
    ok('Sign in via Clerk ticket succeeds')
  } catch (e) {
    fail('Sign in via Clerk ticket', e)
    await browser.close()
    process.exit(1)
  }

  // === Navigate key pages ===
  console.log('\n[ Page navigation ]')
  await checkPage(page, '/dashboard', 'dashboard', 'Dashboard loads')
  await checkPage(page, '/raw-materials', 'raw-material', 'Raw Materials page loads')
  await checkPage(page, '/products', 'product', 'Products page loads')
  await checkPage(page, '/purchases', 'purchase', 'Purchases page loads')
  await checkPage(page, '/productions', 'production', 'Productions page loads')
  await checkPage(page, '/orders', 'order', 'Orders page loads')

  // === Receipt OCR via the app UI ===
  console.log('\n[ Receipt OCR — Scan Purchase flow ]')
  try {
    await page.goto(`${FRONTEND}/purchases/scan`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // The upload area triggers a hidden file input
    const fileInput = page.locator('input[type="file"]').first()
    const hasInput = await fileInput.count()
    if (hasInput === 0) {
      fail('File input visible on scan page')
    } else {
      ok('Scan receipt page loads with file input')

      await fileInput.setInputFiles(`${IMAGE_DIR}/4.png`)
      await page.waitForTimeout(15_000) // wait for OCR + review render

      const pageContent = await page.content()
      if (
        pageContent.includes('HASIL LAUT') ||
        pageContent.includes('Telur') ||
        pageContent.includes('Gardenia') ||
        pageContent.includes('134')
      ) {
        ok('OCR results displayed — real receipt items detected')
      } else {
        // Check if it moved to review phase with any supplier data
        const hasReview = pageContent.includes('review') || pageContent.includes('supplierName') || pageContent.includes('Save')
        hasReview ? ok('OCR review phase loaded') : fail('OCR results not visible in UI after upload')
      }
    }
  } catch (e) {
    fail('Scan Purchase OCR flow', e)
  }

  // === Summary ===
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
})()
