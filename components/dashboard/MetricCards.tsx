'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, Minus, Wifi, WifiOff, Wrench, Battery, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccentTone = 'sky' | 'sunset' | 'sunrise' | 'aurora' | 'storm' | 'primary';

const accentClasses: Record<AccentTone, { gradient: string; ring: string; iconBg: string; glow: string }> = {
  sky:     { gradient: 'from-sky/30 to-transparent',     ring: 'ring-sky/20',     iconBg: 'bg-sky/15 text-sky',         glow: 'shadow-sky/20' },
  sunset:  { gradient: 'from-sunset/30 to-transparent',  ring: 'ring-sunset/20',  iconBg: 'bg-sunset/15 text-sunset',   glow: 'shadow-sunset/20' },
  sunrise: { gradient: 'from-sunrise/30 to-transparent', ring: 'ring-sunrise/20', iconBg: 'bg-sunrise/15 text-sunrise', glow: 'shadow-sunrise/20' },
  aurora:  { gradient: 'from-aurora/30 to-transparent',  ring: 'ring-aurora/20',  iconBg: 'bg-aurora/15 text-aurora',   glow: 'shadow-aurora/20' },
  storm:   { gradient: 'from-storm/40 to-transparent',   ring: 'ring-storm/20',   iconBg: 'bg-storm/15 text-storm',     glow: 'shadow-storm/20' },
  primary: { gradient: 'from-primary/30 to-transparent', ring: 'ring-primary/20', iconBg: 'bg-primary/15 text-primary', glow: 'shadow-primary/20' },
};

interface MetricCardProps {
  label: string;
  value: number | null;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
  icon?: React.ReactNode;
  decimals?: number;
  description?: string;
  onClick?: () => void;
  accent?: AccentTone;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  isLoading = false,
  icon,
  decimals = 1,
  description,
  onClick,
  accent = 'sky',
}) => {
  const tone = accentClasses[accent];
  const trendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor =
    trend === 'up' ? 'text-sunset' : trend === 'down' ? 'text-sky' : 'text-muted-foreground';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative group/metric overflow-hidden',
        onClick && 'cursor-pointer hover:-translate-y-0.5 transition-transform duration-200',
        tone.ring
      )}
    >
      {/* Accent gradient sweep */}
      <div
        aria-hidden
        className={cn('absolute inset-x-0 -top-12 h-24 bg-gradient-to-b blur-2xl opacity-80 pointer-events-none', tone.gradient)}
      />

      <CardContent className="relative pt-1">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {icon && (
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', tone.iconBg)}>
              {icon}
            </div>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-9 w-24 mb-2" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {value !== null ? value.toFixed(decimals) : '—'}
            </span>
            {unit && (
              <span className="text-sm font-medium text-muted-foreground">{unit}</span>
            )}
          </div>
        )}

        {(description || trend) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {trend && (
              <span className={cn('inline-flex items-center gap-0.5 font-medium', trendColor)}>
                <TrendIcon className="w-3 h-3" />
                {trend}
              </span>
            )}
            {description && <span className="text-muted-foreground">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface StationStatusCardProps {
  stationName: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncedAt: string;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  batteryLevel?: number;
  recordsProcessed?: number;
}

export const StationStatusCard: React.FC<StationStatusCardProps> = ({
  stationName,
  status,
  lastSyncedAt,
  signalStrength,
  batteryLevel,
  recordsProcessed,
}) => {
  const statusToneMap = {
    online: { dot: 'bg-aurora', label: 'text-aurora', accent: 'from-aurora/30' },
    offline: { dot: 'bg-destructive', label: 'text-destructive', accent: 'from-destructive/30' },
    maintenance: { dot: 'bg-sunrise', label: 'text-sunrise', accent: 'from-sunrise/30' },
  } as const;
  const tone = statusToneMap[status];

  const StatusIcon = status === 'online' ? Wifi : status === 'maintenance' ? Wrench : WifiOff;

  const signalBars = { excellent: 4, good: 3, fair: 2, poor: 1, none: 0 } as const;

  const lastSync = new Date(lastSyncedAt);
  const minutesAgo = Math.floor((Date.now() - lastSync.getTime()) / 60000);
  const lastSyncLabel = minutesAgo <= 1 ? 'just now' : `${minutesAgo}m ago`;

  const batteryColor =
    !batteryLevel ? 'text-muted-foreground' :
    batteryLevel > 60 ? 'text-aurora' :
    batteryLevel > 25 ? 'text-sunrise' : 'text-destructive';

  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className={cn('absolute inset-x-0 -top-12 h-24 bg-gradient-to-b to-transparent blur-2xl opacity-80', tone.accent)} />

      <CardContent className="relative space-y-4 pt-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Station</div>
            <h3 className="text-base font-semibold mt-0.5">{stationName}</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-subtle">
            <span className="relative flex h-2 w-2">
              {status === 'online' && (
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', tone.dot)} />
              )}
              <span className={cn('relative inline-flex rounded-full h-2 w-2', tone.dot)} />
            </span>
            <span className={cn('text-[11px] font-medium capitalize', tone.label)}>{status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl glass-subtle p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Activity className="w-3 h-3" /> Last sync
            </div>
            <div className="font-medium tabular-nums">{lastSyncLabel}</div>
          </div>
          <div className="rounded-xl glass-subtle p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <StatusIcon className="w-3 h-3" /> Signal
            </div>
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-sm transition-colors',
                    i <= signalBars[signalStrength] ? 'bg-primary' : 'bg-foreground/15',
                  )}
                  style={{ height: `${i * 25}%` }}
                />
              ))}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2 capitalize">
                {signalStrength}
              </span>
            </div>
          </div>

          {batteryLevel !== undefined && (
            <div className="rounded-xl glass-subtle p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Battery className={cn('w-3 h-3', batteryColor)} /> Battery
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{batteryLevel}%</span>
                <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      batteryLevel > 60 ? 'bg-aurora' : batteryLevel > 25 ? 'bg-sunrise' : 'bg-destructive',
                    )}
                    style={{ width: `${batteryLevel}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {recordsProcessed !== undefined && (
            <div className="rounded-xl glass-subtle p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Activity className="w-3 h-3" /> Records
              </div>
              <div className="font-medium tabular-nums">{recordsProcessed.toLocaleString()}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface QuickStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    unit?: string;
  }>;
  isLoading?: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats, isLoading = false }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardContent className="pt-1">
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-16 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">
                    {stat.value}
                  </span>
                  {stat.unit && <span className="text-xs text-muted-foreground">{stat.unit}</span>}
                </div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
