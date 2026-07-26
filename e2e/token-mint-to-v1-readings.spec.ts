import { expect, request, test } from '@playwright/test';

const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'correct-horse-battery-staple';
const TENANT_SLUG = process.env.E2E_TENANT_SLUG ?? 'e2e';

test('token mint → curl /v1/readings → at least one row', async ({ page }) => {
  await page.goto(`${FRONTEND}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto(`${FRONTEND}/research/tokens`);
  await page.getByRole('button', { name: /new token|create token/i }).click();

  const nickname = `e2e-${Date.now().toString(36)}`;
  await page.getByLabel(/name|nickname/i).fill(nickname);
  await page.getByRole('button', { name: /create|mint|generate/i }).click();

  const plaintextLocator = page.locator('text=/wh_rsa_[A-Za-z0-9_-]+/').first();
  const plaintext = (await plaintextLocator.innerText()).trim();
  expect(plaintext).toMatch(/^wh_rsa_/);

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
