'use client';

import { ShieldCheck } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';

interface AnchorHealthCardProps {
  health: number;
  anchorsToday: number;
  recordsToday: number;
  cadencePerHour: number;
  nextAnchorIn?: string;
}

export function AnchorHealthCard({
  health,
  anchorsToday,
  recordsToday,
  cadencePerHour,
  nextAnchorIn,
}: AnchorHealthCardProps) {
  const healthColor =
    health >= 90 ? 'var(--sev-success)' : health >= 60 ? 'var(--sev-warn)' : 'var(--sev-critical)';

  return (
    <HairlineCard className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2">
        <span style={{ color: healthColor }} className="flex">
          <ShieldCheck size={16} strokeWidth={1.5} />
        </span>
        <span className="text-sm text-fg-muted">Anchor health</span>
        <span className="ml-auto font-mono text-xs tabular-nums" style={{ color: healthColor }}>
          {Math.round(health)}
        </span>
      </div>

      <div className="h-1 rounded-sm bg-surface-2 border border-border-inset overflow-hidden">
        <div
          className="h-full opacity-90"
          style={{ width: `${Math.max(0, Math.min(100, health))}%`, background: healthColor }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Kv label="Anchors · 24h" value={anchorsToday.toLocaleString()} />
        <Kv label="Records · 24h" value={recordsToday.toLocaleString()} />
        <Kv label="Avg cadence/h" value={`${cadencePerHour.toLocaleString()} rec`} />
        <Kv label="Next anchor" value={nextAnchorIn ?? '—'} />
      </div>
    </HairlineCard>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-sm tabular-nums text-fg">{value}</span>
    </div>
  );
}
