'use client';

import { type LucideIcon } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { LiveDot } from '@/components/dashboard/live-dot';

/**
 * Live page metric card. Same hairline shell as MetricTile but with:
 *   - bigger value (mono, 32px)
 *   - inline area chart that fills the body
 *   - optional delta + update-time row
 */
export interface LiveMetricCardProps {
  icon: LucideIcon;
  label: string;
  color: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  data: number[];
  receivedAt?: string;
  showLiveDot?: boolean;
}

export function LiveMetricCard({
  icon: Icon,
  label,
  color,
  value,
  unit,
  delta,
  deltaDir = 'flat',
  data,
  receivedAt,
  showLiveDot,
}: LiveMetricCardProps) {
  return (
    <HairlineCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span style={{ color }} className="flex">
          <Icon size={18} strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        <div className="ml-auto flex items-center gap-2">
          {showLiveDot && <LiveDot state="live" />}
          {delta && (
            <Chip tone={deltaDir}>
              <span className="text-[10px] leading-none">
                {deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : '▬'}
              </span>
              <span>{delta}</span>
            </Chip>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono font-medium tabular-nums text-fg leading-none tracking-[-0.02em] text-[32px]">
          {value}
        </span>
        {unit && <span className="text-base text-fg-muted">{unit}</span>}
        {receivedAt && (
          <span className="ml-auto font-mono text-[11px] text-fg-subtle">
            {formatHMS(receivedAt)}
          </span>
        )}
      </div>

      <LiveAreaChart data={data} color={color} />
    </HairlineCard>
  );
}

function LiveAreaChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="h-32 flex items-center justify-center text-xs text-fg-subtle">Awaiting data…</div>;
  }

  const width = 360;
  const height = 128;
  const pad = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const last = pts[pts.length - 1];
  const areaPath =
    linePath +
    ` L${(width - pad).toFixed(1)} ${(height - pad).toFixed(1)}` +
    ` L${pad.toFixed(1)} ${(height - pad).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-32"
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity={0.1} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
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
