'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { Pause, Play, Camera, Thermometer, Droplets, Gauge, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LiveDot } from '@/components/dashboard/live-dot';
import { LiveMetricCard } from '@/components/dashboard/live-metric-card';
import { ConnectionPanel } from '@/components/dashboard/connection-panel';
import { StreamTape } from '@/components/dashboard/stream-tape';
import { useLiveReadings } from '@/hooks/useSSEStream';
import { useReportLiveStatus } from '@/providers/LiveStatusProvider';
import { stationService, readingService } from '@/services/api';
import type { WeatherReading } from '@/types';

const BUFFER_LENGTH = 180;

export default function LivePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LiveContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function LiveContent() {
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const openedAtRef = useRef<string>(new Date().toISOString());
  const bytesRef = useRef<number>(0);
  const msgsRef = useRef<number>(0);
  const [throughput, setThroughput] = useState({ bytesPerSec: 0, msgsPerSec: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const { data: seedData } = useQuery({
    queryKey: ['live-seed', stationId],
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
    staleTime: 30_000,
    enabled: !!station,
  });

  useEffect(() => {
    if (seedData?.items && readings.length === 0) {
      setReadings(seedData.items.slice(-BUFFER_LENGTH));
    }
  }, [seedData]);

  const onLive = useCallback(
    (r: WeatherReading) => {
      if (isPaused) return;
      setReadings((prev) => [...prev, r].slice(-BUFFER_LENGTH));
      bytesRef.current += approxBytes(r);
      msgsRef.current += 1;
    },
    [isPaused],
  );

  const { isConnected, pause, resume } = useLiveReadings(stationId, onLive);

  const latestSyncAt =
    readings.length > 0
      ? readings[readings.length - 1].receivedAt ?? readings[readings.length - 1].recordedAt
      : null;
  useReportLiveStatus({
    connected: isConnected,
    lastSyncAt: latestSyncAt,
    detail: throughput.msgsPerSec > 0 ? `${throughput.msgsPerSec} msg/s` : null,
  });

  useEffect(() => {
    const t = window.setInterval(() => {
      setThroughput({ bytesPerSec: bytesRef.current, msgsPerSec: msgsRef.current });
      bytesRef.current = 0;
      msgsRef.current = 0;
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const liveState = isConnected ? (isPaused ? 'warn' : 'live') : 'offline';
  const latest = readings[readings.length - 1];

  const handleSnapshot = useCallback(async () => {
    const node = contentRef.current;
    if (!node || isSnapping) return;

    setIsSnapping(true);
    setSnapshotError(null);

    document.documentElement.classList.add('snap-freeze');

    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0a';
      const dataUrl = await toPng(node, {
        backgroundColor: bg,
        pixelRatio: 2,
        cacheBust: true,
        filter: (el) => !(el instanceof HTMLElement && el.dataset.snapExclude === 'true'),
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `weatherhub-live-${stamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : 'Snapshot failed.');
    } finally {
      document.documentElement.classList.remove('snap-freeze');
      setIsSnapping(false);
    }
  }, [isSnapping]);

  const series = useMemo(
    () => ({
      temperature: pick(readings, 'temperatureC'),
      humidity: pick(readings, 'humidityPct'),
      pressure: pick(readings, 'pressureHpa'),
      airQuality: pick(readings, 'airQualityValue'),
    }),
    [readings],
  );

  const latencyMs = latest
    ? Math.max(0, new Date(latest.receivedAt).valueOf() - new Date(latest.recordedAt).valueOf())
    : undefined;

  return (
    <div ref={contentRef} className="flex flex-col gap-4 px-6 py-5 h-full min-h-0">
      <PageHeader
        stationName={station?.name}
        stationLocation={station?.location}
        isLive={isConnected && !isPaused}
        lastReceivedAt={latest?.receivedAt}
        isPaused={isPaused}
        onPause={() => {
          setIsPaused(true);
          pause();
        }}
        onResume={() => {
          setIsPaused(false);
          resume();
        }}
        onSnapshot={handleSnapshot}
        isSnapping={isSnapping}
        snapshotError={snapshotError}
        onDismissSnapshotError={() => setSnapshotError(null)}
      />

      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}
      >
        {/* Left: 2×2 metric grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 min-h-0">
          <LiveMetricCard
            icon={Thermometer}
            label="Temperature"
            color="var(--m-temp)"
            value={fmt(latest?.temperatureC, 2)}
            unit="°C"
            data={series.temperature}
            receivedAt={latest?.receivedAt}
            delta={deltaOf(series.temperature, '°', 2)}
            deltaDir={dirOf(series.temperature)}
            showLiveDot
          />
          <LiveMetricCard
            icon={Droplets}
            label="Humidity"
            color="var(--m-humidity)"
            value={fmt(latest?.humidityPct, 1)}
            unit="%"
            data={series.humidity}
            receivedAt={latest?.receivedAt}
            delta={deltaOf(series.humidity, '', 1)}
            deltaDir={dirOf(series.humidity)}
          />
          <LiveMetricCard
            icon={Gauge}
            label="Pressure"
            color="var(--m-pressure)"
            value={fmt(latest?.pressureHpa, 2)}
            unit="hPa"
            data={series.pressure}
            receivedAt={latest?.receivedAt}
            delta={deltaOf(series.pressure, '', 1)}
            deltaDir={dirOf(series.pressure)}
          />
          <LiveMetricCard
            icon={Wind}
            label="Air quality"
            color="var(--m-aqi)"
            value={fmt(latest?.airQualityValue, 0)}
            unit="AQI"
            data={series.airQuality}
            receivedAt={latest?.receivedAt}
            delta={deltaOf(series.airQuality, '', 0)}
            deltaDir={dirOf(series.airQuality)}
          />
        </div>

        {/* Right: connection panel + stream tape */}
        <div className="grid grid-rows-[auto_minmax(0,1fr)] gap-3 min-h-0">
          <ConnectionPanel
            state={liveState}
            lastReceivedAt={latest?.receivedAt}
            bytesPerSec={throughput.bytesPerSec}
            msgsPerSec={throughput.msgsPerSec}
            latencyMs={latencyMs}
            openedAt={openedAtRef.current}
          />
          <StreamTape readings={readings} maxRows={60} />
        </div>
      </div>
    </div>
  );
}

function PageHeader({
  stationName,
  stationLocation,
  isLive,
  isPaused,
  lastReceivedAt,
  onPause,
  onResume,
  onSnapshot,
  isSnapping,
  snapshotError,
  onDismissSnapshotError,
}: {
  stationName?: string;
  stationLocation?: string;
  isLive: boolean;
  isPaused: boolean;
  lastReceivedAt?: string;
  onPause: () => void;
  onResume: () => void;
  onSnapshot: () => void;
  isSnapping: boolean;
  snapshotError: string | null;
  onDismissSnapshotError: () => void;
}) {
  const subtitle = stationName
    ? `Sub-second SSE · ${stationName}${stationLocation ? ` · ${stationLocation}` : ''} · interpolated every 250ms`
    : 'Sub-second SSE';

  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Live stream</h1>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-border-subtle">
            <LiveDot state={isLive ? 'live' : 'offline'} />
            <span className="text-[11px] font-medium text-fg-muted">
              {isLive ? 'Streaming' : isPaused ? 'Paused' : 'Disconnected'}
            </span>
            {lastReceivedAt && (
              <span className="font-mono text-[11px] text-fg-subtle ml-1">
                · {formatHMS(lastReceivedAt)}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-fg-subtle">{subtitle}</span>
        {snapshotError && (
          <button
            type="button"
            onClick={onDismissSnapshotError}
            className="text-[11px] text-sev-critical mt-1 hover:underline text-left"
            data-snap-exclude="true"
          >
            Snapshot failed — {snapshotError}. Click to dismiss.
          </button>
        )}
      </div>
      <div className="flex items-center gap-2" data-snap-exclude="true">
        {isPaused ? (
          <Button size="sm" onClick={onResume}>
            <Play size={13} strokeWidth={1.5} /> Resume
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onPause}>
            <Pause size={13} strokeWidth={1.5} /> Pause
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onSnapshot} disabled={isSnapping}>
          <Camera size={13} strokeWidth={1.5} />
          {isSnapping ? 'Saving…' : 'Snapshot'}
        </Button>
      </div>
    </div>
  );
}

function pick(readings: WeatherReading[], key: keyof WeatherReading): number[] {
  const out: number[] = [];
  for (const r of readings) {
    const v = r[key];
    if (typeof v === 'number') out.push(v);
  }
  return out;
}

function fmt(v: number | null | undefined, decimals: number): string {
  return v == null ? '—' : v.toFixed(decimals);
}

function deltaOf(series: number[], suffix: string, decimals: number): string | undefined {
  if (series.length < 2) return undefined;
  const d = series[series.length - 1] - series[series.length - 2];
  if (Math.abs(d) < 0.0001) return `0${suffix}`;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(decimals)}${suffix}`;
}

function dirOf(series: number[]): 'up' | 'down' | 'flat' {
  if (series.length < 2) return 'flat';
  const d = series[series.length - 1] - series[series.length - 2];
  if (d > 0.0001) return 'up';
  if (d < -0.0001) return 'down';
  return 'flat';
}

function approxBytes(r: WeatherReading): number {
  return JSON.stringify(r).length;
}

function formatHMS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
