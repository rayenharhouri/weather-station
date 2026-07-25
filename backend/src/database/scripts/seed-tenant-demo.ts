/**
 * Demo seed — populates a tenant with everything the UI demos need:
 *
 *   - station + 24h of synthetic readings (delegated to `seed-tenant.ts`'s
 *     readings logic, replicated here so the demo seed is one self-contained
 *     command)
 *   - three alerts (open, acknowledged, resolved)
 *   - one anchored integrity batch with the correct Merkle root
 *   - two saved datasets (one private, one public)
 *   - one export job in each terminal state (ready, failed, expired)
 *
 * Usage:
 *   npm run tenant:seed:demo -- --slug=enit
 *
 * Idempotent: re-running clears the 24h reading window + the demo alerts /
 * batches / datasets / exports it owns and re-creates them. Real tenant
 * data (older readings, user-minted tokens, etc.) is left alone.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { MasterDataSource } from '../master-data-source';
import { createTenantDataSource } from '../tenant-data-source.factory';
import { Tenant } from '../../tenancy/entities/tenant.entity';
import { Station } from '../../stations/entities/station.entity';
import { WeatherReading } from '../../readings/entities/weather-reading.entity';
import { Alert } from '../../alerts/entities/alert.entity';
import { IntegrityBatch } from '../../integrity/entities/integrity-batch.entity';
import { Dataset } from '../../datasets/entities/dataset.entity';
import { ExportJob } from '../../exports/entities/export-job.entity';
import { hashReading, merkleRoot } from '../../integrity/merkle';
import { createHash } from 'node:crypto';

interface Args {
  slug: string;
}

function parseArgs(argv: string[]): Args {
  const out: Record<string, string> = {};
  for (const tok of argv.slice(2)) {
    const m = tok.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  if (!out['slug']) {
    // eslint-disable-next-line no-console
    console.error('Missing --slug=<tenant>');
    process.exit(1);
  }
  return { slug: out['slug'].trim().toLowerCase() };
}

async function main(): Promise<void> {
  const { slug } = parseArgs(process.argv);

  await MasterDataSource.initialize();
  const tenant = await MasterDataSource.getRepository(Tenant).findOne({
    where: { slug, active: true },
  });
  await MasterDataSource.destroy();
  if (!tenant) {
    // eslint-disable-next-line no-console
    console.error(`No active tenant '${slug}'.`);
    process.exit(2);
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
    const stationRepo = ds.getRepository(Station);
    const readingRepo = ds.getRepository(WeatherReading);
    const alertRepo = ds.getRepository(Alert);
    const batchRepo = ds.getRepository(IntegrityBatch);
    const datasetRepo = ds.getRepository(Dataset);
    const exportRepo = ds.getRepository(ExportJob);

    // ── Station + 24h of readings (idempotent) ────────────────────
    const stationName = 'demo-rooftop';
    let station = await stationRepo.findOne({ where: { name: stationName } });
    if (!station) {
      station = stationRepo.create({
        name: stationName,
        location: tenant.location ?? 'Demo Rooftop',
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
    }

    const readings = await seedReadings(readingRepo, station.id);
    // eslint-disable-next-line no-console
    console.log(`▸ readings: ${readings.length}`);

    // ── Alerts (one open, one acknowledged, one resolved) ─────────
    await alertRepo.delete({ stationId: station.id });
    const now = new Date();
    await alertRepo.save([
      alertRepo.create({
        stationId: station.id,
        metric: 'temperature',
        threshold: 35,
        actualValue: 36.4,
        severity: 'warning',
        status: 'open',
        message: 'Temperature exceeded 35°C (current: 36.4°C)',
        triggeredAt: new Date(now.getTime() - 30 * 60_000),
      }),
      alertRepo.create({
        stationId: station.id,
        metric: 'humidity',
        threshold: 90,
        actualValue: 92.1,
        severity: 'warning',
        status: 'acknowledged',
        message: 'Humidity exceeded 90% (current: 92.1%)',
        triggeredAt: new Date(now.getTime() - 2 * 60 * 60_000),
        acknowledgedAt: new Date(now.getTime() - 90 * 60_000),
      }),
      alertRepo.create({
        stationId: station.id,
        metric: 'rainfall',
        threshold: 10,
        actualValue: 14.2,
        severity: 'warning',
        status: 'resolved',
        message: 'Rainfall exceeded 10mm (current: 14.2mm)',
        triggeredAt: new Date(now.getTime() - 6 * 60 * 60_000),
        acknowledgedAt: new Date(now.getTime() - 5 * 60 * 60_000),
        resolvedAt: new Date(now.getTime() - 4 * 60 * 60_000),
      }),
    ]);
    // eslint-disable-next-line no-console
    console.log(`▸ alerts: 3 (open · acknowledged · resolved)`);

    // ── Integrity batch (real Merkle root over the seeded readings) ─
    await batchRepo.delete({ stationId: station.id });
    if (readings.length > 0) {
      const sorted = [...readings].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
      );
      const leaves = sorted.map(hashReading);
      const root = merkleRoot(leaves);
      const dataHash = createHash('sha256').update(leaves.join('')).digest('hex');
      const anchorSeed = createHash('sha256')
        .update(`${tenant.slug}|demo|${root}`)
        .digest('hex');
      const topicShard = parseInt(anchorSeed.slice(0, 8), 16) % 1_000_000;
      const seqNumber = (parseInt(anchorSeed.slice(8, 16), 16) % 9_999_999) + 1;
      await batchRepo.save(
        batchRepo.create({
          stationId: station.id,
          timeWindowStart: sorted[0].recordedAt,
          timeWindowEnd: sorted[sorted.length - 1].recordedAt,
          recordCount: sorted.length,
          merkleRoot: root,
          dataHash,
          hederaTopicId: `0.0.${1_000_000 + topicShard}`,
          hederaSequenceNumber: seqNumber,
          hederaTransactionId: `0.0.${500_000 + (topicShard % 100_000)}@1716000000.000000000`,
          consensusTimestamp: new Date(),
          mirrorNodeVerified: true,
          verifiedAt: new Date(),
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`▸ integrity batch: root=${root.slice(0, 12)}…  leaves=${leaves.length}`);
    }

    // ── Datasets ──────────────────────────────────────────────────
    await datasetRepo
      .createQueryBuilder()
      .delete()
      .where('title LIKE :p', { p: 'Demo:%' })
      .execute();
    await datasetRepo.save([
      datasetRepo.create({
        ownerId: null,
        title: 'Demo: 24h temperature snapshot',
        description: 'Rolling 24-hour temperature readings from the demo rooftop.',
        visibility: 'public',
        metric: 'temperature',
        stationName: station.name,
        stationId: station.id,
        windowStart: new Date(now.getTime() - 24 * 60 * 60_000),
        windowEnd: now,
        recordCount: readings.length,
        sizeBytes: String(readings.length * 60),
        formats: ['csv', 'json'],
        citation: '10.5281/zenodo.demo.001',
        playgroundHref: null,
      }),
      datasetRepo.create({
        ownerId: null,
        title: 'Demo: storm front pressure (private)',
        description: 'Saved query from the Playground covering a storm-front pressure dip.',
        visibility: 'private',
        metric: 'pressure',
        stationName: station.name,
        stationId: station.id,
        windowStart: new Date(now.getTime() - 60 * 60_000),
        windowEnd: now,
        recordCount: 12,
        sizeBytes: '2400',
        formats: ['csv'],
        citation: null,
        playgroundHref: null,
      }),
    ]);
    // eslint-disable-next-line no-console
    console.log(`▸ datasets: 2 (1 public · 1 private)`);

    // ── Exports (one ready, one failed, one expired) ──────────────
    await exportRepo
      .createQueryBuilder()
      .delete()
      .where('name LIKE :p', { p: 'Demo:%' })
      .execute();
    await exportRepo.save([
      exportRepo.create({
        userId: '00000000-0000-0000-0000-000000000000',
        name: 'Demo: temperature · last 24h',
        metric: 'temperature',
        stationId: station.id,
        stationName: station.name,
        windowStart: new Date(now.getTime() - 24 * 60 * 60_000),
        windowEnd: now,
        format: 'csv',
        status: 'ready',
        requestedAt: new Date(now.getTime() - 45 * 60_000),
        startedAt: new Date(now.getTime() - 44 * 60_000),
        finishedAt: new Date(now.getTime() - 42 * 60_000),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000),
        recordCount: readings.length,
        sizeBytes: String(readings.length * 60),
        progressPct: 100,
        errorMessage: null,
        filePath: null,
      }),
      exportRepo.create({
        userId: '00000000-0000-0000-0000-000000000000',
        name: 'Demo: pressure · 30d raw',
        metric: 'pressure',
        stationId: station.id,
        stationName: station.name,
        windowStart: new Date(now.getTime() - 30 * 24 * 60 * 60_000),
        windowEnd: now,
        format: 'parquet',
        status: 'failed',
        requestedAt: new Date(now.getTime() - 2 * 60 * 60_000),
        startedAt: new Date(now.getTime() - 2 * 60 * 60_000),
        finishedAt: new Date(now.getTime() - 2 * 60 * 60_000 + 30_000),
        expiresAt: null,
        recordCount: null,
        sizeBytes: null,
        progressPct: 0,
        errorMessage: 'upstream_unavailable',
        filePath: null,
      }),
      exportRepo.create({
        userId: '00000000-0000-0000-0000-000000000000',
        name: 'Demo: humidity · Q1',
        metric: 'humidity',
        stationId: station.id,
        stationName: station.name,
        windowStart: new Date(now.getTime() - 120 * 24 * 60 * 60_000),
        windowEnd: new Date(now.getTime() - 30 * 24 * 60 * 60_000),
        format: 'json',
        status: 'expired',
        requestedAt: new Date(now.getTime() - 14 * 24 * 60 * 60_000),
        startedAt: new Date(now.getTime() - 14 * 24 * 60 * 60_000),
        finishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60_000 + 5 * 60_000),
        expiresAt: new Date(now.getTime() - 8 * 24 * 60 * 60_000),
        recordCount: 51_840,
        sizeBytes: '6300000',
        progressPct: 100,
        errorMessage: null,
        filePath: null,
      }),
    ]);
    // eslint-disable-next-line no-console
    console.log(`▸ exports: 3 (ready · failed · expired)`);

    // eslint-disable-next-line no-console
    console.log(`\n✓ Demo seed complete for tenant '${slug}'.`);
  } finally {
    await ds.destroy();
  }
}

// ── Synthetic readings ────────────────────────────────────────────
async function seedReadings(repo: any, stationId: string): Promise<WeatherReading[]> {
  const hours = 24;
  const intervalMin = 5;
  const samples = Math.floor((hours * 60) / intervalMin);
  const now = Date.now();

  await repo.query(
    `DELETE FROM "readings" WHERE "stationId" = $1 AND "recordedAt" > now() - interval '${hours} hours'`,
    [stationId],
  );

  const rows: Partial<WeatherReading>[] = [];
  for (let i = samples; i >= 0; i--) {
    const recordedAt = new Date(now - i * intervalMin * 60_000);
    const hourOfDay = recordedAt.getHours() + recordedAt.getMinutes() / 60;
    const tempBase = 18 + 8 * Math.sin(((hourOfDay - 8) * Math.PI) / 12);
    const humidityBase = 65 - 25 * Math.sin(((hourOfDay - 8) * Math.PI) / 12);
    rows.push({
      stationId,
      deviceId: 'esp32-demo-001',
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
  return repo.save(rows);
}

function jitter(amp: number): number {
  return (Math.random() - 0.5) * 2 * amp;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number, dec: number): number {
  const m = 10 ** dec;
  return Math.round(n * m) / m;
}
function sinDay(h: number): number {
  if (h < 6 || h > 19) return 0;
  return Math.sin(((h - 6) * Math.PI) / 13);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n✗ demo seed failed:', err);
  process.exit(1);
});
