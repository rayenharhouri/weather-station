import 'reflect-metadata';
import 'dotenv/config';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';
import { Station } from '../../stations/entities/station.entity';
import { WeatherReading } from '../../readings/entities/weather-reading.entity';

/**
 * Seed a station and 24 hours of synthetic readings into a tenant database.
 *
 * Usage:
 *   npm run tenant:seed -- --slug=enit
 *
 * Optional flags:
 *   --station-name="ENIT-001"     # default
 *   --hours=24                    # how many hours of readings to fabricate
 *   --interval-minutes=5          # spacing between readings
 */
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tok of argv.slice(2)) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv);
  const slug = args['slug'];
  if (!slug) {
    // eslint-disable-next-line no-console
    console.error('Missing --slug=<tenant>');
    process.exit(1);
  }

  await MasterDataSource.initialize();
  const tenant = await MasterDataSource.getRepository(Tenant).findOne({
    where: { slug, active: true },
  });
  if (!tenant) {
    // eslint-disable-next-line no-console
    console.error(`No active tenant '${slug}'.`);
    await MasterDataSource.destroy();
    process.exit(1);
  }

  const ds = createTenantDataSource({
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    username: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    database: tenant.dbName,
  });
  await ds.initialize();

  try {
    // 1. Upsert a station
    const stationName = args['station-name'] ?? 'ENIT-001';
    const stationRepo = ds.getRepository(Station);
    let station = await stationRepo.findOne({ where: { name: stationName } });
    if (!station) {
      station = stationRepo.create({
        name: stationName,
        location: tenant.location ?? 'Campus quad',
        latitude: 36.832,
        longitude: 10.146,
        status: 'online',
        lastSyncedAt: new Date(),
        enabledSensors: [
          'temperature',
          'humidity',
          'pressure',
          'rainfall',
          'light',
          'airQuality',
          'battery',
          'signal',
        ],
      });
      station = await stationRepo.save(station);
      // eslint-disable-next-line no-console
      console.log(`▸ created station ${station.name} (${station.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`▸ station ${station.name} (${station.id}) already exists`);
    }

    // 2. Fabricate readings — simple sinusoid + noise over the requested window
    const hours = parseInt(args['hours'] ?? '24', 10);
    const intervalMin = parseInt(args['interval-minutes'] ?? '5', 10);
    const samples = Math.floor((hours * 60) / intervalMin);
    const now = Date.now();
    const readingRepo = ds.getRepository(WeatherReading);

    // Clear prior readings for this station window to keep seed idempotent.
    await readingRepo.query(
      `DELETE FROM "readings" WHERE "stationId" = $1 AND "recordedAt" > now() - interval '${hours} hours'`,
      [station.id],
    );

    const rows: Partial<WeatherReading>[] = [];
    for (let i = samples; i >= 0; i--) {
      const recordedAt = new Date(now - i * intervalMin * 60 * 1000);
      const hourOfDay = recordedAt.getHours() + recordedAt.getMinutes() / 60;
      // Day cycle 18°C ± 8 with peak at 14:00
      const tempBase = 18 + 8 * Math.sin(((hourOfDay - 8) * Math.PI) / 12);
      const humidityBase = 65 - 25 * Math.sin(((hourOfDay - 8) * Math.PI) / 12);

      rows.push({
        stationId: station.id,
        deviceId: 'esp32-seed-001',
        recordedAt,
        receivedAt: recordedAt,
        temperatureC: round(tempBase + jitter(0.6), 2),
        humidityPct: round(clamp(humidityBase + jitter(3), 10, 100), 1),
        pressureHpa: round(1013 + jitter(2), 1),
        rainfallMm: Math.random() < 0.05 ? round(Math.random() * 1.5, 2) : 0,
        lightLux: Math.max(0, Math.round(80000 * sinDay(hourOfDay) + jitter(4000))),
        airQualityValue: Math.round(40 + jitter(10)),
        batteryVoltage: round(3.9 + jitter(0.05), 2),
        signalRssi: Math.round(-60 + jitter(8)),
      });
    }

    await readingRepo.save(rows);
    // eslint-disable-next-line no-console
    console.log(`▸ inserted ${rows.length} readings spanning ${hours}h`);
  } finally {
    await ds.destroy();
    await MasterDataSource.destroy();
  }
  // eslint-disable-next-line no-console
  console.log('\n✓ Seed complete.');
}

function jitter(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(n * m) / m;
}

// Daylight curve — 0 at night, ~1 at solar noon. Used for the light sensor.
function sinDay(hour: number): number {
  if (hour < 6 || hour > 19) return 0;
  return Math.sin(((hour - 6) * Math.PI) / 13);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n✗ seed failed:', err);
  process.exit(1);
});
