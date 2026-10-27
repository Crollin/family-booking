import { test, expect } from '@playwright/test'

/**
 * Guards against middleware redirect regression (Task 1):
 * unauthenticated users with an invite token must reach /register, not /login.
 */
test.describe('register page', () => {
  test('unauthenticated user with token sees register UI (not redirected to login)', async ({
    page,
  }) => {
    await page.goto('/register?token=test-token')

    await expect(page).toHaveURL(/\/register/)
    await expect(page).not.toHaveURL(/\/login/)

    await expect(
      page.getByRole('heading', { name: /Créer votre compte/i })
    ).toBeVisible()
    await expect(page.locator('form')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /Créer mon compte/i })).toBeVisible()
  })
})
