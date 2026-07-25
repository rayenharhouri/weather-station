# WeatherHub Backend

Multi-tenant NestJS API + MQTT ingest worker for ESP32 weather stations.

## Architecture (quick map)

- **Database-per-tenant.** Each university gets its own Postgres database named `tenant_<slug>`. A master database (`weatherhub_master`) holds only the tenant registry.
- **Postgres + TimescaleDB** for both master and tenant DBs (readings will be a hypertable).
- **Mosquitto MQTT broker** for device ingest. ESP32 devices publish to `tenants/{tid}/stations/{sid}/readings`.
- **JWT auth** for users (Authorization Bearer header) and devices (MQTT username+password).
- **Hedera anchoring** is stubbed for MVP — Merkle roots are computed and stored locally; real anchoring is Phase 2.

## Running locally

```bash
# 1. Start Postgres (TimescaleDB) and Mosquitto from the repo root
docker compose up -d

# 2. Install backend deps
cd backend
cp .env.example .env
npm install

# 3. Create the tenant registry tables (master DB)
npm run migration:master:run

# 4. Start the API (auto-reload)
npm run start:dev
```

API will be on `http://localhost:3001`. The frontend's `lib/config.ts` already points at that URL — flip `NEXT_PUBLIC_USE_MOCK_DATA=false` in the frontend's env to consume real data.

## Project layout

```
backend/
├── src/
│   ├── main.ts                        # bootstrap
│   ├── app.module.ts                  # composition root
│   ├── config/                        # env-driven configuration
│   ├── database/
│   │   ├── master-data-source.ts      # TypeORM DataSource for the master DB
│   │   ├── tenant-data-source.factory.ts  # builds DataSources per tenant
│   │   └── migrations/master/         # master-DB migrations
│   ├── tenancy/
│   │   ├── tenant.module.ts
│   │   ├── entities/tenant.entity.ts  # tenants table in master
│   │   ├── tenant.service.ts          # registry + DataSource cache
│   │   └── tenant-context.middleware.ts  # resolves tid from subdomain/JWT
│   ├── health/                        # GET /health smoke test
│   └── common/                        # shared decorators, filters, etc.
└── .env.example
```

## Future phases (not yet built)

- **Auth module** — `/auth/login`, `/auth/me`, JWT issue+verify, per-tenant users.
- **Stations + Readings** — REST endpoints to match `services/api.ts` frontend contract.
- **MQTT ingest worker** — subscribes to `tenants/+/stations/+/readings`, routes to tenant DataSource.
- **SSE** — `/readings/stream?stationId=` push channel for the live dashboard.
- **Alerts** — threshold evaluator, ack/resolve.
- **Integrity** — Merkle batching, anchor cron, verify endpoints.
- **Forecasts** — simple statistical forecast from recent readings.

## Tenant provisioning

A tenant is created by:
1. Inserting a row in `master.tenants` with `{slug, dbName, hederaAccountId?}`.
2. Running `CREATE DATABASE tenant_<slug>` from a privileged connection.
3. Connecting to that new DB, running `CREATE EXTENSION timescaledb;`, then applying tenant migrations.
4. Seeding an initial admin user.

`npm run tenant:provision -- --slug enit --name "ENIT Campus"` will do all four (script to be added in the next phase).
