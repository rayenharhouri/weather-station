'use client';

import { Cpu } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';

interface HealthTileProps {
  batteryPct: number | null;
  rssiDbm: number | null;
  status?: 'OK' | 'Degraded' | 'Down';
}

export function HealthTile({ batteryPct, rssiDbm, status = 'OK' }: HealthTileProps) {
  const rssiPct = rssiDbm == null ? null : Math.max(0, Math.min(100, (rssiDbm + 100) * 1.25));
  const tone = status === 'OK' ? 'up' : status === 'Degraded' ? 'flat' : 'down';

  return (
    <HairlineCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--m-battery)' }} className="flex">
          <Cpu size={18} strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-fg-muted">Station health</span>
        <Chip tone={tone} className="ml-auto">
          {status}
        </Chip>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-medium tabular-nums leading-none tracking-[-0.02em] text-fg">
          {batteryPct ?? '—'}
        </span>
        <span className="text-base text-fg-muted">%</span>
        {rssiDbm != null && (
          <span className="ml-auto font-mono text-xs text-fg-subtle">{rssiDbm} dBm</span>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-1.5">
        <DualBar label="BAT" pct={batteryPct ?? 0} color="var(--m-battery)" />
        <DualBar label="RSSI" pct={rssiPct ?? 0} color="var(--m-rssi)" />
      </div>
    </HairlineCard>
  );
}

function DualBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] text-fg-subtle w-6 tracking-[0.04em]">{label}</span>
      <div className="flex-1 h-1 bg-surface-2 border border-border-inset rounded-sm overflow-hidden">
        <div className="h-full opacity-90" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
