# End-to-end tests

Playwright specs that exercise the full stack (Next.js frontend ↔ NestJS backend ↔ Postgres). Kept out of the default `npm test` run because they need the whole stack running.

## What's covered

- **`login-to-dashboard.spec.ts`** — Phase 7.1. Logs in via `/login`, lands on `/dashboard`, asserts a real reading row renders.
- **`token-mint-to-v1-readings.spec.ts`** — Phase 7.2. Logs in, mints a token via the UI, captures the plaintext, calls `/v1/readings` directly with that bearer and asserts at least one row comes back.

## One-time setup

```sh
# Add Playwright (kept out of the lockfile so the default install stays small)
npm i --save-dev @playwright/test
npx playwright install --with-deps chromium
```

Both specs assume:

- Frontend on `http://localhost:3000` (`npm run dev`)
- Backend on `http://localhost:3001` (`cd backend && npm run start:dev`)
- A tenant provisioned + seeded:
  ```sh
  cd backend
  npm run tenant:provision -- --slug=e2e --name="E2E Tenant" \
    --admin-email=admin@e2e.test --admin-password=correct-horse-battery-staple
  npm run tenant:seed:demo -- --slug=e2e
  ```
- `WH_MODE=production` (on both sides) so the suite tests the real wire, not the mock fallback.

## Run

```sh
npx playwright test                 # all specs
npx playwright test --headed        # watch them in a browser
npx playwright test login-to        # one file by pattern
```

## Why these two specs

Together they pin the two end-to-end paths nothing else exercises:

1. **JWT auth + readings read path.** Login flow, JWT round-trip, station + reading queries hitting the real Timescale hypertable.
2. **API token mint + token-auth read path.** The token creation UI, the `wh_rsa_…` plaintext appearing once, and the `/v1/*` surface accepting that bearer with the right scope checks.

Most other code paths are covered by the unit suites (`npm test` in the repo root for the service mode branches; `cd backend && npm test` for Merkle + threshold evaluator + the gated tenant-provision integration).
