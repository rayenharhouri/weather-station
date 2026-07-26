'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chip } from '@/components/ui/chip';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import { EndpointBar } from '@/components/research/endpoint-bar';
import {
  ParamsForm,
  type PlaygroundMetric,
  type PlaygroundQuery,
} from '@/components/research/params-form';
import {
  ResponsePanel,
  type PlaygroundResponse,
  type PlaygroundResponsePoint,
} from '@/components/research/response-panel';
import { RequestPreview } from '@/components/research/request-preview';
import { readingService } from '@/services/api';
import type { WeatherReading } from '@/types';

const METRIC_COLOR: Record<PlaygroundMetric, string> = {
  temperature: 'var(--m-temp)',
  humidity: 'var(--m-humidity)',
  pressure: 'var(--m-pressure)',
  rainfall: 'var(--m-rainfall)',
  light: 'var(--m-light)',
  aqi: 'var(--m-aqi)',
};

const METRIC_LABEL: Record<PlaygroundMetric, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  pressure: 'Pressure',
  rainfall: 'Rainfall',
  light: 'Light',
  aqi: 'Air quality',
};

const METRIC_READING_FIELD: Record<
  PlaygroundMetric,
  { field: keyof WeatherReading; unit: string }
> = {
  temperature: { field: 'temperatureC', unit: 'celsius' },
  humidity: { field: 'humidityPct', unit: 'percent' },
  pressure: { field: 'pressureHpa', unit: 'hPa' },
  rainfall: { field: 'rainfallMm', unit: 'mm' },
  light: { field: 'lightLux', unit: 'lux' },
  aqi: { field: 'airQualityValue', unit: 'aqi' },
};

const INITIAL_QUERY: PlaygroundQuery = {
  stations: ['tunis-campus'],
  metric: 'temperature',
  since: defaultSinceIso(),
  until: defaultUntilIso(),
  interval: '5m',
  limit: 200,
};

export default function PlaygroundPage() {
  const [query, setQuery] = useState<PlaygroundQuery>(INITIAL_QUERY);
  const [pending, setPending] = useState(false);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const runQuery = useCallback(
    async (q: PlaygroundQuery) => {
      setPending(true);
      setError(null);
      const startedAt = performance.now();
      try {
        const result = await readingService.getHistory({
          stationId: q.stations[0] ?? 'station-001',
          from: q.since,
          to: q.until,
          interval: q.interval,
        });
        const durationMs = Math.round(performance.now() - startedAt);
        const next = mapReadingsToResponse(result.items, q, durationMs);
        setResponse(next);
        setLastRunAt(new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Query failed.');
      } finally {
        setPending(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runQuery(INITIAL_QUERY);
  }, []);

  const handleSend = useCallback(() => {
    void runQuery(query);
  }, [query, runQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSend]);

  const modifiedFields = useMemo(() => countModified(query, INITIAL_QUERY), [query]);

  return (
    <ResearchAppShell crumbs={[{ label: 'Playground' }]}>
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5 gap-3 overflow-hidden">
        <PageHeader />

        <EndpointBar
          method="GET"
          path="/v1/readings"
          lastRunAt={lastRunAt ?? undefined}
          lastRunMs={response?.durationMs}
          lastRunStatus={response?.status}
        />

        {error && (
          <div
            role="alert"
            className="px-3.5 py-2 rounded-md border border-border-subtle text-xs text-sev-critical"
            style={{ background: 'color-mix(in oklch, var(--sev-critical) 8%, transparent)' }}
          >
            <span className="font-medium">Query failed.</span>{' '}
            <span className="text-fg-muted">{error}</span>{' '}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-1 underline hover:text-fg"
            >
              Dismiss
            </button>
          </div>
        )}

        <div
          className="grid gap-3.5 flex-1 min-h-0"
          style={{ gridTemplateColumns: '380px minmax(0, 1fr)' }}
        >
          <ParamsForm
            query={query}
            onChange={setQuery}
            onSend={handleSend}
            onReset={() => setQuery(INITIAL_QUERY)}
            pending={pending}
            modifiedFields={modifiedFields}
          />
          <ResponsePanel response={response} pending={pending} />
        </div>

        <RequestPreview query={query} />
      </div>
    </ResearchAppShell>
  );
}

function PageHeader() {
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Playground</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Run live API queries against your data. Copy as curl / Python / R, save snippets, or
          send to Datasets.
        </span>
      </div>
    </div>
  );
}

function mapReadingsToResponse(
  readings: WeatherReading[],
  query: PlaygroundQuery,
  durationMs: number,
): PlaygroundResponse {
  const { field, unit } = METRIC_READING_FIELD[query.metric];

  const data: PlaygroundResponsePoint[] = readings
    .filter((r) => typeof r[field] === 'number')
    .map((r) => {
      const value = r[field] as number;
      const recordedMs = new Date(r.recordedAt).valueOf();
      const ageMin = (Date.now() - recordedMs) / 60_000;
      return {
        id: r.id,
        recordedAt: r.recordedAt,
        value: round2(value),
        unit,
        merkleAnchor: ageMin > 60 ? `b-${r.id.slice(0, 6)}` : null,
      };
    })
    .slice(0, query.limit);

  const sizeBytes = JSON.stringify(data).length;
  const cursor = data.length >= query.limit ? `cursor_${data[data.length - 1]?.id}` : null;

  return {
    status: '200 OK',
    contentType: 'application/json',
    durationMs,
    sizeBytes,
    records: data.length,
    data,
    cursor,
    metricLabel: METRIC_LABEL[query.metric],
    color: METRIC_COLOR[query.metric],
  };
}

function countModified(a: PlaygroundQuery, b: PlaygroundQuery): number {
  let n = 0;
  if (a.metric !== b.metric) n++;
  if (a.since !== b.since) n++;
  if (a.until !== b.until) n++;
  if (a.interval !== b.interval) n++;
  if (a.limit !== b.limit) n++;
  if (a.stations.length !== b.stations.length || a.stations.some((s, i) => s !== b.stations[i])) {
    n++;
  }
  return n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function defaultSinceIso(): string {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function defaultUntilIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
