import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { RequestLog } from './entities/request-log.entity';
import { UsageRange } from './dto/usage-query.dto';

const DAILY_QUOTA = 10_000;

export interface UsageBucket {
  bucketStart: string;
  byToken: Record<string, number>;
}

export interface UsageTokenRow {
  tokenId: string;
  name: string;
  callsToday: number;
  callsRange: number;
  latencyP50Ms: number;
  errorRatePct: number;
  quotaUsedDay: number;
}

export interface UsageEndpointRow {
  endpoint: string;
  calls: number;
  latencyP50Ms: number;
  errorRatePct: number;
}

export interface UsageSnapshot {
  range: UsageRange;
  totalCalls: number;
  callsDeltaPct: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  errorCount: number;
  errorRatePct: number;
  quotaUsedPct: number;
  dailyRemaining: number;
  buckets: UsageBucket[];
  tokens: UsageTokenRow[];
  topEndpoints: UsageEndpointRow[];
}

const RANGE_HOURS: Record<UsageRange, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
};

const RANGE_BUCKET: Record<UsageRange, string> = {
  '24h': '1 hour',
  '7d': '6 hours',
  '30d': '1 day',
};

@Injectable()
export class UsageService {
  constructor(private readonly tenantService: TenantService) {}

  private async logRepo(tenantSlug: string): Promise<Repository<RequestLog>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(RequestLog);
  }

  private async tokenRepo(tenantSlug: string): Promise<Repository<ApiToken>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(ApiToken);
  }

  async summary(
    tenantSlug: string,
    userId: string,
    range: UsageRange,
  ): Promise<UsageSnapshot> {
    const now = new Date();
    const since = new Date(now.getTime() - RANGE_HOURS[range] * 60 * 60_000);
    const priorSince = new Date(since.getTime() - RANGE_HOURS[range] * 60 * 60_000);
    const today = new Date(now.getTime() - 24 * 60 * 60_000);

    const tokenRepo = await this.tokenRepo(tenantSlug);
    const ownedTokens = await tokenRepo.find({ where: { userId } });
    if (ownedTokens.length === 0) {
      return emptySnapshot(range);
    }
    const tokenIds = ownedTokens.map((t) => t.id);
    const ds = await this.tenantService.getDataSource(tenantSlug);

    const totalsRow = await ds.query(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE "statusCode" >= 400)::int AS errors,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs")::int AS p50,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs")::int AS p95,
         percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs")::int AS p99
       FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2 AND "timestamp" <= $3`,
      [tokenIds, since.toISOString(), now.toISOString()],
    );

    const t = totalsRow[0] ?? { total: 0, errors: 0, p50: 0, p95: 0, p99: 0 };
    const totalCalls = t.total ?? 0;
    const errorCount = t.errors ?? 0;

    const priorRow = await ds.query(
      `SELECT count(*)::int AS total FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2 AND "timestamp" < $3`,
      [tokenIds, priorSince.toISOString(), since.toISOString()],
    );
    const priorTotal = priorRow[0]?.total ?? 0;
    const callsDeltaPct = priorTotal === 0 ? 0 : Math.round(((totalCalls - priorTotal) / priorTotal) * 100);

    const bucketRows = await ds.query(
      `SELECT
         to_timestamp(floor(extract(epoch FROM "timestamp") / $4) * $4) AS bucket_start,
         "tokenId",
         count(*)::int AS calls
       FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2 AND "timestamp" <= $3
       GROUP BY 1, 2
       ORDER BY 1 ASC`,
      [tokenIds, since.toISOString(), now.toISOString(), bucketSeconds(range)],
    );

    const buckets = collapseBuckets(bucketRows);

    const endpointRows = await ds.query(
      `SELECT
         "path",
         count(*)::int AS calls,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs")::int AS p50,
         count(*) FILTER (WHERE "statusCode" >= 400)::int AS errors
       FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2 AND "timestamp" <= $3
       GROUP BY "path"
       ORDER BY calls DESC
       LIMIT 10`,
      [tokenIds, since.toISOString(), now.toISOString()],
    );
    const topEndpoints: UsageEndpointRow[] = endpointRows.map((r: any) => ({
      endpoint: r.path,
      calls: r.calls,
      latencyP50Ms: r.p50 ?? 0,
      errorRatePct: r.calls > 0 ? (r.errors / r.calls) * 100 : 0,
    }));

    const perTokenRangeRows = await ds.query(
      `SELECT
         "tokenId",
         count(*)::int AS calls_range,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs")::int AS p50,
         count(*) FILTER (WHERE "statusCode" >= 400)::int AS errors
       FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2 AND "timestamp" <= $3
       GROUP BY "tokenId"`,
      [tokenIds, since.toISOString(), now.toISOString()],
    );
    const perTokenTodayRows = await ds.query(
      `SELECT
         "tokenId",
         count(*)::int AS calls_today
       FROM "request_logs"
       WHERE "tokenId" = ANY($1)
         AND "timestamp" >= $2
       GROUP BY "tokenId"`,
      [tokenIds, today.toISOString()],
    );

    const byTokenRange = new Map<string, { calls: number; p50: number; errors: number }>();
    for (const r of perTokenRangeRows) {
      byTokenRange.set(r.tokenId, { calls: r.calls_range, p50: r.p50 ?? 0, errors: r.errors ?? 0 });
    }
    const byTokenToday = new Map<string, number>();
    for (const r of perTokenTodayRows) byTokenToday.set(r.tokenId, r.calls_today);

    const tokens: UsageTokenRow[] = ownedTokens.map((tok) => {
      const r = byTokenRange.get(tok.id) ?? { calls: 0, p50: 0, errors: 0 };
      const callsToday = byTokenToday.get(tok.id) ?? 0;
      return {
        tokenId: tok.id,
        name: tok.name,
        callsToday,
        callsRange: r.calls,
        latencyP50Ms: r.p50,
        errorRatePct: r.calls > 0 ? (r.errors / r.calls) * 100 : 0,
        quotaUsedDay: callsToday / DAILY_QUOTA,
      };
    });

    const topTokenToday = tokens.reduce(
      (max, t) => (t.callsToday > max ? t.callsToday : max),
      0,
    );

    return {
      range,
      totalCalls,
      callsDeltaPct,
      latencyP50Ms: t.p50 ?? 0,
      latencyP95Ms: t.p95 ?? 0,
      latencyP99Ms: t.p99 ?? 0,
      errorCount,
      errorRatePct: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
      quotaUsedPct: (topTokenToday / DAILY_QUOTA) * 100,
      dailyRemaining: Math.max(0, DAILY_QUOTA - topTokenToday),
      buckets,
      tokens,
      topEndpoints,
    };
  }
}

function bucketSeconds(range: UsageRange): number {
  switch (range) {
    case '24h':
      return 60 * 60;
    case '7d':
      return 6 * 60 * 60;
    case '30d':
      return 24 * 60 * 60;
  }
}

function collapseBuckets(rows: any[]): UsageBucket[] {
  const map = new Map<string, UsageBucket>();
  for (const r of rows) {
    const iso = (r.bucket_start instanceof Date ? r.bucket_start : new Date(r.bucket_start)).toISOString();
    let bucket = map.get(iso);
    if (!bucket) {
      bucket = { bucketStart: iso, byToken: {} };
      map.set(iso, bucket);
    }
    bucket.byToken[r.tokenId] = r.calls;
  }
  return Array.from(map.values()).sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}

function emptySnapshot(range: UsageRange): UsageSnapshot {
  return {
    range,
    totalCalls: 0,
    callsDeltaPct: 0,
    latencyP50Ms: 0,
    latencyP95Ms: 0,
    latencyP99Ms: 0,
    errorCount: 0,
    errorRatePct: 0,
    quotaUsedPct: 0,
    dailyRemaining: DAILY_QUOTA,
    buckets: [],
    tokens: [],
    topEndpoints: [],
  };
}
