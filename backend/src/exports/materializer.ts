import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Repository } from 'typeorm';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { ExportFormat, ExportJob } from './entities/export-job.entity';

const METRIC_FIELDS: Array<keyof WeatherReading> = [
  'temperatureC',
  'humidityPct',
  'pressureHpa',
  'rainfallMm',
  'lightLux',
  'airQualityValue',
  'batteryVoltage',
  'signalRssi',
];

/**
 * Materialise the requested slice of readings into a single file on disk.
 * Streams rows page-by-page so we never hold the full result set in memory
 * — important once a tenant has months of data.
 *
 * Progress reporting is coarse: we tick a callback after each page-write so
 * the UI gets a usable bar without us having to know the total count up
 * front. `onProgress` returns the new progress percent (0–100).
 */
export interface MaterializeOptions {
  job: ExportJob;
  readingRepo: Repository<WeatherReading>;
  rootDir: string;
  tenantSlug: string;
  pageSize?: number;
  onProgress?: (pct: number) => Promise<void> | void;
}

export interface MaterializeResult {
  filePath: string;
  recordCount: number;
  sizeBytes: number;
}

export async function materialize(opts: MaterializeOptions): Promise<MaterializeResult> {
  const { job, readingRepo, rootDir, tenantSlug, pageSize = 1000, onProgress } = opts;

  const filePath = join(rootDir, tenantSlug, `${job.id}.${job.format}`);
  await mkdir(dirname(filePath), { recursive: true });

  const out = createWriteStream(filePath, { encoding: 'utf8' });
  let recordCount = 0;
  let firstChunk = true;

  // Approximate total for progress: count first, then page. Two scans is
  // wasteful but the count query is fast and the alternative — guessing
  // progress from time elapsed — is worse for UX.
  const total = await countReadings(readingRepo, job);

  try {
    if (job.format === 'json') out.write('[');

    let offset = 0;
    while (true) {
      const page = await fetchPage(readingRepo, job, offset, pageSize);
      if (page.length === 0) break;

      for (const reading of page) {
        const line = formatRow(reading, job.format, firstChunk);
        out.write(line);
        firstChunk = false;
      }
      recordCount += page.length;
      offset += page.length;

      if (onProgress) {
        const pct = total > 0 ? Math.min(99, (recordCount / total) * 100) : 50;
        await onProgress(pct);
      }
      if (page.length < pageSize) break;
    }

    if (job.format === 'json') out.write(']');
    else if (job.format === 'csv' && firstChunk) out.write(csvHeader() + '\n');
  } finally {
    await new Promise<void>((resolve, reject) => {
      out.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  }

  // CSVs are easy: prepend header if we wrote at least one row. For
  // streaming simplicity we emit the header inline on the first row.
  const stats = await stat(filePath);
  return { filePath, recordCount, sizeBytes: stats.size };
}

async function countReadings(repo: Repository<WeatherReading>, job: ExportJob): Promise<number> {
  let qb = repo
    .createQueryBuilder('r')
    .where('r."recordedAt" >= :start', { start: job.windowStart })
    .andWhere('r."recordedAt" <= :end', { end: job.windowEnd });
  if (job.stationId) qb = qb.andWhere('r."stationId" = :stationId', { stationId: job.stationId });
  return qb.getCount();
}

async function fetchPage(
  repo: Repository<WeatherReading>,
  job: ExportJob,
  offset: number,
  limit: number,
): Promise<WeatherReading[]> {
  let qb = repo
    .createQueryBuilder('r')
    .where('r."recordedAt" >= :start', { start: job.windowStart })
    .andWhere('r."recordedAt" <= :end', { end: job.windowEnd })
    .orderBy('r."recordedAt"', 'ASC')
    .offset(offset)
    .limit(limit);
  if (job.stationId) qb = qb.andWhere('r."stationId" = :stationId', { stationId: job.stationId });
  return qb.getMany();
}

function formatRow(r: WeatherReading, format: ExportFormat, isFirst: boolean): string {
  if (format === 'json') {
    const prefix = isFirst ? '\n' : ',\n';
    return prefix + JSON.stringify(r);
  }
  if (format === 'csv') {
    const header = isFirst ? csvHeader() + '\n' : '';
    const cells = [
      r.id,
      r.stationId,
      r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
      ...METRIC_FIELDS.map((f) => formatCell(r[f])),
    ];
    return header + cells.join(',') + '\n';
  }
  // parquet: not implemented in Phase 3.4 (needs an Arrow/Parquet writer
  // dependency). We fall back to NDJSON with a `.parquet` extension that
  // the docs page warns about. A real Parquet writer is a 5+ task.
  return JSON.stringify(r) + '\n';
}

function csvHeader(): string {
  return ['id', 'station_id', 'recorded_at', ...METRIC_FIELDS].join(',');
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (/[,"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  }
  return String(v);
}
