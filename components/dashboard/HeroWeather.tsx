'use client';

import React from 'react';
import { Cloud, CloudRain, CloudSun, Sun, Snowflake, Wind, Droplets, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HeroWeatherProps {
  stationName?: string;
  location?: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  windKph?: number | null;
  rainfallMm?: number | null;
  receivedAt?: string;
  isLoading?: boolean;
}

function inferCondition(tempC: number | null, rainfall: number | null, humidity: number | null) {
  if (tempC === null) return { label: 'No data', Icon: Cloud, gradient: 'from-storm to-storm/40' };
  if (rainfall && rainfall > 0.1) return { label: 'Rain', Icon: CloudRain, gradient: 'from-sky-deep to-sky' };
  if (tempC <= 0) return { label: 'Snow risk', Icon: Snowflake, gradient: 'from-sky to-mist' };
  if (humidity && humidity > 80) return { label: 'Cloudy', Icon: Cloud, gradient: 'from-mist to-sky/60' };
  if (tempC >= 28) return { label: 'Sunny', Icon: Sun, gradient: 'from-sunset to-sunrise' };
  return { label: 'Partly cloudy', Icon: CloudSun, gradient: 'from-sky to-sunrise/60' };
}

export const HeroWeather: React.FC<HeroWeatherProps> = ({
  stationName = 'Campus Station',
  location = 'University Quad',
  temperatureC,
  humidityPct,
  pressureHpa,
  windKph,
  rainfallMm,
  receivedAt,
  isLoading = false,
}) => {
  const condition = inferCondition(temperatureC, rainfallMm ?? null, humidityPct);
  const { Icon } = condition;

  const time = receivedAt
    ? new Date(receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Card className="relative overflow-hidden ring-1 ring-foreground/10">
      {/* Animated weather gradient backdrop */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-70 -z-10',
          condition.gradient,
        )}
      />
      <div aria-hidden className="absolute inset-0 backdrop-blur-2xl bg-background/30 -z-10" />
      <div aria-hidden className="absolute -top-24 -right-12 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-24 -left-12 w-64 h-64 rounded-full bg-aurora/20 blur-3xl pointer-events-none" />

      <div className="relative p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="flex items-center gap-5 md:gap-7 min-w-0">
          {/* Big weather icon */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl glass-strong flex items-center justify-center shadow-xl">
              <Icon className="w-10 h-10 md:w-12 md:h-12 text-foreground" strokeWidth={1.6} />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-white/20 blur-2xl -z-10" />
          </div>

          {/* Temperature + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/70 mb-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aurora opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-aurora" />
              </span>
              Live · {time}
            </div>
            {isLoading || temperatureC === null ? (
              <Skeleton className="h-14 w-32" />
            ) : (
              <div className="flex items-start gap-1">
                <span className="text-6xl md:text-7xl font-semibold tracking-tighter tabular-nums leading-none">
                  {Math.round(temperatureC)}
                </span>
                <span className="text-2xl font-medium text-foreground/70 mt-2">°C</span>
              </div>
            )}
            <div className="mt-2">
              <div className="text-base md:text-lg font-medium">{condition.label}</div>
              <div className="text-xs text-foreground/70 mt-0.5">
                {stationName} · {location}
              </div>
            </div>
          </div>
        </div>

        {/* Side metrics */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-2 md:min-w-[200px]">
          <SideStat icon={Droplets} label="Humidity" value={humidityPct} unit="%" decimals={0} />
          <SideStat icon={Gauge} label="Pressure" value={pressureHpa} unit="hPa" decimals={0} />
          <SideStat icon={Wind} label="Wind" value={windKph ?? null} unit="kph" decimals={1} />
        </div>
      </div>
    </Card>
  );
};

const SideStat: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | null | undefined;
  unit: string;
  decimals: number;
}> = ({ icon: Icon, label, value, unit, decimals }) => (
  <div className="rounded-xl glass-subtle px-3 py-2.5 flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center text-foreground/70">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-foreground/70">{label}</div>
      <div className="text-sm font-semibold tabular-nums">
        {value !== null && value !== undefined ? value.toFixed(decimals) : '—'}
        <span className="text-[11px] font-normal text-foreground/70 ml-1">{unit}</span>
      </div>
    </div>
  </div>
);
