'use client';

import { ArrowRight } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { AlertRow } from '@/components/dashboard/alert-row';
import type { Alert } from '@/types';

interface AlertsCardProps {
  alerts: Alert[];
  lastTriggeredAt?: string;
  onViewAll?: () => void;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  isLoading?: boolean;
}

export function AlertsCard({
  alerts,
  lastTriggeredAt,
  onViewAll,
  onAcknowledge,
  onResolve,
  isLoading,
}: AlertsCardProps) {
  const shown = alerts.slice(0, 5);

  return (
    <HairlineCard>
      <div className="flex items-center px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted">Open alerts</span>
        <span className="ml-2 font-mono text-xs text-fg-subtle">· {alerts.length}</span>
        {lastTriggeredAt && (
          <span className="ml-auto flex items-center gap-2 text-xs text-fg-muted">
            Last triggered{' '}
            <span className="font-mono text-fg">{formatTime(lastTriggeredAt)}</span>
          </span>
        )}
        {onViewAll && (
          <Button
            variant="ghost"
            size="xs"
            className="ml-3"
            onClick={onViewAll}
          >
            View all <ArrowRight size={12} strokeWidth={1.5} />
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-fg-muted">
          {isLoading ? 'Loading alerts…' : 'No open alerts on this station.'}
        </div>
      ) : (
        <div>
          {shown.map((alert, idx) => (
            <div key={alert.id}>
              <AlertRow alert={alert} onAcknowledge={onAcknowledge} onResolve={onResolve} />
              {idx < shown.length - 1 && <div className="hairline" />}
            </div>
          ))}
        </div>
      )}
    </HairlineCard>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
