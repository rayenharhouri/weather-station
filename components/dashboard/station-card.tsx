'use client';

import { MapPin, Wifi, WifiOff, Wrench, type LucideIcon } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { LiveDot } from '@/components/dashboard/live-dot';
import type { Station } from '@/types';

interface StationCardProps {
  station: Station;
  onClick?: (station: Station) => void;
}

const STATUS_CONFIG: Record<
  Station['status'],
  { label: string; color: string; Icon: LucideIcon }
> = {
  online:      { label: 'Online',      color: 'var(--sev-success)',  Icon: Wifi },
  offline:     { label: 'Offline',     color: 'var(--sev-critical)', Icon: WifiOff },
  maintenance: { label: 'Maintenance', color: 'var(--sev-warn)',     Icon: Wrench },
};

export function StationCard({ station, onClick }: StationCardProps) {
  const cfg = STATUS_CONFIG[station.status];
  const lastSync = formatRelativeTime(station.lastSyncedAt);
  const liveState =
    station.status === 'online' ? 'live' : station.status === 'maintenance' ? 'warn' : 'offline';

  return (
    <HairlineCard
      interactive={Boolean(onClick)}
      onClick={onClick ? () => onClick(station) : undefined}
      className="flex flex-col gap-4 p-4 h-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="text-sm font-semibold text-fg truncate">{station.name}</div>
          <div className="flex items-center gap-1 text-xs text-fg-muted">
            <MapPin size={11} strokeWidth={1.5} />
            <span className="truncate">{station.location}</span>
          </div>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-border-subtle"
          aria-label={`Status: ${cfg.label}`}
        >
          <LiveDot state={liveState} />
          <span className="text-[11px] font-medium" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {station.latitude != null && station.longitude != null && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border-inset">
          <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">Coordinates</span>
          <span className="font-mono text-xs tabular-nums text-fg">
            {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
          </span>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle mb-2">
          Sensors · {station.enabledSensors.length}
        </div>
        <div className="flex flex-wrap gap-1">
          {station.enabledSensors.map((sensor) => (
            <span
              key={sensor}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border-subtle text-fg-muted"
            >
              {sensor}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-border-subtle">
        <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <cfg.Icon size={12} strokeWidth={1.5} />
          <span>{lastSync}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-fg-subtle">
          <span>id</span>
          <span className="text-fg-muted">{station.id.slice(0, 8)}</span>
        </div>
      </div>
    </HairlineCard>
  );
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never synced';
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  const min = Math.max(0, Math.floor((Date.now() - d.valueOf()) / 60_000));
  if (min < 1) return 'synced just now';
  if (min < 60) return `synced ${min}m ago`;
  return `synced ${Math.floor(min / 60)}h ago`;
}
