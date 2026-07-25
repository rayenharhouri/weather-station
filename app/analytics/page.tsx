'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Thermometer,
  Droplets,
  Gauge,
  CloudRain,
  Sun,
  Wind,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { HairlineCard } from '@/components/ui/hairline-card';
import {
  MultiMetricChart,
  type MultiMetricSeries,
} from '@/components/dashboard/multi-metric-chart';
import { MetricSummaryCard } from '@/components/dashboard/metric-summary-card';
import { stationService, readingService } from '@/services/api';
import type { WeatherReading } from '@/types';

type RangeValue = '24h' | '7d' | '30d' | '90d';

const RANGE_TABS: Array<{ value: RangeValue; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const RANGE_MS: Record<RangeValue, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

const RANGE_INTERVAL: Record<RangeValue, '15m' | '1h' | '1d'> = {
  '24h': '15m',
  '7d': '1h',
  '30d': '1d',
  '90d': '1d',
};

interface MetricSpec {
  key: 'temperature' | 'humidity' | 'pressure' | 'rainfall' | 'light' | 'airQuality';
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  unit: string;
  field: keyof WeatherReading;
  decimals: number;
}

const METRICS: MetricSpec[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    short: 'Temp.',
    icon: Thermometer,
    color: 'var(--m-temp)',
    unit: '°C',
    field: 'temperatureC',
    decimals: 1,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    short: 'Humidity',
    icon: Droplets,
    color: 'var(--m-humidity)',
    unit: '%',
    field: 'humidityPct',
    decimals: 0,
  },
  {
    key: 'pressure',
    label: 'Pressure',
    short: 'Pressure',
    icon: Gauge,
    color: 'var(--m-pressure)',
    unit: 'hPa',
    field: 'pressureHpa',
    decimals: 0,
  },
  {
    key: 'rainfall',
    label: 'Rainfall',
    short: 'Rain',
    icon: CloudRain,
    color: 'var(--m-rainfall)',
    unit: 'mm',
    field: 'rainfallMm',
    decimals: 2,
  },
  {
    key: 'light',
    label: 'Light',
    short: 'Light',
    icon: Sun,
    color: 'var(--m-light)',
    unit: 'lx',
    field: 'lightLux',
    decimals: 0,
  },
  {
    key: 'airQuality',
    label: 'Air quality',
    short: 'AQI',
    icon: Wind,
    color: 'var(--m-aqi)',
    unit: 'AQI',
    field: 'airQualityValue',
    decimals: 0,
  },
];

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AnalyticsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AnalyticsContent() {
  const [range, setRange] = useState<RangeValue>('24h');
  const [selected, setSelected] = useState<Set<MetricSpec['key']>>(
    () => new Set(['temperature', 'humidity', 'pressure', 'airQuality']),
  );

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const { from, to, interval } = useMemo(() => {
    const t = new Date();
    const f = new Date(t.getTime() - RANGE_MS[range]);
    return { from: f.toISOString(), to: t.toISOString(), interval: RANGE_INTERVAL[range] };
  }, [range]);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['analytics-history', stationId, range],
    queryFn: () => readingService.getHistory({ stationId, from, to, interval }),
    enabled: !!station,
  });

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', stationId, range],
    queryFn: () => readingService.getSummary(stationId, range),
    enabled: !!station,
  });

  const readings = history?.items ?? [];
  const timestamps = readings.map((r) => r.recordedAt);

  const chartSeries: MultiMetricSeries[] = useMemo(() => {
    const activeMetrics = METRICS.filter((m) => selected.has(m.key));
    return activeMetrics.map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      unit: m.unit,
      decimals: m.decimals,
      values: readings.map((r) => {
        const v = r[m.field];
        return typeof v === 'number' ? v : null;
      }),
    }));
  }, [selected, readings]);

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader range={range} />

      {/* Range tabs + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex border border-border-subtle rounded-md p-0.5 gap-0.5">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRange(tab.value)}
              aria-pressed={range === tab.value}
              className={[
                'h-6 px-2.5 rounded-sm text-xs font-medium transition-colors duration-150',
                range === tab.value
                  ? 'bg-surface-2 text-fg'
                  : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-fg-subtle">
          Aggregation:{' '}
          <span className="font-mono text-fg-muted">{INTERVAL_LABEL[interval]}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            Custom range
          </Button>
          <Button variant="outline" size="sm">
            <Download size={13} strokeWidth={1.5} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Metric selector */}
      <HairlineCard className="px-4 py-3">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle mr-1">
            Metrics
          </span>
          {METRICS.map((m) => {
            const Icon = m.icon;
            const active = selected.has(m.key);
            return (
              <ToggleChip
                key={m.key}
                active={active}
                color={m.color}
                icon={<Icon size={13} strokeWidth={1.5} />}
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(m.key)) next.delete(m.key);
                    else next.add(m.key);
                    return next;
                  });
                }}
              >
                {m.short}
              </ToggleChip>
            );
          })}
          <span className="ml-auto text-xs text-fg-subtle">
            {selected.size} of {METRICS.length} plotted
          </span>
        </div>
      </HairlineCard>

      {/* Main chart */}
      <HairlineCard className="px-4 py-3">
        {historyLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-fg-muted">
            Loading history…
          </div>
        ) : readings.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-fg-muted">
            No samples in the selected range.
          </div>
        ) : (
          <MultiMetricChart timestamps={timestamps} series={chartSeries} />
        )}
      </HairlineCard>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS.map((m) => {
          const s = summary?.items?.find((x) => x.metric === m.key);
          const last = readings[readings.length - 1];
          const current = last
            ? typeof last[m.field] === 'number'
              ? (last[m.field] as number)
              : null
            : null;
          return (
            <MetricSummaryCard
              key={m.key}
              icon={m.icon}
              label={m.label}
              color={m.color}
              unit={m.unit}
              current={current}
              min={s?.min ?? null}
              avg={s?.avg ?? null}
              max={s?.max ?? null}
              trend={s?.trend}
              decimals={m.decimals}
            />
          );
        })}
      </div>
    </div>
  );
}

const INTERVAL_LABEL: Record<'15m' | '1h' | '1d', string> = {
  '15m': '15 minute',
  '1h': '1 hour',
  '1d': '1 day',
};

function PageHeader({ range }: { range: RangeValue }) {
  const rangeLabel = RANGE_TABS.find((t) => t.value === range)?.label ?? '';
  return (
    <div className="flex items-end justify-between pb-1">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Analytics</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Compare metrics across time · range {rangeLabel} · aggregated by{' '}
          {INTERVAL_LABEL[RANGE_INTERVAL[range]]}
        </span>
      </div>
    </div>
  );
}
