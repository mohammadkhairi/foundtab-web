import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BACKEND_URL = 'http://localhost:8080'

test.describe('Backend API (direct HTTP)', () => {
  test('GET /health returns { status: "ok" }', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  test('POST /api/v1/orgs without auth returns 401', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/orgs`, {
      data: { name: 'Unauthorised Org' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/raw-materials without auth returns 401', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/raw-materials`, {
      data: { name: 'Salt', purchaseUnit: 'kg', baseUnit: 'g', conversionFactor: 1000 },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/uploads/receipt-ocr without auth returns 401', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/uploads/receipt-ocr`, {
      multipart: { file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') } },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/purchases without auth returns 401', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/purchases`, {
      data: { items: [] },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/orders without auth returns 401', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/v1/orders`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/products without auth returns 401', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/v1/products`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/productions without auth returns 401', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/v1/productions`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/stock-movements without auth returns 401', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/v1/stock-movements`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/orders/whatsapp without auth returns 401', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/orders/whatsapp/parse`, {
      data: { text: 'test message' },
    })
    expect(res.status()).toBe(401)
  })
})
