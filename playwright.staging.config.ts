import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  use: {
    baseURL: 'https://staging-app.foundtab.com',
    headless: true,
    viewport: { width: 390, height: 844 },
    // Allow extra time for cold starts on Vercel/Railway
    navigationTimeout: 30_000,
    actionTimeout: 20_000,
  },
  globalSetup: './e2e/globalSetup.ts',
  // No webServer — running against deployed staging
})
