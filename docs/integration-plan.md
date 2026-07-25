# WeatherHub — Full Integration Plan

A living document. Tracks the work to take WeatherHub from "frontend mostly wired to a partial backend with inline mocks" to "fully integrated, with a clean mode switch between production / demo / test."

Last updated: 2026-05-20.

---

## 0. The mode system

A single env variable selects how the app sources data.

| Mode | Behaviour | When to use |
|---|---|---|
| **production** | Real backend required. Services throw on failure — no silent mock fallback. Server refuses to boot with default JWT secrets. | Live deployments. |
| **demo** | Real backend preferred, mocks as fallback. Both sides seed deterministic-but-realistic data for screenshots, demos, and offline development. | Sales demos, screenshots, design reviews. |
| **test** | Mocks only, no network calls, zero artificial latency, fixed seeds for repeatability. | Unit + E2E tests, CI. |

**Variable names:**
- Backend: `WH_MODE` in `backend/.env`.
- Frontend: `NEXT_PUBLIC_WH_MODE` in `.env.local`.

If unset, both default to `demo`. The current `NEXT_PUBLIC_USE_MOCK_DATA` becomes a derived alias for backward compatibility, then is deleted in Phase 7.

**Acceptance for Phase 0 (this PR):**
- Both env files declare the variable with explanations.
- `services/api.ts` reads the mode and adapts `withMockFallback`.
- Backend logs the active mode at startup; production refuses default secrets.

---

## 1. Backend module gaps

The frontend has eight ops pages + seven research pages. Several of them call services that don't have a real backend endpoint yet — they fall through to mock data.

### 1a. Operations side (ports already shaped in `services/api.ts`)

| Module | Endpoint(s) | Status | Notes |
|---|---|---|---|
| Auth | `/auth/login`, `/auth/me` | ✓ done | Per-tenant JWT |
| Stations | `GET /stations`, `GET /stations/:id` | ✓ done | |
| Readings | `GET /readings/{latest,history,summary}`, `POST /readings`, SSE `/readings/stream` | ✓ done | Time-series via TimescaleDB hypertable |
| Device status | `GET /device/status?stationId=` | ✓ done | Derive from latest reading + station status |
| **Alerts** | `GET /alerts`, `PATCH /alerts/:id/{ack,resolve}`, SSE `/alerts/stream` | ✓ done | Threshold evaluator runs on each new reading. Skip-if-open dedupe per `(stationId, metric, severity)`. |
| **Forecasts** | `GET /forecasts?stationId=&horizon=` | ✓ done | Least-squares fit over last 6h for temp/humidity/pressure; recent-mean for rainfall. On-demand recompute with 10-min cache; pre-warm cron is Phase 5.6. |
| **Integrity** | `GET /integrity/batches`, `POST /integrity/verify-record`, `POST /integrity/verify-batch` | ✓ done | Canonical SHA-256 leaves, Bitcoin-style Merkle tree, inclusion proofs. Hedera stubbed deterministically by `(tenant, root, network)` in demo/unwired-production; Phase 5.5 swaps in the live client. |
| Settings preferences | `GET /settings/preferences`, `PATCH /settings/preferences` | ❌ missing | Per-user notification + threshold prefs |

### 1b. Research portal `/v1/*`

| Module | Endpoint(s) | Status |
|---|---|---|
| Tokens | `GET/POST/DELETE /v1/tokens`, `POST /v1/tokens/:id/rotate` | ✓ done |
| `/v1/me` introspection | `GET /v1/me` | ✓ done |
| Readings (token-auth) | `GET /v1/readings` | ✓ done |
| **Readings SSE** | `GET /v1/readings/stream?token=` | ✓ done | TokenAuthGuard now accepts `?token=` as a fallback for browser `EventSource`. |
| **Stations** | `GET /v1/stations` | ✓ done |
| **Forecasts** | `GET /v1/forecasts` | ✓ done |
| **Alerts** | `GET /v1/alerts` | ✓ done |
| **Integrity** | `GET /v1/integrity/batches`, `POST /v1/integrity/verify-record` | ✓ done |
| **Datasets** | `GET/POST/DELETE /v1/datasets` + `GET /v1/datasets/:id/download` | ✓ done | Owner-or-visibility access; private rows hidden from non-owners (404 not 403 to avoid leaking existence). Download is a metadata-CSV stub until 3.4 lands real materialisation. |
| **Exports** | `GET/POST /v1/exports`, `DELETE /v1/exports/:id`, `GET /v1/exports/:id/download` | ✓ done | Single-instance worker, `FOR UPDATE SKIP LOCKED` claim, streaming CSV/JSON materialiser. Parquet falls back to NDJSON (real writer is a Phase 5+ swap). |
| **Usage** | `GET /v1/usage?range=` | ✓ done | Global `RequestLogInterceptor` writes one row per authed `/v1/*` request; aggregations are per-user (own tokens only). |
| **Grants** | `GET /v1/grants`, `POST /v1/grants/request`, `DELETE /v1/grants/:id` | ✓ done | Lodged as `pending`; admin approval flow + enforcement land in Phase 5. |
| **Account** | `GET/PATCH /v1/account` | ✓ done |

### 1c. Cross-cutting

- **MQTT ingest worker** — ✓ subscribe to `tenants/+/stations/+/readings`, verify device JWT (claims must match topic), validate body against `IngestReadingDto`, hand off to `ReadingsService.ingest()` (which already publishes to SSE + runs alerts). _Landed 2026-05-21._
- **Rate limiting** — ✓ in-process token bucket; 60 req/min + 10k req/day per token; standard `X-RateLimit-*` response headers; `429 rate_limit_*` with `retryAfterMs`. Redis swap-in lives behind the same interceptor surface. _Landed 2026-05-21._
- **Token expiry sweeper** — ✓ hourly cron flips `active → expired` past `expiresAt`. Lazy `TokenAuthGuard` rejection covers reads; sweeper keeps list views honest. _Landed 2026-05-21._
- **Anchor scheduler** — ✓ every 5 min, iterates active tenants × stations and calls `IntegrityService.createBatch()`. _Landed 2026-05-21._
- **Forecast scheduler** — ✓ every 10 min, pre-warms `ForecastsService.getOrCompute()` across `(tenant, station, horizon)`. _Landed 2026-05-21._
- **Request audit log** — ✓ shipped with Phase 3.5. `RequestLogInterceptor` writes per-request rows. 90-day prune cron is Phase 6 work.

---

## 2. Frontend page wiring

Some pages already call `services/api.ts`. Others have inline mock data that needs to be replaced.

### 2a. Pages already wired through `services/api.ts`

These work in `demo` mode today; they'll work in `production` mode the moment the matching backend module lands.

- `/login` · `/dashboard` · `/live` · `/analytics` · `/forecasts` · `/alerts` · `/integrity` · `/stations` · `/settings`
- `/research/playground` (uses `readingService.getHistory`)
- `/research/tokens` (uses `tokenService` — fully wired)

### 2b. Pages with inline mock data — need refactor

| Page | Today | Required |
|---|---|---|
| `/research/datasets` | ~~Inline `SEED` array~~ | ✓ `datasetService.list/create/delete` → `/v1/datasets` |
| `/research/usage` | ~~Inline `buildUsage()`~~ | ✓ `usageService.summary({range})` → `/v1/usage`; polls every 60s |
| `/research/exports` | ~~Inline `SEED` + auto-tick~~ | ✓ `exportService.list/create/cancel/delete` → `/v1/exports`; polls 3s while any job is queued/running |
| `/research/account` | ~~Inline `AVAILABLE_TOKENS` + `GRANTS`~~ | ✓ `accountService.get/patch` + `grantService.list/request/revoke`; tokens query shared with topbar |
| Operations topbar | Hardcoded "Connected" / "Last sync" | Reads real SSE connection state from a shared `LiveContext` (still pending) |

### 2c. Cross-page concerns

- **Topbar token chip** ↔ `/research/account` active-token picker — both read/write the same source. `useActiveToken()` hook backed by `localStorage` initially, server-side preference later.
- **Real `useSSEStream`** on `/live` and `/dashboard` — already wired; just needs the real SSE endpoint behind it (which exists for ops, not for `/v1` yet).
- **Error boundaries** — every route should have a Next.js `error.tsx` that surfaces backend failures gracefully rather than the default Next dev overlay.
- **404 catchall under `/research/docs/[...slug]`** that renders "Coming soon" so the dimmed nav links work even if someone hits them directly.

---

## 3. Migrations + operational tooling

- **All tenant migrations applied** — currently `users`, `stations`, `readings`. Add: `api_tokens` (already migration-ready), `alerts`, `forecasts`, `integrity_batches`, `datasets`, `exports`, `grants`, `account_preferences`, `request_logs`.
- **`npm run tenant:migrate` runs in CI** before the API boots in production.
- **Demo seed script** (`npm run tenant:seed:demo -- --slug=enit`) writes a realistic 90-day window of readings, a handful of historical alerts, a few anchored batches, two saved datasets, an export job in each state. Same payloads each time so screenshots are reproducible.
- **Health checks** — `/health` reports DB, MQTT, and (when wired) Hedera reachability. `/ready` separately reports migrations-applied.
- **Structured logging** — every request carries `tid`, `userId`, `tokenId` (if present) as log fields. Drops into Loki / Datadog / wherever.
- **Backups** — one `pg_dump` per tenant DB nightly; master DB more frequently. Documented restore procedure.

---

## 4. Sequenced PR roadmap

PRs in order. Each is independently shippable and reviewable.

### Phase 0 — Mode system foundation
- **0.1** WH_MODE env var on both sides; `services/api.ts` consults it; backend logs and validates at boot. **← This PR.**

### Phase 1 — Operations backend gaps
- **1.1** ✓ Device status endpoint (read from latest reading + station status). _Landed 2026-05-20._
- **1.2** ✓ Alerts module: entity + migration, list/ack/resolve, threshold evaluator hook on reading ingest, SSE `/alerts/stream`. _Landed 2026-05-20._
- **1.3** ✓ Forecasts module: entity + migration, least-squares projector, `GET /forecasts` with 10-min cache. Pre-warm scheduler moved to 5.6. _Landed 2026-05-21._
- **1.4** ✓ Integrity module: batch entity + migration, canonical record hashing, Merkle tree + inclusion proofs, `GET /integrity/batches`, `POST /integrity/verify-record`, `POST /integrity/verify-batch`. Hedera anchor adapter is stubbed deterministically; real client is Phase 5.5. _Landed 2026-05-21._

### Phase 2 — Frontend page wire-ups (parallel-safe)
- **2.1** ✓ `/research/datasets` → `datasetService`. Tab + search filtering stays client-side; download opens the `/v1/datasets/:id/download` link.
- **2.2** ✓ `/research/usage` → `usageService`. Stable per-token color cycle from the metric palette. Buckets re-labelled by range. _Landed 2026-05-21._
- **2.3** ✓ `/research/exports` → `exportService`. TanStack mutations for cancel/delete/re-run; retry creates a new job since the backend doesn't reset in place. Download streams as a blob so the bearer header rides along (anchor clicks can't set headers). _Landed 2026-05-21._
- **2.4** ✓ `/research/account` → `accountService` + `grantService`. Active-token picker syncs to both `localStorage` (instant) and `/v1/account.activeTokenId` (cross-device). Preferences PATCH on Save. _Landed 2026-05-21._
- **2.5** ✓ Topbar token chip reads the same `useActiveToken` hook + the shared `tokens` query, so picking a token on Account updates the chip everywhere without a refetch. _Landed 2026-05-21._

### Phase 3 — Research API surface
- **3.1** ✓ `/v1/stations` · `/v1/forecasts` · `/v1/alerts` · `/v1/integrity/*`. Thin wrappers over Phase 1 services, all behind `TokenAuthGuard`, scope-checked via shared `assertStationInScope` / `metricAllowed` helpers. Snake-case responses; `next_cursor: null` (keyset pagination is out of scope). _Landed 2026-05-21._
- **3.2** ✓ `/v1/readings/stream` SSE with `?token=` extract. `TokenAuthGuard` now reads the bearer from `Authorization` first then falls back to `?token=` for browser EventSource. Per-metric event filter drops frames where the requested metric is null. _Landed 2026-05-21._
- **3.3** ✓ Datasets backend module: entity + migration; `GET /v1/datasets` (public/shared visible to all, private to owner), `POST`, `DELETE :id`, `GET :id/download` (CSV metadata stub until 3.4). _Landed 2026-05-21._
- **3.4** ✓ Exports backend module: `exports` entity + migration; in-process worker tick (default 5s) claims jobs with `FOR UPDATE SKIP LOCKED` so multi-instance is safe; streaming CSV/JSON materialiser pages 1k rows at a time; lifecycle `queued → running → ready/failed` with lazy `expired` flip past TTL; `POST :id/cancel` + `DELETE :id` (file unlinked on delete). Parquet falls back to NDJSON until an Arrow writer is added. _Landed 2026-05-21._
- **3.5** ✓ Usage backend module: `request_logs` table (indexed on time, token+time, path+time), global interceptor writes one row per authed request (fire-and-forget via `queueMicrotask`), `GET /v1/usage?range=24h|7d|30d` returns KPIs (p50/p95/p99 via `percentile_cont`), per-token rows, top endpoints, and time-bucketed series. _Landed 2026-05-21._
- **3.6** ✓ Grants backend module: cross-tenant access requests (`pending` → `active` → `revoked`). `GET /v1/grants`, `POST /v1/grants/request`, `DELETE /v1/grants/:id`. Admin-side approval surface deferred to Phase 5+. _Landed 2026-05-21._
- **3.7** ✓ Account preferences backend module: `account_preferences` entity (jsonb notifications, citationFormat, autoCite, activeTokenId, orcid, affiliation), `GET/PATCH /v1/account` with defaults returned for un-PATCHed users (no empty rows). _Landed 2026-05-21._

### Phase 4 — Realtime + ingest
- **4.1** ✓ MQTT ingest worker. Connects on bootstrap (skipped in `test` mode), subscribes to `tenants/+/stations/+/readings` at QoS 1, parses topic + body, verifies device JWT, rejects cross-tenant/cross-station tokens (`cross_tenant_denied`, `cross_station_denied`), validates the reading via class-validator and persists. _Landed 2026-05-21._
- **4.2** ✓ `npm run device:provision -- --tenant=<slug> --station=<uuid> [--device-id=<label>] [--expires-in=365d]`. Verifies tenant + station exist before signing; warns if `DEVICE_JWT_SECRET` is still at the dev default. _Landed 2026-05-21._
- **4.3** ✓ Already covered: `ReadingsService.ingest()` publishes to `ReadingsStreamService` immediately after persist, so any MQTT-arrived reading lands on the SSE feed without extra wiring. _Implicit on 2026-05-21._

### Phase 5 — Cross-cutting
- **5.1** ✓ In-process token-bucket rate limiter; 60/min + 10k/day per token; standard `X-RateLimit-*` headers; `429` body carries `retryAfterMs`. Swap-to-Redis is a one-file change behind the same interceptor surface. _Landed 2026-05-21._
- **5.2** ✓ Hourly token expiry sweeper. Single `UPDATE … WHERE status='active' AND expiresAt<=now()` per tenant. _Landed 2026-05-21._
- **5.3** ✓ Delivered with Phase 3.5 (`RequestLogInterceptor` + `request_logs` table). Retention prune cron remains Phase 6.
- **5.4** ✓ Anchor scheduler (default 5 min cadence; `ANCHOR_SCHEDULER_TICK_MS=0` to disable). _Landed 2026-05-21._
- **5.5** ◐ Adapter ready, SDK not installed. `HederaAnchorService.shouldUseLive()` flips on with `HEDERA_ENABLED=true` + operator creds; `submitLive()` throws `hedera_sdk_not_installed` until `@hashgraph/sdk` is added (a single-file change). Stub fallback wraps the live call so a misconfigured deploy still anchors locally. _Adapter prepped 2026-05-21; live SDK swap-in pending testnet credentials._
- **5.6** ✓ Forecast pre-warm scheduler (default 10 min cadence; aligns with the `ForecastsService` staleness window). _Landed 2026-05-21._

### Phase 6 — Ops + observability
- **6.1** ✓ `RequestLoggerMiddleware` stamps every request with `tid` (UUID, or pass-through from `X-Request-Id`), echoes back on `X-Request-Id`, emits one JSON line per request: `{tid, method, path, status, ms, tenant, userId, tokenId}`. Query strings masked so `?token=` never ships to logs. _Landed 2026-05-21._
- **6.2** ✓ `/health` is liveness (cheap, always 200). `/ready` hits master DB + checks the `migrations` table exists; per-check status reported; `503` when any required check fails. Per-tenant DB checks intentionally omitted so one bad tenant doesn't flip the whole pod Not-Ready. _Landed 2026-05-21._
- **6.3** ✓ `npm run backup:run` — `pg_dump | gzip` per active tenant + master, written under `<output>/YYYY-MM-DD/` with a `manifest.json` (filename + sha256 + bytes). Restore documented in the script header. _Landed 2026-05-21._
- **6.4** ✓ `npm run tenant:seed:demo -- --slug=<slug>`. Seeds station + 24h readings, three alerts (open/ack/resolved), one anchored Merkle batch with the real root over the seeded readings, two datasets, three exports (ready/failed/expired). Idempotent. _Landed 2026-05-21._
- **6.5** ✓ `app/error.tsx` root boundary + `app/research/error.tsx` scoped boundary. Both surface the Next-generated `error.digest` for support correlation. _Landed 2026-05-21._
- **6.6** ✓ 90-day `request_logs` prune folded into the hourly token sweeper. _Landed 2026-05-21._

### Phase 7 — Quality + cleanup
- **7.1** ◐ Playwright spec at [e2e/login-to-dashboard.spec.ts](e2e/login-to-dashboard.spec.ts). Skipped from the default `npm test`; needs `npm i --save-dev @playwright/test && npx playwright install` + a running stack. See [e2e/README.md](e2e/README.md). _Spec authored 2026-05-21; runner install deferred._
- **7.2** ◐ Playwright spec at [e2e/token-mint-to-v1-readings.spec.ts](e2e/token-mint-to-v1-readings.spec.ts). Same caveats as 7.1. _Spec authored 2026-05-21._
- **7.3** ✓ Vitest set up (`vitest.config.ts` + `npm test` in repo root). 6 tests at [services/api.test.ts](services/api.test.ts) pinning down `withMockFallback`'s `production` / `demo` / `test` branches. _Landed 2026-05-21._
- **7.4** ✓ Legacy `NEXT_PUBLIC_USE_MOCK_DATA` alias + derived `config.useMockData` flag deleted; lone consumer in `hooks/useSSEStream.ts` switched to `config.mode !== 'production'`. _Landed 2026-05-21._
- **7.5** ✓ Backend Jest config added; 17 unit tests covering load-bearing pure logic ([merkle.spec.ts](backend/src/integrity/merkle.spec.ts) + [threshold-evaluator.spec.ts](backend/src/alerts/threshold-evaluator.spec.ts)). Gated end-to-end provision test at [provision-tenant.integration.spec.ts](backend/src/database/scripts/provision-tenant.integration.spec.ts) runs with `npm run test:integration` against a real Postgres. _Landed 2026-05-21._

### Phase 8 — Wire-up audit + OpenAPI
- **8.1** ✓ Frontend × API × DB cross-audit. Every operations + research page widget walks through a service in `services/api.ts`; every service hits a `@Controller` route; every controller reads/writes a registered TypeORM entity with a matching migration. 12 tenant entities = 12 tenant migrations; 1 master entity = 1 master migration. _Audit 2026-05-22._
- **8.2** ✓ Operations `/settings` page wired. New `thresholds` + `opsNotifications` jsonb columns on `account_preferences` ([migration](backend/src/database/migrations/tenant/1731601300000-AddOperationsPrefs.ts)); `SettingsController` exposes `GET/PATCH /settings/preferences` (JWT auth) on the same row; FE settings page now reads/writes through a TanStack mutation with saved-flash UI. _Landed 2026-05-22._
- **8.3** ✓ Operations topbar `LiveDot` bound to real SSE state. `LiveStatusProvider` wraps `AppShell`; `/dashboard` + `/live` call `useReportLiveStatus({ connected, lastSyncAt, detail })`; topbar reads from the provider. Fallback when nothing reports: `offline`. _Landed 2026-05-22._
- **8.4** ✓ OpenAPI / Swagger UI. `@nestjs/swagger` mounted at `/docs` (interactive) + `/docs-json` (raw spec). 50 routes auto-discovered; 11 tag groups (`auth`, `stations`, `readings`, `device`, `alerts`, `forecasts`, `integrity`, `settings`, `tokens`, `v1`, `health`); two `bearerAuth` schemes (`jwt` + `api-token`) so the "Authorize" panel covers both. Disabled in production mode by default; flip `SWAGGER_ENABLED=true` to expose. _Landed 2026-05-22._
- **8.5** ✓ Docker Compose for the full stack. `docker compose up -d` brings up TimescaleDB, Mosquitto, a one-shot `migrate` job (master + tenant), backend, and frontend with healthcheck-gated startup. Multi-stage Dockerfiles, non-root runtime, Next.js standalone build. Fixed two boot-blockers along the way (tenant middleware mis-parsing `127.0.0.1` as slug `127`; `migrate-tenants` exiting 1 on empty master). _Landed 2026-05-28._
- **8.6** ✓ ESP32 hardware BOM. [docs/hardware-bom.md](docs/hardware-bom.md) + PDF cover the Phase 1 tethered prototype (USB-C, ~$45 from Amazon): ESP32 + BME280 + BH1750 + breadboard. Phase 2 (solar + 18650 + IP65 enclosure + Stevenson screen) documented for later. _Landed 2026-05-29._
- **8.7** ✓ Cross-tenant grant enforcement. `TokenAuthGuard` now falls through to a cross-tenant scan when the local table misses; on hit it checks the token's `scope.crossTenant: true`, an active `grants` row pointing at the requested tenant, and rejects non-GET methods (`cross_tenant_write_denied`). New `RolesGuard` + `@Roles('admin')` decorator. `AdminGrantsController` exposes `GET /admin/grants/incoming` (admin inbox; scans every other tenant's grants table), `PATCH /admin/grants/:homeTenantSlug/:grantId/{approve,revoke}` (writes back to the source tenant's row). 6 new guard-branch tests. 53 routes in the spec (+3). _Landed 2026-05-29._

---

## 5. Out of scope for "fully integrated"

These are real, but they're product decisions, not integration work. Listed here so they're not forgotten:

- Multi-station + multi-metric in a single `/v1/readings` call (currently single-station per request).
- `?cursor=` keyset pagination on `/v1/readings`.
- Custom alert rules (`Manage thresholds` button on the alerts page).
- Custom date-range picker (today only presets).
- Hover playhead on `MultiMetricChart`.
- Save-to-dataset flow from the Playground.
- Citation auto-prepend to exports.
- Real OpenAPI doc generation + the "OpenAPI · download" link in the docs sidebar.
- Multi-tenant invite flow (researcher requests access to a tenant they're not in).
- Mobile-specific polish for the research portal.
- WebSocket alternative to SSE for clients that prefer it.

---

## How to use this document

- **Strike off finished tasks inline** — change `❌ missing` → `✓ done`.
- **One PR per numbered task** (e.g. 1.2 = alerts module).
- **Cross-phase dependencies**: 2.x can't ship until the matching 1.x or 3.x backend module exists.
- **Mode switch must work at every phase boundary** — set `WH_MODE=production` and the part that's "done" should never fall back to mocks.
