'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, AlertTriangle, Gauge } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import { usageService, type UsageRange, type UsageSnapshot } from '@/services/api';

type Range = UsageRange;

const RANGES: Array<{ value: Range; label: string }> = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const TOKEN_PALETTE = [
  'var(--m-temp)',
  'var(--m-humidity)',
  'var(--m-pressure)',
  'var(--m-rainfall)',
  'var(--m-light)',
  'var(--m-aqi)',
];

export default function UsagePage() {
  const [range, setRange] = useState<Range>('24h');

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['v1.usage', range],
    queryFn: () => usageService.summary(range),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const tokenColors = useMemo(() => {
    const colors: Record<string, string> = {};
    snapshot?.tokens.forEach((t, idx) => {
      colors[t.tokenId] = TOKEN_PALETTE[idx % TOKEN_PALETTE.length];
    });
    return colors;
  }, [snapshot]);

  const data = useMemo(() => adaptSnapshot(snapshot, range), [snapshot, range]);

  return (
    <ResearchAppShell crumbs={[{ label: 'Usage' }]}>
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5 gap-4 overflow-hidden">
        <PageHeader range={range} onRangeChange={setRange} />

        {/* KPI strip */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Kpi
            icon={Activity}
            label="Requests"
            value={data.totalCalls.toLocaleString()}
            sub={data.callsDeltaPct >= 0 ? `+${data.callsDeltaPct}% vs prior` : `${data.callsDeltaPct}% vs prior`}
            subTone={data.callsDeltaPct >= 0 ? 'up' : 'down'}
          />
          <Kpi
            icon={Clock}
            label="Latency p50"
            value={`${data.latencyP50Ms} ms`}
            sub={`p95 ${data.latencyP95Ms} ms · p99 ${data.latencyP99Ms} ms`}
          />
          <Kpi
            icon={AlertTriangle}
            label="Errors"
            value={data.errorCount.toLocaleString()}
            sub={`${data.errorRatePct.toFixed(2)}% of total`}
            subTone={data.errorRatePct > 1 ? 'down' : undefined}
          />
          <Kpi
            icon={Gauge}
            label="Quota"
            value={`${Math.round(data.quotaUsedPct)}%`}
            sub={`${data.dailyRemaining.toLocaleString()} req remaining today`}
            subTone={data.quotaUsedPct > 90 ? 'down' : undefined}
          />
        </div>

        {/* Volume chart + endpoint bars */}
        <div className="grid gap-3 flex-1 min-h-0" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
          <VolumeChartCard
            buckets={data.buckets}
            tokens={data.tokens}
            tokenColors={tokenColors}
            range={range}
          />
          <TopEndpointsCard endpoints={data.topEndpoints} />
        </div>

        {/* Per-token table */}
        <TokenUsageTable tokens={data.tokens} tokenColors={tokenColors} />

        {!snapshot && !isLoading && (
          <div className="text-xs text-fg-subtle text-center pb-2">
            No usage to show. Pick an active token on the Account page to authenticate v1
            requests.
          </div>
        )}
      </div>
    </ResearchAppShell>
  );
}

function PageHeader({
  range,
  onRangeChange,
}: {
  range: Range;
  onRangeChange: (r: Range) => void;
}) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Usage</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Request volume + latency by token. Per-token quota:{' '}
          <span className="font-mono text-fg-muted">60 req/min</span> ·{' '}
          <span className="font-mono text-fg-muted">10,000 req/day</span>.
        </span>
      </div>
      <SegmentedTabs<Range>
        value={range}
        onChange={onRangeChange}
        options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  subTone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subTone?: 'up' | 'down';
}) {
  const subColor =
    subTone === 'up'
      ? 'var(--sev-success)'
      : subTone === 'down'
        ? 'var(--sev-critical)'
        : 'var(--fg-subtle)';
  return (
    <HairlineCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-1.5 text-fg-muted">
        <Icon size={14} strokeWidth={1.5} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="font-mono text-2xl text-fg tabular-nums leading-none tracking-[-0.01em]">
        {value}
      </span>
      {sub && (
        <span className="font-mono text-[11px] tabular-nums" style={{ color: subColor }}>
          {sub}
        </span>
      )}
    </HairlineCard>
  );
}

interface UsageBucket {
  label: string;
  byToken: Record<string, number>;
}

function VolumeChartCard({
  buckets,
  tokens,
  tokenColors,
  range,
}: {
  buckets: UsageBucket[];
  tokens: TokenUsage[];
  tokenColors: Record<string, string>;
  range: Range;
}) {
  const maxStack = useMemo(() => {
    let m = 0;
    for (const b of buckets) {
      const sum = Object.values(b.byToken).reduce((s, n) => s + n, 0);
      if (sum > m) m = sum;
    }
    return Math.max(1, m);
  }, [buckets]);

  const yTicks = niceTicks(maxStack, 4);
  const yMax = yTicks[yTicks.length - 1];

  return (
    <HairlineCard className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-border-subtle gap-3 flex-wrap">
        <span className="text-sm text-fg-muted font-medium">Request volume</span>
        <span className="font-mono text-[11px] text-fg-subtle">
          · stacked by token · {rangeLabel(range)}
        </span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {tokens.map((t) => (
            <span key={t.tokenId} className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
              <span
                aria-hidden
                className="w-2 h-2 rounded-sm"
                style={{ background: tokenColors[t.tokenId] ?? 'var(--fg-subtle)' }}
              />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '40px 1fr' }}>
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between py-3 pr-2 text-right font-mono text-[10px] text-fg-subtle tabular-nums">
          {yTicks
            .slice()
            .reverse()
            .map((t) => (
              <span key={t}>{t.toLocaleString()}</span>
            ))}
        </div>

        {/* Bars */}
        <div className="relative flex items-end gap-0.5 py-3 pr-3">
          {/* Horizontal gridlines */}
          <div className="absolute inset-y-3 inset-x-0 pointer-events-none">
            {yTicks.map((t, i) => (
              <div
                key={t}
                className="absolute left-0 right-0 border-t border-border-subtle"
                style={{ top: `${(1 - t / yMax) * 100}%` }}
                aria-hidden="true"
              />
            ))}
          </div>

          {buckets.map((b, idx) => {
            const tokenIds = tokens.map((t) => t.tokenId);
            const sum = tokenIds.reduce((s, id) => s + (b.byToken[id] ?? 0), 0);
            return (
              <div
                key={idx}
                className="relative flex flex-col-reverse flex-1 min-w-0 group"
                style={{ height: '100%' }}
                title={`${b.label} · ${sum.toLocaleString()} req`}
              >
                {tokenIds.map((id) => {
                  const v = b.byToken[id] ?? 0;
                  if (v === 0) return null;
                  const h = (v / yMax) * 100;
                  return (
                    <div
                      key={id}
                      className="w-full"
                      style={{
                        height: `${h}%`,
                        background: tokenColors[id] ?? 'var(--fg-subtle)',
                        opacity: 0.92,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="px-3 pb-3 grid" style={{ gridTemplateColumns: '40px 1fr' }}>
        <span />
        <div className="flex justify-between font-mono text-[10px] text-fg-subtle tabular-nums">
          {sparseLabels(buckets.map((b) => b.label), 6).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    </HairlineCard>
  );
}

interface EndpointSlice {
  endpoint: string;
  calls: number;
  latencyP50Ms: number;
  errorRatePct: number;
}

function TopEndpointsCard({ endpoints }: { endpoints: EndpointSlice[] }) {
  const max = Math.max(1, ...endpoints.map((e) => e.calls));
  return (
    <HairlineCard className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted font-medium">Top endpoints</span>
        <span className="font-mono text-[11px] text-fg-subtle ml-2">· by call count</span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-3 overflow-y-auto no-scroll">
        {endpoints.map((e) => {
          const pct = (e.calls / max) * 100;
          return (
            <div key={e.endpoint} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs text-fg truncate">{e.endpoint}</span>
                <span className="font-mono text-xs text-fg tabular-nums shrink-0">
                  {e.calls.toLocaleString()}
                </span>
              </div>
              <div className="h-1 rounded-sm bg-surface-2 border border-border-inset overflow-hidden">
                <div
                  className="h-full opacity-90"
                  style={{ width: `${pct}%`, background: 'var(--accent-brand)' }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-fg-subtle tabular-nums">
                <span>p50 {e.latencyP50Ms} ms</span>
                <span
                  style={{
                    color:
                      e.errorRatePct > 1 ? 'var(--sev-critical)' : e.errorRatePct > 0 ? 'var(--sev-warn)' : 'var(--fg-subtle)',
                  }}
                >
                  {e.errorRatePct.toFixed(2)}% errors
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </HairlineCard>
  );
}

interface TokenUsage {
  tokenId: string;
  name: string;
  callsToday: number;
  callsRange: number;
  latencyP50Ms: number;
  errorRatePct: number;
  quotaUsedDay: number;
}

function TokenUsageTable({
  tokens,
  tokenColors,
}: {
  tokens: TokenUsage[];
  tokenColors: Record<string, string>;
}) {
  return (
    <HairlineCard className="overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted font-medium">Per-token breakdown</span>
        <span className="font-mono text-[11px] text-fg-subtle ml-2">
          · {tokens.length} active tokens
        </span>
      </div>

      {/* Header row */}
      <div
        className="grid gap-3 px-4 py-2 border-b border-border-subtle text-[10px] uppercase tracking-[0.06em] text-fg-subtle"
        style={{ gridTemplateColumns: 'minmax(180px, 1.4fr) 1fr 1fr 1fr 1.6fr' }}
      >
        <span>Token</span>
        <span className="text-right">Today</span>
        <span className="text-right">In range</span>
        <span className="text-right">p50 · errors</span>
        <span>Daily quota</span>
      </div>

      {/* Rows */}
      {tokens.map((t, i) => (
        <div
          key={t.tokenId}
          className={[
            'grid gap-3 px-4 py-3 items-center',
            i < tokens.length - 1 ? 'border-b border-border-subtle' : '',
          ].join(' ')}
          style={{ gridTemplateColumns: 'minmax(180px, 1.4fr) 1fr 1fr 1fr 1.6fr' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className="w-1.5 h-3 rounded-sm shrink-0"
              style={{ background: tokenColors[t.tokenId] ?? 'var(--fg-subtle)' }}
            />
            <span className="text-sm text-fg truncate">{t.name}</span>
          </div>
          <span className="font-mono text-xs text-fg tabular-nums text-right">
            {t.callsToday.toLocaleString()}
          </span>
          <span className="font-mono text-xs text-fg-muted tabular-nums text-right">
            {t.callsRange.toLocaleString()}
          </span>
          <span className="font-mono text-xs text-fg-muted tabular-nums text-right">
            {t.latencyP50Ms} ms ·{' '}
            <span style={{ color: t.errorRatePct > 1 ? 'var(--sev-critical)' : 'var(--fg-muted)' }}>
              {t.errorRatePct.toFixed(2)}%
            </span>
          </span>
          <QuotaGauge fraction={t.quotaUsedDay} color={tokenColors[t.tokenId] ?? 'var(--accent-brand)'} />
        </div>
      ))}
    </HairlineCard>
  );
}

function QuotaGauge({ fraction, color }: { fraction: number; color: string }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  const tone =
    fraction >= 0.95 ? 'var(--sev-critical)' : fraction >= 0.8 ? 'var(--sev-warn)' : color;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-sm bg-surface-2 border border-border-inset overflow-hidden">
        <div
          className="h-full opacity-90"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums w-12 text-right" style={{ color: tone }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

interface UsageData {
  buckets: UsageBucket[];
  tokens: TokenUsage[];
  topEndpoints: EndpointSlice[];
  totalCalls: number;
  callsDeltaPct: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  errorCount: number;
  errorRatePct: number;
  quotaUsedPct: number;
  dailyRemaining: number;
}

const EMPTY_USAGE: UsageData = {
  buckets: [],
  tokens: [],
  topEndpoints: [],
  totalCalls: 0,
  callsDeltaPct: 0,
  latencyP50Ms: 0,
  latencyP95Ms: 0,
  latencyP99Ms: 0,
  errorCount: 0,
  errorRatePct: 0,
  quotaUsedPct: 0,
  dailyRemaining: 10_000,
};

function adaptSnapshot(snapshot: UsageSnapshot | undefined, range: Range): UsageData {
  if (!snapshot) return EMPTY_USAGE;
  return {
    buckets: snapshot.buckets.map((b) => ({
      label: formatBucketLabel(b.bucketStart, range),
      byToken: b.byToken,
    })),
    tokens: snapshot.tokens,
    topEndpoints: snapshot.topEndpoints,
    totalCalls: snapshot.totalCalls,
    callsDeltaPct: snapshot.callsDeltaPct,
    latencyP50Ms: snapshot.latencyP50Ms,
    latencyP95Ms: snapshot.latencyP95Ms,
    latencyP99Ms: snapshot.latencyP99Ms,
    errorCount: snapshot.errorCount,
    errorRatePct: snapshot.errorRatePct,
    quotaUsedPct: snapshot.quotaUsedPct,
    dailyRemaining: snapshot.dailyRemaining,
  };
}

function formatBucketLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '24h') {
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  }
  if (range === '7d') {
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return `${day} ${d.getHours().toString().padStart(2, '0')}h`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function rangeLabel(range: Range): string {
  return range === '24h' ? 'last 24h' : range === '7d' ? 'last 7 days' : 'last 30 days';
}

function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const step = niceStep(max / count);
  const ticks: number[] = [];
  let v = 0;
  while (v < max + step * 0.5) {
    ticks.push(v);
    v += step;
  }
  return ticks;
}

function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * pow;
}

function sparseLabels(labels: string[], target: number): string[] {
  if (labels.length <= target) return labels;
  const result: string[] = [];
  const step = (labels.length - 1) / (target - 1);
  for (let i = 0; i < target; i++) {
    const idx = Math.round(i * step);
    result.push(labels[idx]);
  }
  return result;
}
