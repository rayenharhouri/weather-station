/**
 * Phase 7.2 — mint a token via the UI, call /v1/readings directly with
 * the plaintext, assert at least one row comes back.
 *
 * Exercises:
 *   - the create-token modal on /research/tokens (the only place the
 *     plaintext is ever rendered);
 *   - `TokenAuthGuard` + the scope checks on /v1/readings.
 *
 * Run: see e2e/README.md
 */
import { expect, request, test } from '@playwright/test';

const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'correct-horse-battery-staple';
const TENANT_SLUG = process.env.E2E_TENANT_SLUG ?? 'e2e';

test('token mint → curl /v1/readings → at least one row', async ({ page }) => {
  // 1. Login.
  await page.goto(`${FRONTEND}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard$/);

  // 2. Navigate to /research/tokens + open the new-token dialog.
  await page.goto(`${FRONTEND}/research/tokens`);
  await page.getByRole('button', { name: /new token|create token/i }).click();

  const nickname = `e2e-${Date.now().toString(36)}`;
  await page.getByLabel(/name|nickname/i).fill(nickname);
  await page.getByRole('button', { name: /create|mint|generate/i }).click();

  // 3. Capture the plaintext — shown exactly once. The dialog reveals it in
  // a `font-mono` block that starts with `wh_rsa_`.
  const plaintextLocator = page.locator('text=/wh_rsa_[A-Za-z0-9_-]+/').first();
  const plaintext = (await plaintextLocator.innerText()).trim();
  expect(plaintext).toMatch(/^wh_rsa_/);

  // 4. Find a station to query. /v1/stations returns the tenant's stations.
  const api = await request.newContext();
  const stationsRes = await api.get(`${BACKEND}/v1/stations`, {
    headers: {
      Authorization: `Bearer ${plaintext}`,
      'X-Tenant': TENANT_SLUG,
    },
  });
  expect(stationsRes.ok()).toBe(true);
  const { data: stations } = (await stationsRes.json()) as {
    data: Array<{ id: string }>;
  };
  expect(stations.length).toBeGreaterThan(0);

  // 5. Pull readings for the first station's temperature.
  const readingsRes = await api.get(
    `${BACKEND}/v1/readings?station=${stations[0].id}&metric=temperature&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${plaintext}`,
        'X-Tenant': TENANT_SLUG,
      },
    },
  );
  expect(readingsRes.ok()).toBe(true);
  const body = (await readingsRes.json()) as {
    data: Array<{ value: number; unit: string }>;
  };
  expect(body.data.length).toBeGreaterThan(0);
  expect(body.data[0].unit).toBe('celsius');
  expect(typeof body.data[0].value).toBe('number');

  await api.dispose();
});
