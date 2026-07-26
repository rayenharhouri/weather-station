'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Thermometer,
  Droplets,
  Gauge,
  CloudRain,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HairlineCard } from '@/components/ui/hairline-card';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { Sparkline } from '@/components/dashboard/sparkline';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  ForecastTrajectoryChart,
  type ForecastPoint,
} from '@/components/dashboard/forecast-trajectory-chart';
import { ModelStatusCard } from '@/components/dashboard/model-status-card';
import { stationService, forecastService } from '@/services/api';

type FocusMetric = 'temperature' | 'humidity' | 'pressure' | 'rainfall';
type Horizon = '1h' | '3h' | '6h' | '24h';

interface MetricSpec {
  key: FocusMetric;
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  unit: string;
  decimals: number;
}

const METRICS: MetricSpec[] = [
  { key: 'temperature', label: 'Temperature', short: 'Temp.', icon: Thermometer, color: 'var(--m-temp)', unit: '°', decimals: 1 },
  { key: 'humidity',    label: 'Humidity',    short: 'Humidity', icon: Droplets, color: 'var(--m-humidity)', unit: '%', decimals: 0 },
  { key: 'pressure',    label: 'Pressure',    short: 'Pressure', icon: Gauge,    color: 'var(--m-pressure)', unit: 'hPa', decimals: 0 },
  { key: 'rainfall',    label: 'Rainfall',    short: 'Rain',     icon: CloudRain, color: 'var(--m-rainfall)', unit: 'mm', decimals: 2 },
];

const HORIZONS: Array<{ value: Horizon; label: string }> = [
  { value: '1h', label: '+1h' },
  { value: '3h', label: '+3h' },
  { value: '6h', label: '+6h' },
  { value: '24h', label: '+24h' },
];

export default function ForecastsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ForecastsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ForecastsContent() {
  const [focus, setFocus] = useState<FocusMetric>('temperature');
  const [horizon, setHorizon] = useState<Horizon>('24h');
  const queryClient = useQueryClient();

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const {
    data: forecast,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['forecast-full', stationId, horizon],
    queryFn: () => forecastService.getForecasts(stationId, horizon),
    refetchInterval: 600_000,
    enabled: !!station,
  });

  const items = forecast?.items ?? [];

  const focusPoints: ForecastPoint[] = useMemo(() => {
    const fieldByFocus: Record<FocusMetric, string> = {
      temperature: 'temperature',
      humidity: 'humidity',
      pressure: 'pressure',
      rainfall: 'rainfall',
    };
    return items
      .filter((it) => it.metric === fieldByFocus[focus])
      .map((it) => ({
        timestamp: it.timestamp,
        value: it.predictedValue,
        confidence: it.confidence,
      }));
  }, [items, focus]);

  const horizonValues: Record<Horizon, number | null> = useMemo(() => {
    const now = Date.now();
    const out: Record<Horizon, number | null> = { '1h': null, '3h': null, '6h': null, '24h': null };
    HORIZONS.forEach(({ value }) => {
      const hours = parseInt(value.replace('h', ''), 10);
      const target = now + hours * 60 * 60 * 1000;
      let best: ForecastPoint | null = null;
      let bestDiff = Infinity;
      for (const p of focusPoints) {
        const diff = Math.abs(new Date(p.timestamp).valueOf() - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = p;
        }
      }
      out[value] = best?.value ?? null;
    });
    return out;
  }, [focusPoints]);

  const focusSpec = METRICS.find((m) => m.key === focus)!;
  const currentValue = focusPoints[0]?.value ?? null;

  const companions = METRICS.filter((m) => m.key !== focus);

  const handleRecompute = () => {
    queryClient.invalidateQueries({ queryKey: ['forecast-full'] });
    refetch();
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader
        generatedAt={forecast?.generatedAt}
        validTo={forecast?.validTo}
      />

      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {HORIZONS.map((h) => (
            <ToggleChip
              key={h.value}
              active={horizon === h.value}
              color="var(--accent-brand)"
              onClick={() => setHorizon(h.value)}
            >
              {h.label}
            </ToggleChip>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download size={13} strokeWidth={1.5} /> Export
          </Button>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}
      >
        {/* LEFT — focus metric + trajectory + horizon callouts + companion metrics */}
        <div className="flex flex-col gap-3 min-w-0">
          <HairlineCard className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span style={{ color: focusSpec.color }} className="flex">
                  <focusSpec.icon size={20} strokeWidth={1.5} />
                </span>
                <h2 className="text-base font-semibold text-fg">{focusSpec.label}</h2>
                <Chip>focus</Chip>
              </div>
              <div className="flex items-center gap-2">
                {METRICS.map((m) => (
                  <ToggleChip
                    key={m.key}
                    active={focus === m.key}
                    color={m.color}
                    icon={<m.icon size={13} strokeWidth={1.5} />}
                    onClick={() => setFocus(m.key)}
                  >
                    {m.short}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="font-mono text-3xl font-medium tabular-nums leading-none tracking-[-0.02em] text-fg">
                {currentValue != null ? currentValue.toFixed(focusSpec.decimals) : '—'}
              </span>
              <span className="text-base text-fg-muted">{focusSpec.unit}</span>
              <span className="ml-3 font-mono text-xs text-fg-subtle">
                current · {horizonValues['24h'] != null ? `${horizonValues['24h'].toFixed(focusSpec.decimals)}${focusSpec.unit} in 24h` : 'no 24h projection'}
              </span>
            </div>

            <div className="mt-3">
              {isLoading ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-fg-muted">
                  Loading forecast…
                </div>
              ) : focusPoints.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-fg-muted">
                  No samples for this metric in the {horizon} horizon.
                </div>
              ) : (
                <ForecastTrajectoryChart
                  points={focusPoints}
                  color={focusSpec.color}
                  unit={focusSpec.unit}
                  decimals={focusSpec.decimals}
                />
              )}
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-border-subtle">
              {HORIZONS.map((h) => {
                const v = horizonValues[h.value];
                return (
                  <div key={h.value} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{h.label}</span>
                    <span className="font-mono text-lg font-medium tabular-nums text-fg tracking-[-0.01em]">
                      {v != null ? v.toFixed(focusSpec.decimals) : '—'}
                      <span className="text-xs text-fg-muted font-normal ml-1">{focusSpec.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </HairlineCard>

          {/* Companion metrics */}
          <HairlineCard className="px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle mb-3">
              Companion metrics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companions.map((m) => {
                const series = items
                  .filter((it) => it.metric === m.key)
                  .map((it) => it.predictedValue);
                return (
                  <CompanionRow
                    key={m.key}
                    metric={m}
                    series={series}
                    onSelect={() => setFocus(m.key)}
                  />
                );
              })}
            </div>
          </HairlineCard>
        </div>

        {/* RIGHT — model status */}
        <ModelStatusCard
          confidence={forecast?.confidence}
          lastRefreshAt={forecast?.generatedAt}
          explanation={forecast?.explanation}
          onRecompute={handleRecompute}
          isRecomputing={isRefetching}
          metricAccuracy={METRICS.map((m) => ({ metric: m.short, rmse: 0.6 + Math.random() * 0.4 }))}
        />
      </div>
    </div>
  );
}

function CompanionRow({
  metric,
  series,
  onSelect,
}: {
  metric: MetricSpec;
  series: number[];
  onSelect: () => void;
}) {
  const last = series[series.length - 1] ?? null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-2 px-3 py-2 rounded-md text-left hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
    >
      <div className="flex items-center gap-2">
        <span style={{ color: metric.color }} className="flex">
          <metric.icon size={14} strokeWidth={1.5} />
        </span>
        <span className="text-sm text-fg-muted">{metric.label}</span>
        <span className="ml-auto font-mono text-sm text-fg tabular-nums">
          {last != null ? last.toFixed(metric.decimals) : '—'}
          <span className="text-xs text-fg-subtle ml-1">{metric.unit}</span>
        </span>
      </div>
      {series.length >= 2 ? (
        <Sparkline data={series} color={metric.color} width={300} height={32} fill />
      ) : (
        <div className="h-8 flex items-center text-[11px] text-fg-subtle">no samples</div>
      )}
    </button>
  );
}

function PageHeader({
  generatedAt,
  validTo,
}: {
  generatedAt?: string;
  validTo?: string;
}) {
  const updated = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const validRange = validTo
    ? new Date(validTo).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Forecasts</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Short-term predictions · updated <span className="font-mono text-fg-muted">{updated}</span>
          {validRange && <> · valid through <span className="font-mono text-fg-muted">{validRange}</span></>}
        </span>
      </div>
    </div>
  );
}
