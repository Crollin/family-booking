import { defineConfig, devices } from '@playwright/test'

/**
 * Les tests visent la pile Docker, qui sert l'application et Supabase sur une
 * même origine (`docker compose up -d`). Pointez `PLAYWRIGHT_BASE_URL` ailleurs
 * pour tester une autre instance.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
