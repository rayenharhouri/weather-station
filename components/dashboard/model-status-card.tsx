'use client';

import { RefreshCw, Sparkles } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/dashboard/live-dot';

interface ModelStatusCardProps {
  modelName?: string;
  confidence?: number;
  lastRefreshAt?: string;
  metricAccuracy?: Array<{ metric: string; rmse: number }>;
  explanation?: string;
  onRecompute?: () => void;
  isRecomputing?: boolean;
}

export function ModelStatusCard({
  modelName = 'arima-15m',
  confidence,
  lastRefreshAt,
  metricAccuracy,
  explanation,
  onRecompute,
  isRecomputing,
}: ModelStatusCardProps) {
  return (
    <HairlineCard className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--m-pressure)' }} className="flex">
          <Sparkles size={16} strokeWidth={1.5} />
        </span>
        <span className="text-sm text-fg-muted">Model</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sev-success)' }}>
          <LiveDot state="live" />
          <span>Running</span>
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-base text-fg">{modelName}</span>
      </div>

      {confidence != null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="uppercase tracking-[0.06em] text-fg-subtle">Confidence</span>
            <span className="font-mono text-fg tabular-nums">{Math.round(confidence)}%</span>
          </div>
          <div className="h-1 rounded-sm bg-surface-2 border border-border-inset overflow-hidden">
            <div
              className="h-full opacity-90"
              style={{ width: `${Math.max(0, Math.min(100, confidence))}%`, background: 'var(--m-pressure)' }}
            />
          </div>
        </div>
      )}

      {metricAccuracy && metricAccuracy.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border-subtle">
          <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">RMSE per metric</span>
          {metricAccuracy.map((m) => (
            <div key={m.metric} className="flex items-center justify-between font-mono text-xs">
              <span className="text-fg-muted">{m.metric}</span>
              <span className="text-fg tabular-nums">{m.rmse.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {explanation && (
        <p className="text-xs text-fg-muted leading-relaxed pt-1 border-t border-border-subtle">
          {explanation}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-border-subtle flex flex-col gap-1.5">
        <Button variant="outline" size="sm" onClick={onRecompute} disabled={isRecomputing} className="w-full justify-center">
          <RefreshCw size={13} strokeWidth={1.5} className={isRecomputing ? 'animate-spin' : ''} />
          <span>{isRecomputing ? 'Recomputing…' : 'Recompute now'}</span>
        </Button>
        {lastRefreshAt && (
          <span className="text-[10px] text-fg-subtle text-center">
            Last refresh{' '}
            <span className="font-mono text-fg-muted">{formatHMS(lastRefreshAt)}</span>
          </span>
        )}
      </div>
    </HairlineCard>
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
