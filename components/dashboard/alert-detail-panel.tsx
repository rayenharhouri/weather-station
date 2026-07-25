'use client';

import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Activity, ExternalLink } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { Sev, type Severity } from '@/components/dashboard/sev';
import { Sparkline } from '@/components/dashboard/sparkline';
import { readingService } from '@/services/api';
import type { Alert, WeatherReading } from '@/types';

interface AlertDetailPanelProps {
  alert: Alert;
  onClose?: () => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  pending?: boolean;
}

const METRIC_COLORS: Record<string, string> = {
  temperature: 'var(--m-temp)',
  humidity: 'var(--m-humidity)',
  pressure: 'var(--m-pressure)',
  rainfall: 'var(--m-rainfall)',
  light: 'var(--m-light)',
  airQuality: 'var(--m-aqi)',
  battery: 'var(--m-battery)',
  signal: 'var(--m-rssi)',
};

const READING_FIELD_BY_METRIC: Record<string, keyof WeatherReading> = {
  temperature: 'temperatureC',
  humidity: 'humidityPct',
  pressure: 'pressureHpa',
  rainfall: 'rainfallMm',
  light: 'lightLux',
  airQuality: 'airQualityValue',
  battery: 'batteryVoltage',
  signal: 'signalRssi',
};

export function AlertDetailPanel({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  pending,
}: AlertDetailPanelProps) {
  const severity = (alert.severity ?? 'info') as Severity;
  const color = METRIC_COLORS[alert.metric] ?? 'var(--fg-muted)';
  const readingField = READING_FIELD_BY_METRIC[alert.metric];

  // Pull a 30-min window around the trigger time so we can show the breach in context.
  const triggeredMs = new Date(alert.triggeredAt).valueOf();
  const from = new Date(triggeredMs - 30 * 60 * 1000).toISOString();
  const to = new Date(Math.min(Date.now(), triggeredMs + 30 * 60 * 1000)).toISOString();

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['alert-context', alert.id, alert.stationId, alert.metric],
    queryFn: () =>
      readingService.getHistory({
        stationId: alert.stationId,
        from,
        to,
        interval: '5m',
      }),
    enabled: Boolean(readingField),
    staleTime: 60_000,
  });

  const series =
    readingField && history?.items
      ? history.items
          .map((r) => r[readingField])
          .filter((v): v is number => typeof v === 'number')
      : [];

  const exceededBy = alert.actualValue - alert.threshold;
  const exceededPct = alert.threshold !== 0 ? (exceededBy / Math.abs(alert.threshold)) * 100 : 0;
  const triggeredFmt = formatDateTime(alert.triggeredAt);
  const acknowledgedFmt = alert.acknowledgedAt ? formatDateTime(alert.acknowledgedAt) : null;
  const resolvedFmt = alert.resolvedAt ? formatDateTime(alert.resolvedAt) : null;

  return (
    <HairlineCard className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border-subtle">
        <div className="pt-0.5">
          <Sev severity={severity} size={16} />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="text-[10px] uppercase tracking-[0.08em] font-medium"
            style={{ color: severityColor(severity) }}
          >
            {severityLabel(severity)} · {alert.metric}
          </span>
          <h2 className="text-base font-semibold text-fg leading-snug">{alert.message}</h2>
          <div className="flex items-center gap-1 text-xs text-fg-muted mt-0.5">
            <MapPin size={11} strokeWidth={1.5} />
            <span className="font-mono">{alert.stationId.slice(0, 14)}…</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="text-fg-subtle hover:text-fg transition-colors p-0.5 rounded-sm focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 px-5 py-4 flex-1 overflow-y-auto">
        {/* Threshold block */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle mb-2">
            Threshold breach
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Kv
              label="Actual"
              value={
                <span style={{ color }} className="font-mono text-2xl font-medium tabular-nums leading-none">
                  {alert.actualValue.toFixed(2)}
                </span>
              }
            />
            <Kv
              label="Threshold"
              value={
                <span className="font-mono text-2xl font-medium tabular-nums leading-none text-fg-muted">
                  {alert.threshold.toFixed(2)}
                </span>
              }
            />
            <Kv
              label={exceededBy >= 0 ? 'Exceeded by' : 'Below by'}
              value={
                <span
                  className="font-mono text-lg font-medium tabular-nums leading-none"
                  style={{ color: severityColor(severity) }}
                >
                  {exceededBy >= 0 ? '+' : ''}
                  {exceededBy.toFixed(2)}
                  <span className="text-xs text-fg-subtle ml-1">
                    ({exceededPct >= 0 ? '+' : ''}
                    {exceededPct.toFixed(0)}%)
                  </span>
                </span>
              }
            />
          </div>
        </section>

        {/* Breach context sparkline */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
              Breach context · ±30 min
            </h3>
            {series.length > 0 && (
              <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
                {series.length} samples
              </span>
            )}
          </div>
          <div className="rounded-md border border-border-subtle px-3 py-2">
            {historyLoading ? (
              <div className="h-16 flex items-center justify-center text-xs text-fg-muted">
                Loading context…
              </div>
            ) : series.length < 2 ? (
              <div className="h-16 flex items-center justify-center text-xs text-fg-muted">
                No readings in this window.
              </div>
            ) : (
              <Sparkline
                data={series}
                color={color}
                width={520}
                height={64}
                fill
                className="w-full h-16"
              />
            )}
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle mb-2">Timeline</h3>
          <div className="flex flex-col gap-2">
            <TimelineRow
              label="Triggered"
              value={triggeredFmt}
              tone={severity === 'critical' ? 'critical' : severity === 'warn' ? 'warn' : 'info'}
            />
            {acknowledgedFmt && (
              <TimelineRow
                label="Acknowledged"
                value={
                  acknowledgedFmt + (alert.acknowledgedBy ? ` · ${alert.acknowledgedBy}` : '')
                }
                tone="info"
              />
            )}
            {resolvedFmt && (
              <TimelineRow
                label="Resolved"
                value={resolvedFmt + (alert.resolvedBy ? ` · ${alert.resolvedBy}` : '')}
                tone="success"
              />
            )}
          </div>
        </section>

        {/* Metadata */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle mb-2">Metadata</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetaKv label="Alert id" value={alert.id} mono />
            <MetaKv label="Status" value={alert.status} capitalize />
            <MetaKv label="Severity" value={alert.severity} capitalize />
            <MetaKv label="Metric" value={alert.metric} />
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <div
        className="px-5 py-3 border-t border-border-subtle flex items-center gap-2 justify-end"
        data-snap-exclude="true"
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-fg-muted"
          onClick={() => onClose?.()}
        >
          <ExternalLink size={13} strokeWidth={1.5} />
          Open station
        </Button>
        {alert.status === 'open' && onAcknowledge && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onAcknowledge(alert.id)}
          >
            <Activity size={13} strokeWidth={1.5} />
            Acknowledge
          </Button>
        )}
        {alert.status !== 'resolved' && onResolve && (
          <Button size="sm" disabled={pending} onClick={() => onResolve(alert.id)}>
            Resolve
          </Button>
        )}
      </div>
    </HairlineCard>
  );
}

function severityColor(s: Severity): string {
  return s === 'critical' ? 'var(--sev-critical)' : s === 'warn' ? 'var(--sev-warn)' : 'var(--sev-info)';
}

function severityLabel(s: Severity): string {
  return s === 'critical' ? 'Critical' : s === 'warn' ? 'Warning' : 'Info';
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span>{value}</span>
    </div>
  );
}

type TimelineTone = 'info' | 'warn' | 'critical' | 'success';
const TIMELINE_COLOR: Record<TimelineTone, string> = {
  info: 'var(--sev-info)',
  warn: 'var(--sev-warn)',
  critical: 'var(--sev-critical)',
  success: 'var(--sev-success)',
};

function TimelineRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: TimelineTone;
}) {
  return (
    <div className="flex items-center gap-2.5 text-xs">
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: TIMELINE_COLOR[tone] }}
      />
      <span className="text-fg-muted w-24 shrink-0">{label}</span>
      <span className="font-mono text-fg tabular-nums truncate">{value}</span>
    </div>
  );
}

function MetaKv({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-surface-2 border border-border-subtle">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span
        className={[
          'text-xs text-fg',
          mono ? 'font-mono truncate' : '',
          capitalize ? 'capitalize' : '',
        ].join(' ').trim()}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} · ${time}`;
}
