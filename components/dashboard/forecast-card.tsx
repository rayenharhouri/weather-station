'use client';

import { ArrowRight } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import type { Forecast, ForecastItem } from '@/types';

type MetricKey = ForecastItem['metric'];

interface ForecastCardProps {
  forecast: Forecast | null | undefined;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

const METRIC_CONFIG: Record<
  MetricKey,
  { label: string; color: string; unit: string }
> = {
  temperature: { label: 'Temp.', color: 'var(--m-temp)', unit: '°' },
  humidity: { label: 'Humidity', color: 'var(--m-humidity)', unit: '%' },
  pressure: { label: 'Pressure', color: 'var(--m-pressure)', unit: '' },
  rainfall: { label: 'Rainfall', color: 'var(--m-rainfall)', unit: 'mm' },
};

export function ForecastCard({ forecast, isLoading, onViewDetails }: ForecastCardProps) {
  const grouped = groupItems(forecast?.items ?? []);

  return (
    <HairlineCard className="flex flex-col h-full px-5 py-4">
      <div className="flex items-center mb-2">
        <span className="text-sm text-fg-muted">Forecast</span>
        <span className="ml-2 font-mono text-xs text-fg-subtle">· next 24h</span>
        {onViewDetails && (
          <Button variant="ghost" size="xs" className="ml-auto" onClick={onViewDetails}>
            Open forecasts <ArrowRight size={12} strokeWidth={1.5} />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
          Loading forecast…
        </div>
      ) : !forecast || Object.keys(grouped).length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
          No forecast available yet. Check station connectivity.
        </div>
      ) : (
        <div className="flex flex-col flex-1 justify-around">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => {
            const items = grouped[metric];
            if (!items || items.length === 0) return null;
            const { label, color, unit } = METRIC_CONFIG[metric];
            return (
              <ForecastRow
                key={metric}
                label={label}
                color={color}
                unit={unit}
                items={items.slice(0, 4)}
              />
            );
          })}
        </div>
      )}
    </HairlineCard>
  );
}

function ForecastRow({
  label,
  color,
  unit,
  items,
}: {
  label: string;
  color: string;
  unit: string;
  items: ForecastItem[];
}) {
  if (items.length === 0) return null;
  const values = items.map((i) => i.predictedValue);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const first = items[0]?.predictedValue ?? 0;
  const last = items[items.length - 1]?.predictedValue ?? first;
  const dir = last > first * 1.005 ? 'up' : last < first * 0.995 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '↗' : dir === 'down' ? '↘' : '→';

  return (
    <div
      className="grid items-center gap-3 py-2.5"
      style={{ gridTemplateColumns: '72px repeat(4, 1fr) 24px' }}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="block w-1.5 h-1.5 rounded-sm" style={{ background: color }} />
        <span className="text-xs text-fg-muted">{label}</span>
      </div>
      {items.map((item, idx) => {
        const h = 6 + ((item.predictedValue - min) / range) * 22;
        return (
          <div key={idx} className="flex flex-col items-start gap-1">
            <span className="font-mono text-[13px] text-fg tabular-nums">
              {item.predictedValue.toFixed(1)}
              {unit && <span className="text-[10px] text-fg-subtle ml-px">{unit}</span>}
            </span>
            <div className="flex items-end gap-1.5 h-7 w-full">
              <div
                className="w-7 opacity-90 rounded-[1px]"
                style={{ height: h, background: color }}
              />
              <span className="font-mono text-[10px] text-fg-subtle pb-0.5 leading-none">
                {formatHorizon(item.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
      <span className="font-mono text-sm text-fg-muted text-right">{arrow}</span>
    </div>
  );
}

function groupItems(items: ForecastItem[]): Partial<Record<MetricKey, ForecastItem[]>> {
  const out: Partial<Record<MetricKey, ForecastItem[]>> = {};
  for (const it of items) {
    if (!METRIC_CONFIG[it.metric]) continue;
    (out[it.metric] ??= []).push(it);
  }
  return out;
}

function formatHorizon(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  const diffH = Math.round((d.valueOf() - Date.now()) / (60 * 60 * 1000));
  if (diffH <= 0) return 'now';
  return `${diffH}h`;
}
