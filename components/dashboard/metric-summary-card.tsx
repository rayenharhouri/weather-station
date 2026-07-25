'use client';

import type { LucideIcon } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';

interface MetricSummaryCardProps {
  icon: LucideIcon;
  label: string;
  color: string;
  unit: string;
  current: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
  trend?: 'up' | 'down' | 'stable';
  decimals?: number;
}

export function MetricSummaryCard({
  icon: Icon,
  label,
  color,
  unit,
  current,
  min,
  avg,
  max,
  trend = 'stable',
  decimals = 1,
}: MetricSummaryCardProps) {
  const trendChip =
    trend === 'up' ? (
      <Chip tone="up">▲ rising</Chip>
    ) : trend === 'down' ? (
      <Chip tone="down">▼ falling</Chip>
    ) : (
      <Chip tone="flat">▬ stable</Chip>
    );

  return (
    <HairlineCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span style={{ color }} className="flex">
          <Icon size={16} strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        <span className="ml-auto">{trendChip}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-medium tabular-nums leading-none tracking-[-0.02em] text-fg">
          {current != null ? current.toFixed(decimals) : '—'}
        </span>
        <span className="text-base text-fg-muted">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-border-subtle">
        <Kv label="Min" value={fmt(min, decimals)} />
        <Kv label="Avg" value={fmt(avg, decimals)} />
        <Kv label="Max" value={fmt(max, decimals)} />
      </div>
    </HairlineCard>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 pt-2">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-sm tabular-nums text-fg">{value}</span>
    </div>
  );
}

function fmt(v: number | null, decimals: number): string {
  return v == null ? '—' : v.toFixed(decimals);
}
