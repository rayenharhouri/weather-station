import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AlertsService } from '../alerts/alerts.service';
import { StationsService } from '../stations/stations.service';
import { TenantService } from '../tenancy/tenant.service';
import { IngestReadingDto } from './dto/ingest-reading.dto';
import {
  AggregationInterval,
  HistoryQueryDto,
  SummaryQueryDto,
} from './dto/history-query.dto';
import { WeatherReading } from './entities/weather-reading.entity';
import { ReadingsStreamService } from './readings-stream.service';

export type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'light'
  | 'airQuality';

const METRIC_COLUMN: Record<MetricKey, string> = {
  temperature: 'temperatureC',
  humidity: 'humidityPct',
  pressure: 'pressureHpa',
  rainfall: 'rainfallMm',
  light: 'lightLux',
  airQuality: 'airQualityValue',
};

const INTERVAL_BUCKET: Record<AggregationInterval, string | null> = {
  raw: null,
  '5m': '5 minutes',
  '15m': '15 minutes',
  '1h': '1 hour',
  '1d': '1 day',
};

const RANGE_MS: Record<NonNullable<SummaryQueryDto['range']>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

export interface WeatherSummary {
  stationId: string;
  metric: MetricKey;
  period: string;
  min: number;
  max: number;
  avg: number;
  trend: 'up' | 'down' | 'stable';
  dataCount: number;
}

export type SignalStrength = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface DeviceStatus {
  stationId: string;
  lastReceivedAt: string;
  signalStrength: SignalStrength;
  batteryLevel?: number;
  memoryUsage?: number;
  uptime?: number;
  recordsProcessed?: number;
}

function bucketRssi(rssi: number | null): SignalStrength {
  if (rssi == null) return 'none';
  if (rssi >= -50) return 'excellent';
  if (rssi >= -60) return 'good';
  if (rssi >= -70) return 'fair';
  if (rssi >= -85) return 'poor';
  return 'none';
}

function voltageToPercent(volts: number | null): number | undefined {
  if (volts == null) return undefined;
  const min = 3.3;
  const max = 4.2;
  if (volts <= min) return 0;
  if (volts >= max) return 100;
  return Math.round(((volts - min) / (max - min)) * 100);
}

@Injectable()
export class ReadingsService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly stationsService: StationsService,
    private readonly stream: ReadingsStreamService,
    private readonly alerts: AlertsService,
  ) {}

  private async repo(tenantSlug: string): Promise<Repository<WeatherReading>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(WeatherReading);
  }

  async findLatest(tenantSlug: string, stationId: string): Promise<WeatherReading | null> {
    const repo = await this.repo(tenantSlug);
    return repo
      .createQueryBuilder('r')
      .where('r."stationId" = :stationId', { stationId })
      .orderBy('r."recordedAt"', 'DESC')
      .limit(1)
      .getOne();
  }

  async findHistory(
    tenantSlug: string,
    query: HistoryQueryDto,
  ): Promise<WeatherReading[]> {
    const repo = await this.repo(tenantSlug);
    const interval = query.interval ?? 'raw';
    const bucket = INTERVAL_BUCKET[interval];

    if (!bucket) {
      return repo
        .createQueryBuilder('r')
        .where('r."stationId" = :stationId', { stationId: query.stationId })
        .andWhere('r."recordedAt" >= :from', { from: query.from })
        .andWhere('r."recordedAt" <= :to', { to: query.to })
        .orderBy('r."recordedAt"', 'ASC')
        .getMany();
    }

    const rows = await repo.query(
      `
      SELECT
        time_bucket($1::interval, "recordedAt") AS "recordedAt",
        avg("temperatureC")     AS "temperatureC",
        avg("humidityPct")      AS "humidityPct",
        avg("pressureHpa")      AS "pressureHpa",
        avg("rainfallMm")       AS "rainfallMm",
        avg("lightLux")         AS "lightLux",
        avg("airQualityValue")  AS "airQualityValue",
        avg("batteryVoltage")   AS "batteryVoltage",
        avg("signalRssi")::int  AS "signalRssi"
      FROM "readings"
      WHERE "stationId" = $2
        AND "recordedAt" >= $3
        AND "recordedAt" <= $4
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [bucket, query.stationId, query.from, query.to],
    );

    return rows.map((row: any, idx: number) => ({
      id: `agg-${idx}`,
      recordedAt: row.recordedAt,
      receivedAt: row.recordedAt,
      stationId: query.stationId,
      deviceId: null,
      temperatureC: row.temperatureC != null ? Number(row.temperatureC) : null,
      humidityPct: row.humidityPct != null ? Number(row.humidityPct) : null,
      pressureHpa: row.pressureHpa != null ? Number(row.pressureHpa) : null,
      rainfallMm: row.rainfallMm != null ? Number(row.rainfallMm) : null,
      lightLux: row.lightLux != null ? Number(row.lightLux) : null,
      airQualityValue: row.airQualityValue != null ? Number(row.airQualityValue) : null,
      batteryVoltage: row.batteryVoltage != null ? Number(row.batteryVoltage) : null,
      signalRssi: row.signalRssi ?? null,
    }));
  }

  async summary(
    tenantSlug: string,
    query: SummaryQueryDto,
  ): Promise<WeatherSummary[]> {
    const range = query.range ?? '24h';
    const ms = RANGE_MS[range];
    const to = new Date();
    const from = new Date(to.getTime() - ms);

    const repo = await this.repo(tenantSlug);
    const summaries: WeatherSummary[] = [];

    for (const metric of Object.keys(METRIC_COLUMN) as MetricKey[]) {
      const col = METRIC_COLUMN[metric];
      const row = await repo.query(
        `
        SELECT
          min("${col}")::float AS min,
          max("${col}")::float AS max,
          avg("${col}")::float AS avg,
          count("${col}")::int AS count,
          avg("${col}") FILTER (WHERE "recordedAt" < $2)::float AS first_half_avg,
          avg("${col}") FILTER (WHERE "recordedAt" >= $2)::float AS second_half_avg
        FROM "readings"
        WHERE "stationId" = $1
          AND "recordedAt" >= $3
          AND "recordedAt" <= $4
        `,
        [
          query.stationId,
          new Date((from.getTime() + to.getTime()) / 2).toISOString(),
          from.toISOString(),
          to.toISOString(),
        ],
      );
      const r = row[0];
      if (!r || r.count == null || r.count === 0) continue;

      const first = r.first_half_avg as number | null;
      const second = r.second_half_avg as number | null;
      let trend: WeatherSummary['trend'] = 'stable';
      if (first != null && second != null) {
        const denom = Math.abs(first) > 1e-9 ? Math.abs(first) : 1;
        const delta = (second - first) / denom;
        if (delta > 0.02) trend = 'up';
        else if (delta < -0.02) trend = 'down';
      }

      summaries.push({
        stationId: query.stationId,
        metric,
        period: range,
        min: r.min,
        max: r.max,
        avg: r.avg,
        trend,
        dataCount: r.count,
      });
    }
    return summaries;
  }

  async getDeviceStatus(tenantSlug: string, stationId: string): Promise<DeviceStatus | null> {
    const repo = await this.repo(tenantSlug);
    const latest = await this.findLatest(tenantSlug, stationId);
    if (!latest) {
      return {
        stationId,
        lastReceivedAt: new Date(0).toISOString(),
        signalStrength: 'none',
        batteryLevel: undefined,
        memoryUsage: undefined,
        uptime: undefined,
        recordsProcessed: 0,
      };
    }
    const recordsProcessed = await repo
      .createQueryBuilder('r')
      .where('r."stationId" = :stationId', { stationId })
      .getCount();

    return {
      stationId,
      lastReceivedAt: latest.receivedAt.toISOString(),
      signalStrength: bucketRssi(latest.signalRssi ?? null),
      batteryLevel: voltageToPercent(latest.batteryVoltage ?? null),
      memoryUsage: undefined,
      uptime: undefined,
      recordsProcessed,
    };
  }

  async ingest(
    tenantSlug: string,
    dto: IngestReadingDto,
  ): Promise<WeatherReading> {
    const repo = await this.repo(tenantSlug);
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    const reading = repo.create({
      stationId: dto.stationId,
      deviceId: dto.deviceId ?? null,
      recordedAt,
      receivedAt: new Date(),
      temperatureC: dto.temperatureC ?? null,
      humidityPct: dto.humidityPct ?? null,
      pressureHpa: dto.pressureHpa ?? null,
      rainfallMm: dto.rainfallMm ?? null,
      lightLux: dto.lightLux ?? null,
      airQualityValue: dto.airQualityValue ?? null,
      batteryVoltage: dto.batteryVoltage ?? null,
      signalRssi: dto.signalRssi ?? null,
    });
    const saved = await repo.save(reading);

    await this.stationsService
      .touchLastSync(tenantSlug, saved.stationId, saved.receivedAt)
      .catch(() => undefined);
    this.stream.publish(tenantSlug, saved);
    this.alerts
      .evaluateAndPublish(tenantSlug, saved)
      .catch(() => undefined);

    return saved;
  }
}
