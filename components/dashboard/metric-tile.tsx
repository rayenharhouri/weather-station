import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { Sparkline } from '@/components/dashboard/sparkline';

export type MetricKey =
  | 'temp'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'light'
  | 'aqi'
  | 'battery'
  | 'rssi';

const metricVar: Record<MetricKey, string> = {
  temp: 'var(--m-temp)',
  humidity: 'var(--m-humidity)',
  pressure: 'var(--m-pressure)',
  rainfall: 'var(--m-rainfall)',
  light: 'var(--m-light)',
  aqi: 'var(--m-aqi)',
  battery: 'var(--m-battery)',
  rssi: 'var(--m-rssi)',
};

export interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  metric?: MetricKey;
  color?: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  data: number[];
  statusLabel?: string;
  sparkWidth?: number;
  sparkFill?: boolean;
  className?: string;
  onClick?: () => void;
}

const deltaArrow = (dir: MetricTileProps['deltaDir']) =>
  dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬';

export function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  metric,
  color,
  delta,
  deltaDir = 'flat',
  data,
  statusLabel,
  sparkWidth = 200,
  sparkFill = true,
  className,
  onClick,
}: MetricTileProps) {
  const c = color ?? (metric ? metricVar[metric] : 'var(--fg-muted)');

  return (
    <HairlineCard
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={`flex flex-col gap-2 p-4 ${className ?? ''}`.trim()}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: c }} className="flex">
          <Icon size={18} strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        {delta && (
          <Chip tone={deltaDir} className="ml-auto">
            <span className="text-[10px] leading-none">{deltaArrow(deltaDir)}</span>
            <span>{delta}</span>
          </Chip>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-medium tabular-nums leading-none tracking-[-0.02em] text-fg">
          {value}
        </span>
        {unit && <span className="text-base text-fg-muted">{unit}</span>}
        {statusLabel && (
          <span className="ml-auto text-xs text-fg-muted">{statusLabel}</span>
        )}
      </div>

      <div className="mt-1">
        <Sparkline data={data} color={c} width={sparkWidth} height={36} fill={sparkFill} />
      </div>
    </HairlineCard>
  );
}
