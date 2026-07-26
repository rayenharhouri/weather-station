import 'reflect-metadata';
import 'dotenv/config';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';
import { Station } from '../../stations/entities/station.entity';
import { WeatherReading } from '../../readings/entities/weather-reading.entity';

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
    console.error('Missing --slug=<tenant>');
    process.exit(1);
  }

  await MasterDataSource.initialize();
  const tenant = await MasterDataSource.getRepository(Tenant).findOne({
    where: { slug, active: true },
  });
  if (!tenant) {
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
      console.log(`▸ created station ${station.name} (${station.id})`);
    } else {
      console.log(`▸ station ${station.name} (${station.id}) already exists`);
    }

    const hours = parseInt(args['hours'] ?? '24', 10);
    const intervalMin = parseInt(args['interval-minutes'] ?? '5', 10);
    const samples = Math.floor((hours * 60) / intervalMin);
    const now = Date.now();
    const readingRepo = ds.getRepository(WeatherReading);

    await readingRepo.query(
      `DELETE FROM "readings" WHERE "stationId" = $1 AND "recordedAt" > now() - interval '${hours} hours'`,
      [station.id],
    );

    const rows: Partial<WeatherReading>[] = [];
    for (let i = samples; i >= 0; i--) {
      const recordedAt = new Date(now - i * intervalMin * 60 * 1000);
      const hourOfDay = recordedAt.getHours() + recordedAt.getMinutes() / 60;
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
    console.log(`▸ inserted ${rows.length} readings spanning ${hours}h`);
  } finally {
    await ds.destroy();
    await MasterDataSource.destroy();
  }
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

function sinDay(hour: number): number {
  if (hour < 6 || hour > 19) return 0;
  return Math.sin(((hour - 6) * Math.PI) / 13);
}

run().catch((err) => {
  console.error('\n✗ seed failed:', err);
  process.exit(1);
});
