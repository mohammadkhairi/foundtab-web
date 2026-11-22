import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  use: {
    baseURL: 'https://app.foundtab.com',
    headless: true,
    viewport: { width: 390, height: 844 },
    navigationTimeout: 30_000,
    actionTimeout: 20_000,
  },
  globalSetup: './e2e/globalSetup.ts',
})
