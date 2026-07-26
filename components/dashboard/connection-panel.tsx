'use client';

import { HairlineCard } from '@/components/ui/hairline-card';
import { LiveDot, type LiveState } from '@/components/dashboard/live-dot';

interface ConnectionPanelProps {
  state: LiveState;
  lastReceivedAt?: string;
  bytesPerSec?: number;
  msgsPerSec?: number;
  latencyMs?: number;
  openedAt?: string;
}

export function ConnectionPanel({
  state,
  lastReceivedAt,
  bytesPerSec,
  msgsPerSec,
  latencyMs,
  openedAt,
}: ConnectionPanelProps) {
  const stateLabel = state === 'live' ? 'Connected' : state === 'warn' ? 'Reconnecting' : 'Disconnected';
  const uptime = openedAt ? formatDuration(Date.now() - new Date(openedAt).valueOf()) : '—';

  return (
    <HairlineCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <LiveDot state={state} />
        <span className="text-sm text-fg">{stateLabel}</span>
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">uptime {uptime}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Stat label="Throughput" value={bytesPerSec != null ? `${formatBytes(bytesPerSec)}/s` : '—'} />
        <Stat label="Messages" value={msgsPerSec != null ? `${msgsPerSec.toFixed(1)} msg/s` : '—'} />
        <Stat label="Latency" value={latencyMs != null ? `${Math.round(latencyMs)} ms` : '—'} />
        <Stat label="Last frame" value={lastReceivedAt ? formatHMS(lastReceivedAt) : '—'} />
      </div>
    </HairlineCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-sm tabular-nums text-fg">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
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
