'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, Droplets, Gauge, CloudRain, Sun, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { HeroWeatherCard } from '@/components/dashboard/hero-weather-card';
import { HealthTile } from '@/components/dashboard/health-tile';
import { AlertsCard } from '@/components/dashboard/alerts-card';
import { ForecastCard } from '@/components/dashboard/forecast-card';
import { IntegrityCard } from '@/components/dashboard/integrity-card';
import { useLiveReadings } from '@/hooks/useSSEStream';
import { useReportLiveStatus } from '@/providers/LiveStatusProvider';
import {
  stationService,
  readingService,
  alertService,
  forecastService,
  integrityService,
} from '@/services/api';
import type { WeatherReading } from '@/types';

const FALLBACK_HISTORY_LENGTH = 16;

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const { data: latestData } = useQuery({
    queryKey: ['latest-reading', stationId],
    queryFn: () => readingService.getLatest(stationId),
    refetchInterval: 30_000,
    enabled: !!station,
  });
  const latest = latestData?.items[0];

  const { data: historyData } = useQuery({
    queryKey: ['dashboard-history', stationId],
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 60 * 60 * 1000);
      return readingService.getHistory({
        stationId,
        from: from.toISOString(),
        to: to.toISOString(),
        interval: '5m',
      });
    },
    refetchInterval: 60_000,
    enabled: !!station,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', stationId, 'open'],
    queryFn: () => alertService.getAlerts({ stationId, status: 'open' }),
    refetchInterval: 60_000,
    enabled: !!station,
  });

  const { data: deviceStatus } = useQuery({
    queryKey: ['device-status', stationId],
    queryFn: () => readingService.getDeviceStatus(stationId),
    refetchInterval: 30_000,
    enabled: !!station,
  });

  const { data: forecast } = useQuery({
    queryKey: ['forecast', stationId, '24h'],
    queryFn: () => forecastService.getForecasts(stationId, '24h'),
    refetchInterval: 600_000,
    enabled: !!station,
  });

  const { data: integrityData } = useQuery({
    queryKey: ['integrity-batches', stationId],
    queryFn: () => integrityService.getBatches({ stationId }),
    refetchInterval: 120_000,
    enabled: !!station,
  });

  // SSE — overlay the freshest reading on top of the polled latest.
  const [liveReading, setLiveReading] = useState<WeatherReading | null>(null);
  const handleLive = useCallback((r: WeatherReading) => setLiveReading(r), []);
  const { isConnected } = useLiveReadings(stationId, handleLive);
  const current = liveReading ?? latest ?? null;

  // Report this page's live state up to the operations topbar so the
  // header's LiveDot reflects reality (instead of being hardcoded `live`).
  useReportLiveStatus({
    connected: isConnected,
    lastSyncAt: current?.receivedAt ?? current?.recordedAt ?? null,
  });

  // Build sparkline arrays from history — one per metric, padded if missing.
  const history = historyData?.items ?? [];
  const sparks = {
    temperature: extractSeries(history, 'temperatureC'),
    humidity: extractSeries(history, 'humidityPct'),
    pressure: extractSeries(history, 'pressureHpa'),
    rainfall: extractSeries(history, 'rainfallMm'),
    light: extractSeries(history, 'lightLux'),
    airQuality: extractSeries(history, 'airQualityValue'),
  };

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => alertService.acknowledgeAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => alertService.resolveAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const minMax = computeMinMax(history.map((r) => r.temperatureC));

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader
        lastSyncedAt={current?.receivedAt}
        stationName={station?.name}
        stationLocation={station?.location}
      />

      {/* Hero + metric grid */}
      <div className="grid gap-3 min-h-[280px]" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 4fr)' }}>
        <HeroWeatherCard
          temperatureC={current?.temperatureC ?? null}
          humidityPct={current?.humidityPct ?? null}
          rainfallMm={current?.rainfallMm ?? null}
          feelsLikeC={current?.temperatureC != null ? current.temperatureC - 1.3 : null}
          minC={minMax.min}
          maxC={minMax.max}
          latitude={station?.latitude}
          longitude={station?.longitude}
        />

        <div className="grid grid-cols-3 grid-rows-2 gap-3">
          <MetricTile
            icon={Droplets}
            metric="humidity"
            label="Humidity"
            value={fmt(current?.humidityPct, 0)}
            unit="%"
            data={sparks.humidity}
            sparkWidth={210}
          />
          <MetricTile
            icon={Gauge}
            metric="pressure"
            label="Pressure"
            value={fmt(current?.pressureHpa, 0)}
            unit="hPa"
            data={sparks.pressure}
            sparkWidth={210}
          />
          <MetricTile
            icon={CloudRain}
            metric="rainfall"
            label="Rainfall"
            value={fmt(current?.rainfallMm, 1)}
            unit="mm"
            data={sparks.rainfall}
            sparkWidth={210}
          />
          <MetricTile
            icon={Sun}
            metric="light"
            label="Light"
            value={fmt(current?.lightLux, 0)}
            unit="lx"
            data={sparks.light}
            sparkWidth={210}
          />
          <MetricTile
            icon={Wind}
            metric="aqi"
            label="Air quality"
            value={fmt(current?.airQualityValue, 0)}
            unit="AQI"
            data={sparks.airQuality}
            statusLabel={aqiLabel(current?.airQualityValue)}
            sparkWidth={210}
          />
          <HealthTile
            batteryPct={deviceStatus?.batteryLevel ?? null}
            rssiDbm={current?.signalRssi ?? null}
            status={deviceStatus?.signalStrength === 'none' ? 'Down' : 'OK'}
          />
        </div>
      </div>

      <AlertsCard
        alerts={alertsData?.items ?? []}
        lastTriggeredAt={alertsData?.items[0]?.triggeredAt}
        onViewAll={() => router.push('/alerts')}
        onAcknowledge={(id) => ackMutation.mutate(id)}
        onResolve={(id) => resolveMutation.mutate(id)}
      />

      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{ gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 2fr)' }}
      >
        <ForecastCard
          forecast={forecast ?? null}
          onViewDetails={() => router.push('/forecasts')}
        />
        <IntegrityCard
          batches={integrityData?.items ?? []}
          onVerifyRecord={() => router.push('/integrity')}
        />
      </div>
    </div>
  );
}

function PageHeader({
  lastSyncedAt,
  stationName,
  stationLocation,
}: {
  lastSyncedAt?: string;
  stationName?: string;
  stationLocation?: string;
}) {
  const lastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  const subtitle = stationName
    ? `Real-time overview · ${stationName}${stationLocation ? ` · ${stationLocation}` : ''}`
    : 'Real-time overview';

  return (
    <div className="flex items-end justify-between pb-1">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Dashboard</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">{subtitle}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-fg-subtle">
        <span>Last sync</span>
        <span className="font-mono text-fg">{lastSync}</span>
        <span className="w-px h-3.5 bg-border-subtle" />
        <Button variant="outline" size="xs">
          Last 24h <ChevronDown size={11} strokeWidth={1.5} />
        </Button>
        <Button variant="outline" size="xs">
          <Plus size={12} strokeWidth={1.5} /> Add widget
        </Button>
      </div>
    </div>
  );
}

function extractSeries(history: WeatherReading[], key: keyof WeatherReading): number[] {
  const series = history
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number');
  if (series.length === 0) return Array(FALLBACK_HISTORY_LENGTH).fill(0);
  return series;
}

function computeMinMax(values: Array<number | null | undefined>): { min: number | null; max: number | null } {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function fmt(v: number | null | undefined, decimals: number): string {
  return v == null ? '—' : v.toFixed(decimals);
}

function aqiLabel(v: number | null | undefined): string | undefined {
  if (v == null) return undefined;
  if (v <= 50) return 'Good';
  if (v <= 100) return 'Moderate';
  if (v <= 150) return 'Unhealthy';
  return 'Hazardous';
}
