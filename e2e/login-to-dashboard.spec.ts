import { expect, test } from '@playwright/test';

const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'correct-horse-battery-staple';

test('login → dashboard surfaces a real reading row', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`);

  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/dashboard$/);

  await expect(page.getByText(/demo-rooftop|enit campus|station/i).first()).toBeVisible({
    timeout: 10_000,
  });

  const numericReadout = page
    .locator('[class*="font-mono"]')
    .filter({ hasText: /^\s*-?\d/ })
    .first();
  await expect(numericReadout).toBeVisible({ timeout: 10_000 });
});
