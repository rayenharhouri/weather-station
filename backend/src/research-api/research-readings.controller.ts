import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';
import { filter, map, Observable } from 'rxjs';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { ReadingsService } from '../readings/readings.service';
import { ReadingsStreamService } from '../readings/readings-stream.service';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { V1ReadingsQueryDto, V1Metric, V1_METRICS } from './dto/readings-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

/**
 * Maps each v1 metric name to:
 *   - the WeatherReading column carrying its value
 *   - the SI / API unit string the docs promise
 *
 * Keeping the mapping in one place means adding a new sensor only touches
 * this table + the entity + the docs page.
 */
const METRIC_MAPPING: Record<V1Metric, { field: keyof WeatherReading; unit: string }> = {
  temperature: { field: 'temperatureC', unit: 'celsius' },
  humidity: { field: 'humidityPct', unit: 'percent' },
  pressure: { field: 'pressureHpa', unit: 'hPa' },
  rainfall: { field: 'rainfallMm', unit: 'mm' },
  light: { field: 'lightLux', unit: 'lux' },
  aqi: { field: 'airQualityValue', unit: 'aqi' },
  battery: { field: 'batteryVoltage', unit: 'volts' },
  rssi: { field: 'signalRssi', unit: 'dBm' },
};

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface V1Reading {
  id: string;
  station_id: string;
  sensor_id: string | null;
  metric: V1Metric;
  value: number;
  unit: string;
  recorded_at: string;
  merkle_anchor: string | null;
}

interface V1ReadingsResponse {
  data: V1Reading[];
  next_cursor: string | null;
}

class V1ReadingsStreamQueryDto {
  @IsUUID()
  station!: string;

  @IsIn(V1_METRICS as readonly string[])
  metric!: V1Metric;
}

interface SseMessage {
  data: string;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1')
export class ResearchReadingsController {
  constructor(
    private readonly readings: ReadingsService,
    private readonly streamService: ReadingsStreamService,
  ) {}

  @ApiOperation({ summary: "Readings query — single-station, single-metric." })
  @Get('readings')
  async list(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Query() query: V1ReadingsQueryDto,
  ): Promise<V1ReadingsResponse> {
    enforceScope(token, query);

    const limit = query.limit ?? DEFAULT_LIMIT;
    const until = query.until ?? new Date().toISOString();
    const since =
      query.since ?? new Date(Date.parse(until) - DEFAULT_WINDOW_MS).toISOString();
    const interval = query.interval ?? 'raw';

    const rows = await this.readings.findHistory(tenant.slug, {
      stationId: query.station,
      from: since,
      to: until,
      interval,
    });

    const { field, unit } = METRIC_MAPPING[query.metric];
    const data: V1Reading[] = [];
    for (const row of rows) {
      const raw = row[field];
      if (typeof raw !== 'number') continue;
      data.push(toV1Reading(row, query.metric, raw, unit));
      if (data.length >= limit) break;
    }

    const next_cursor = data.length >= limit ? data[data.length - 1].id : null;
    return { data, next_cursor };
  }

  /**
   * Live readings stream for the requested `(station, metric)` pair.
   *
   * Browser EventSource clients can't set custom headers, so the bearer is
   * accepted from `?token=` (handled in `TokenAuthGuard`). Server-side
   * clients should keep passing `Authorization: Bearer …` since query
   * tokens leak more readily through logs.
   *
   * Events that don't carry a value for the requested metric (e.g. a
   * battery-only ping when the client asked for `temperature`) are
   * filtered out — the SDK shouldn't have to handle empty value frames.
   */
  @ApiOperation({ summary: "SSE readings (header bearer or ?token= for EventSource)." })
  @Sse('readings/stream')
  stream(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Query() query: V1ReadingsStreamQueryDto,
  ): Observable<SseMessage> {
    enforceScope(token, { station: query.station, metric: query.metric });

    const { field, unit } = METRIC_MAPPING[query.metric];
    return this.streamService.subscribe(tenant.slug, query.station).pipe(
      map((reading) => {
        const raw = reading[field];
        if (typeof raw !== 'number') return null;
        return toV1Reading(reading, query.metric, raw, unit);
      }),
      filter((payload): payload is V1Reading => payload !== null),
      map((payload) => ({ data: JSON.stringify(payload) })),
    );
  }
}

function enforceScope(token: ApiToken, query: V1ReadingsQueryDto): void {
  const { scope } = token;

  // Station scope: empty array = "home tenant, all stations"; `*` = any
  // station (cross-tenant aware); otherwise must be an explicit match.
  if (scope.stations.length > 0 && !scope.stations.includes('*')) {
    if (!scope.stations.includes(query.station)) {
      throw new ForbiddenException('station_out_of_scope');
    }
  }

  // Cross-tenant access requires the marker bit. We don't have grant
  // enforcement wired yet; this is a structural check until then.
  if (scope.stations.includes('*') && !scope.crossTenant) {
    throw new ForbiddenException('cross_tenant_denied');
  }

  if (scope.metrics.length > 0 && !scope.metrics.includes(query.metric)) {
    throw new ForbiddenException('metric_out_of_scope');
  }
}

function toV1Reading(
  row: WeatherReading,
  metric: V1Metric,
  value: number,
  unit: string,
): V1Reading {
  // Aggregated rows from `time_bucket()` come back with synthetic ids
  // (`agg-0`, `agg-1`, ...); leave them as-is — the docs explain that
  // aggregated rows aren't individually verifiable against Hedera.
  const isAggregated = row.id.startsWith('agg-');
  const recordedAt =
    typeof row.recordedAt === 'string'
      ? row.recordedAt
      : new Date(row.recordedAt).toISOString();

  return {
    id: row.id,
    station_id: row.stationId,
    sensor_id: row.deviceId ?? null,
    metric,
    value,
    unit,
    recorded_at: recordedAt,
    // Real anchor wiring lands when the integrity batcher writes batch ids
    // back onto readings. Until then, aggregates are explicitly null;
    // raw readings expose null too so clients learn to handle it.
    merkle_anchor: isAggregated ? null : null,
  };
}
