import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('landing exposes brand', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Family Lodge/i })).toBeVisible()
  })
})
