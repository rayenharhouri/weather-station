# WeatherHub — multi-tenant campus weather monitoring platform

Next.js operations dashboard + researcher portal, NestJS multi-tenant API,
TimescaleDB hypertables, MQTT ingest from ESP32 stations, SSE live data,
Merkle-batched integrity anchoring (Hedera adapter stubbed by default).

---

## Quick start — full stack in one command

You need Docker + Docker Compose. Everything else is in containers.

```sh
docker compose up -d        # build + start db, mqtt, backend, frontend
```

Five containers come up:

| Service       | Port | URL                              |
|---------------|------|----------------------------------|
| frontend      | 3000 | http://localhost:3000            |
| backend       | 3001 | http://localhost:3001            |
| Swagger UI    | 3001 | http://localhost:3001/docs       |
| TimescaleDB   | 5432 | `psql postgres://weatherhub:weatherhub@localhost/weatherhub_master` |
| Mosquitto     | 1883 | `mqtt://localhost:1883` (no auth in dev) |

The `migrate` one-shot runs master + tenant migrations before the backend
boots, so the first `up` is safe on an empty volume.

### First-run tenant provisioning

The stack starts with no tenants. Mint one + seed demo data:

```sh
docker compose exec backend node node_modules/.bin/ts-node \
  -r tsconfig-paths/register src/database/scripts/provision-tenant.ts \
  --slug=enit --name="ENIT Tunis" \
  --admin-email=admin@enit.test --admin-password=demo-pass-change-me

docker compose exec backend node dist/database/scripts/seed-tenant-demo.js \
  --slug=enit
```

Then log in at <http://localhost:3000/login> with `admin@enit.test` /
`demo-pass-change-me`.

### Provision an ESP32 device JWT

```sh
docker compose exec backend node dist/database/scripts/device-provision.js \
  --tenant=enit --station=<station-uuid>
```

Capture the printed token + topic, flash it onto the device.

### Tear down

```sh
docker compose down            # keep data volumes
docker compose down -v         # nuke volumes too (fresh DB next boot)
```

### Customising the deploy

Compose variables you can set at `up` time:

| Variable              | Default                    | What it does |
|-----------------------|----------------------------|--------------|
| `WH_MODE`             | `demo`                     | `production` / `demo` / `test` |
| `PUBLIC_API_URL`      | `http://localhost:3001`    | Baked into the frontend bundle |
| `JWT_SECRET`          | dev default                | Refuse-to-boot in `production` if left at default |
| `DEVICE_JWT_SECRET`   | dev default                | Same guardrail |
| `CORS_ORIGIN`         | `http://localhost:3000`    | Frontend origin allowed by the backend |

For real deployments, override these in a `.env` at the repo root:

```sh
echo "WH_MODE=production
JWT_SECRET=$(openssl rand -base64 48)
DEVICE_JWT_SECRET=$(openssl rand -base64 48)
PUBLIC_API_URL=https://api.weatherhub.tn
CORS_ORIGIN=https://weatherhub.tn" > .env
docker compose up -d --build
```

---

A production-ready Next.js frontend for intelligent campus weather monitoring with real-time data, analytics, forecasting, alerts, and Hedera blockchain-backed data integrity verification.

## Features

### Core Functionality
- **Real-time Dashboard**: Live weather metrics with quick-glance overview cards
- **Live Monitoring**: SSE-powered real-time data streams with pause/resume controls  
- **Historical Analytics**: Comprehensive charting and trend analysis with multiple time ranges
- **Short-term Forecasting**: Local AI-powered weather predictions with confidence scores
- **Alert Management**: Threshold-based anomaly detection with severity levels and status tracking
- **Data Integrity**: Hedera blockchain verification for immutable weather records
- **Multi-station Ready**: Architecture prepared for future expansion to multiple campus locations
- **User Settings**: Profile management, theme control, and notification preferences

### Technical Highlights
- **Modern Tech Stack**: Next.js 14+ with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Data Management**: TanStack Query for caching and synchronization, Zod for type-safe validation
- **Real-time Management**: Server-Sent Events (SSE) for live data and alert streams
- **Authentication**: Role-based access control (Admin, Researcher, Viewer)
- **Responsive Design**: Mobile-first design supporting desktop, tablet, and phone
- **Light/Dark Theme**: Full dark mode support with system preference detection
- **Mock Data Mode**: Full offline functionality with simulated data for development and demo
- **Error Handling**: Comprehensive error boundaries, fallbacks, and user feedback

## Quick Start

### Installation
1. Clone and install:
   ```bash
   cd weather-station
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```

3. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials
- Email: `admin@university.edu`
- Password: `password`

## Architecture

- **App Router**: Modern Next.js page routing
- **Server Components**: Optimized rendering where beneficial
- **Client Components**: Interactive dashboards and real-time features
- **API Layer**: Centralized service functions with Zod validation
- **Authentication**: Context-based auth with role verification
- **Mock Mode**: Complete offline functionality with realistic data
- **Theme Management**: next-themes for light/dark mode
- **Data Fetching**: TanStack Query for intelligent caching

## API Endpoints Required

```
POST   /auth/login
GET    /auth/me
GET    /stations
GET    /stations/:stationId
GET    /readings/latest?stationId=
GET    /readings/history?stationId=&from=&to=&interval=
GET    /readings/summary?stationId=&range=
GET    /readings/stream?stationId=                      (SSE)
GET    /device/status?stationId=
GET    /forecasts?stationId=&horizon=
GET    /alerts?stationId=&status=&severity=
PATCH  /alerts/:id/ack
PATCH  /alerts/:id/resolve
GET    /alerts/stream?stationId=                        (SSE)
GET    /integrity/batches?stationId=
GET    /integrity/batches/:batchId
POST   /integrity/verify-record
POST   /integrity/verify-batch
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_MOCK_DATA_DELAY=500
NODE_ENV=development
```

## Production Build

```bash
npm run build
npm start
```

## Key Features by Page

### Dashboard (`/dashboard`)
- Real-time weather metrics
- Station health overview
- Quick trend widgets
- Latest alerts summary
- Forecast snippet
- Data integrity status

### Live Monitor (`/live`)
- Real-time SSE streams
- Live mini-charts (15-60 min)
- Pause/resume controls
- Connection status indicator
- Abnormal value highlighting

### Analytics (`/analytics`)
- Historical data charts
- Configurable time ranges
- Multiple metric visualization
- Summary statistics (min/max/avg)
- CSV export (placeholder)

### Forecasts (`/forecasts`)
- Short-term predictions (1-3h)
- Confidence scoring
- Local station-based forecasts
- Temperature/pressure/humidity trends
- Rain probability visualization

### Alerts (`/alerts`)
- Comprehensive alert list
- Severity filtering
- Status management (open/acknowledged/resolved)
- Threshold context
- Timestamp tracking

### Integrity (`/integrity`)
- Hedera blockchain anchors
- Record verification form
- Batch membership checking
- Transaction references
- Mirror node verification status

### Stations (`/stations`)
- Station inventory
- Location information
- Enabled sensors list
- Connection status
- Last sync timestamp

### Settings (`/settings`)
- Profile information
- Theme preferences
- Notification settings (placeholder)
- Alert threshold configuration
- Security options

## Development Tips

### Enable Mock Mode
```bash
NEXT_PUBLIC_USE_MOCK_DATA=true npm run dev
```

### Connect to Backend
```bash
NEXT_PUBLIC_API_URL=http://your-api:3001 \
NEXT_PUBLIC_USE_MOCK_DATA=false \
npm run dev
```

### Debug SSE Connections
Open browser DevTools → Network tab, filter for "fetch", look for SSE stream connections.

### Add New Page
1. Create `app/newpage/page.tsx`
2. Wrap with `<ProtectedRoute>` and `<DashboardLayout>`
3. Add route to navigation in `DashboardLayout`

## Styling

- **Framework**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Icons**: lucide-react  
- **Charts**: Recharts

## Performance

- Query caching with TanStack Query
- Automatic code splitting with Next.js
- Optimized image handling
- Efficient SSE stream management
- Mock mode for instant development

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Won't load | Check Node.js version (18+), run `npm install` |
| API errors | Set mock mode to true, or check backend is running |
| Login fails | Use demo credentials: admin@university.edu / password |
| Dark mode broken | Clear localStorage and browser cache |
| SSE disconnects | Check backend supports SSE, or use mock mode |

## Project Structure

```
app/                  # Next.js App Router pages
├── layout.tsx        # Root layout with providers
├── login/            # Login page
├── dashboard/        # Main overview
├── live/             # Real-time monitoring
├── analytics/        # Historical analysis
├── forecasts/        # Predictions
├── alerts/           # Alert management
├── integrity/        # Blockchain verification
├── stations/         # Station management
└── settings/         # User preferences

components/
├── ui/               # shadcn/ui components
├── auth/             # Auth related components
├── layout/           # Layout shells
└── dashboard/        # Feature components

services/
└── api.ts            # Centralized API layer

hooks/
├── useAuth.ts        # Auth hook
└── useSSEStream.ts   # Real-time stream hook

providers/
├── AuthProvider.tsx  # Auth context
├── Providers.tsx     # Theme provider
└── QueryProvider.tsx # TanStack Query provider

lib/
├── api-client.ts     # HTTP client
├── config.ts         # Configuration
├── constants.ts      # Business constants
├── mock-data.ts      # Mock data generator
├── utils.ts          # Utility functions
└── validation.ts     # Zod schemas

types/
└── index.ts          # TypeScript definitions
```

## Dependencies

- **next@14+**: React framework with App Router
- **react@18+**: UI library
- **typescript**: Type safety
- **@tanstack/react-query**: Data fetching & caching
- **zod**: Runtime validation
- **react-hook-form**: Form management
- **tailwindcss@4**: Styling
- **shadcn/ui**: Accessible UI components
- **recharts**: Data visualization
- **lucide-react**: Icon library
- **next-themes**: Theme management

## Future Enhancements

- Push notifications for alerts
- Advanced forecasting with external APIs
- PDF/CSV data export
- Customizable dashboard widgets
- ML-based anomaly detection
- Multi-user collaboration
- Mobile app
- Real device integration

## License

MIT

---

**Built for smart campus weather monitoring with Next.js, TypeScript, and Hedera blockchain integration.**
