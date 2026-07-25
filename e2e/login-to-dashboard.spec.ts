/**
 * Phase 7.1 — login → dashboard renders real reading.
 *
 * Asserts the JWT auth path + the `stationService` / `readingService`
 * round-trip against the real backend. Requires `WH_MODE=production`
 * on both sides so the suite catches regressions instead of falling
 * back to mock data.
 *
 * Run: see e2e/README.md
 */
import { expect, test } from '@playwright/test';

const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'correct-horse-battery-staple';

test('login → dashboard surfaces a real reading row', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`);

  // The login form has a heading + two labelled inputs + a submit.
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Successful login redirects to /dashboard.
  await page.waitForURL(/\/dashboard$/);

  // The dashboard renders the station name in its header and at least one
  // metric tile showing a real number (anything other than "—").
  await expect(page.getByText(/demo-rooftop|enit campus|station/i).first()).toBeVisible({
    timeout: 10_000,
  });

  // Find at least one metric tile that has a concrete numeric value. The
  // exact selector depends on the dashboard layout; this matches any tile
  // whose body has a `font-mono` number (the design system signature for
  // a live numeric readout).
  const numericReadout = page
    .locator('[class*="font-mono"]')
    .filter({ hasText: /^\s*-?\d/ })
    .first();
  await expect(numericReadout).toBeVisible({ timeout: 10_000 });
});
