'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert as AlertType } from '@/types';
import { cn } from '@/lib/utils';

const severityTone = {
  critical: {
    icon: AlertCircle,
    accent: 'bg-destructive',
    accentSoft: 'bg-destructive/10 text-destructive ring-destructive/20',
    glow: 'shadow-destructive/30',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'bg-sunset',
    accentSoft: 'bg-sunset/10 text-sunset ring-sunset/20',
    glow: 'shadow-sunset/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    accent: 'bg-primary',
    accentSoft: 'bg-primary/10 text-primary ring-primary/20',
    glow: 'shadow-primary/30',
    label: 'Info',
  },
} as const;

const statusTone = {
  open: 'bg-primary/10 text-primary ring-primary/20',
  acknowledged: 'bg-aurora/10 text-aurora ring-aurora/20',
  resolved: 'bg-aurora/10 text-aurora ring-aurora/20',
} as const;

interface AlertItemProps {
  alert: AlertType;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  isLoading?: boolean;
}

export const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  isLoading = false,
}) => {
  const tone = severityTone[alert.severity];
  const Icon = tone.icon;

  const triggeredTime = new Date(alert.triggeredAt);
  const minutesAgo = Math.floor((Date.now() - triggeredTime.getTime()) / 60000);
  const timeDisplay = minutesAgo < 1 ? 'just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;

  return (
    <div className="relative glass-subtle rounded-xl p-3.5 hover:translate-x-0.5 transition-transform group/alert overflow-hidden">
      {/* Severity accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', tone.accent)} />
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl blur-sm opacity-60', tone.accent)} />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1', tone.accentSoft)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="font-medium text-sm capitalize">{alert.metric}</span>
              <span className={cn('text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ring-1', tone.accentSoft)}>
                {tone.label}
              </span>
              <span className={cn('text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ring-1', statusTone[alert.status])}>
                {alert.status}
              </span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-2">{alert.message}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground tabular-nums">
              <span>
                <span className="font-mono text-foreground/70">{alert.actualValue.toFixed(2)}</span>
                <span className="mx-1">·</span>
                threshold {alert.threshold.toFixed(2)}
              </span>
              <span>·</span>
              <span>{timeDisplay}</span>
            </div>
          </div>
        </div>
        {alert.status === 'open' && (
          <div className="flex gap-1 shrink-0 opacity-0 group-hover/alert:opacity-100 transition-opacity">
            {onAcknowledge && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onAcknowledge(alert.id)}
                disabled={isLoading}
              >
                Ack
              </Button>
            )}
            {onResolve && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs hover:bg-aurora/10 hover:text-aurora"
                onClick={() => onResolve(alert.id)}
                disabled={isLoading}
              >
                Resolve
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface AlertsPanelProps {
  alerts: AlertType[];
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  isLoading?: boolean;
  onViewAll?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  isLoading = false,
  onViewAll,
}) => {
  const openAlerts = alerts.filter((a) => a.status === 'open');
  const criticalCount = openAlerts.filter((a) => a.severity === 'critical').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sunset/15 text-sunset flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">Recent Alerts</CardTitle>
            <CardDescription className="text-xs">
              <span className={cn('font-medium', criticalCount > 0 ? 'text-destructive' : 'text-foreground/70')}>
                {openAlerts.length} open
              </span>
              {criticalCount > 0 && <span> · {criticalCount} critical</span>}
              <span> · {alerts.length} total</span>
            </CardDescription>
          </div>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
            View all →
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-10 px-6">
            <div className="w-12 h-12 rounded-full bg-aurora/15 text-aurora flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground mt-1">No alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
