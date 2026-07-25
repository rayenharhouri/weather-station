'use client';

import { Button } from '@/components/ui/button';
import { Sev, type Severity } from '@/components/dashboard/sev';
import type { Alert } from '@/types';

interface AlertRowProps {
  alert: Alert;
  /** Show station id alongside the metric. Dashboard hides it; alerts page shows it. */
  showStation?: boolean;
  /** Selection state. When true, the row gets an accent bar + highlighted background. */
  selected?: boolean;
  /** Selecting an alert opens the detail panel. */
  onSelect?: (id: string) => void;
  /** Pass an action handler to render the Ack button. Omit to hide. */
  onAcknowledge?: (id: string) => void;
  /** Pass an action handler to render the Resolve button. Omit to hide. */
  onResolve?: (id: string) => void;
  /** Pending state — disables the action buttons. */
  pending?: boolean;
}

/**
 * Single alert row — the repeating unit used by AlertsCard (dashboard preview)
 * and by the full Alerts page list. Severity is communicated by both the
 * shape primitive (info=dot / warn=triangle / critical=diamond) and the
 * inline colour, so the row stays legible for colour-blind users.
 *
 * When `onSelect` is wired, the row acts as a button (role=button, keyboard
 * activation) and dispatches selection. Ack/Resolve buttons live inside but
 * stop event propagation so they don't accidentally select the row.
 */
export function AlertRow({
  alert,
  showStation,
  selected,
  onSelect,
  onAcknowledge,
  onResolve,
  pending,
}: AlertRowProps) {
  const severity = (alert.severity ?? 'info') as Severity;
  const threshold = `${alert.metric} ${alert.actualValue.toFixed(2)} / ${alert.threshold.toFixed(2)} threshold`;
  const interactive = Boolean(onSelect);

  const handleClick = () => onSelect?.(alert.id);
  const handleKey = (e: React.KeyboardEvent) => {
    if (!onSelect) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(alert.id);
    }
  };

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? Boolean(selected) : undefined}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKey : undefined}
      className={[
        'relative flex items-center gap-3 px-4 py-3 transition-colors duration-150',
        interactive ? 'cursor-pointer' : '',
        selected ? 'bg-surface-2' : 'hover:bg-surface-2',
        interactive
          ? 'focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-[-2px]'
          : '',
      ].join(' ').trim()}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-sm"
          style={{ background: 'var(--accent-brand)' }}
        />
      )}
      <Sev severity={severity} size={14} />
      <div className="flex flex-col gap-0.5 min-w-[14rem] flex-1">
        <span className="text-sm font-medium text-fg">{alert.message}</span>
        <span className="font-mono text-xs text-fg-subtle">{threshold}</span>
      </div>
      {showStation && (
        <span className="hidden md:inline text-sm text-fg-muted truncate max-w-[12rem]">
          {alert.stationId.slice(0, 12)}…
        </span>
      )}
      <div
        className="flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-xs text-fg-subtle">{formatTime(alert.triggeredAt)}</span>
        {alert.status === 'open' && onAcknowledge && (
          <Button variant="ghost" size="xs" disabled={pending} onClick={() => onAcknowledge(alert.id)}>
            Ack
          </Button>
        )}
        {alert.status !== 'resolved' && onResolve && (
          <Button variant="outline" size="xs" disabled={pending} onClick={() => onResolve(alert.id)}>
            Resolve
          </Button>
        )}
        {alert.status === 'resolved' && (
          <span className="text-[11px] text-sev-success uppercase tracking-[0.06em]">Resolved</span>
        )}
        {alert.status === 'acknowledged' && (
          <span className="text-[11px] text-fg-muted uppercase tracking-[0.06em]">Acked</span>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
