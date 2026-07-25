'use client';

import { Cloud, CloudRain, CloudSun, Snowflake, Sun, type LucideIcon } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';

interface HeroWeatherCardProps {
  temperatureC: number | null;
  humidityPct: number | null;
  rainfallMm: number | null;
  feelsLikeC?: number | null;
  minC?: number | null;
  maxC?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  compact?: boolean;
}

function inferCondition(
  tempC: number | null,
  rainfall: number | null,
  humidity: number | null,
): { label: string; Icon: LucideIcon } {
  if (tempC == null) return { label: 'No data', Icon: Cloud };
  if (rainfall != null && rainfall > 0.1) return { label: 'Rain', Icon: CloudRain };
  if (tempC <= 0) return { label: 'Snow risk', Icon: Snowflake };
  if (humidity != null && humidity > 80) return { label: 'Cloudy', Icon: Cloud };
  if (tempC >= 28) return { label: 'Sunny', Icon: Sun };
  return { label: 'Partly cloudy', Icon: CloudSun };
}

export function HeroWeatherCard({
  temperatureC,
  humidityPct,
  rainfallMm,
  feelsLikeC,
  minC,
  maxC,
  latitude,
  longitude,
  compact,
}: HeroWeatherCardProps) {
  const { label, Icon } = inferCondition(temperatureC, rainfallMm, humidityPct);
  const tempDisplay = temperatureC != null ? temperatureC.toFixed(1) : '—';
  const coords =
    latitude != null && longitude != null
      ? `${latitude.toFixed(2)}°N · ${longitude.toFixed(2)}°E`
      : null;

  return (
    <HairlineCard
      className={`flex flex-col h-full ${compact ? 'p-4 gap-2' : 'p-6 gap-3'}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-fg-muted flex">
          <Icon size={compact ? 22 : 26} strokeWidth={1.5} />
        </span>
        <span className="text-sm text-fg-muted">{label}</span>
        {coords && (
          <span className="ml-auto font-mono text-[11px] text-fg-subtle">{coords}</span>
        )}
      </div>

      <div className={`flex-1 flex items-baseline gap-1 ${compact ? 'mt-1' : 'mt-3'}`}>
        <span
          className="font-mono font-medium tabular-nums text-fg leading-[0.9]"
          style={{
            fontSize: compact ? 64 : 88,
            letterSpacing: compact ? '-0.025em' : '-0.03em',
          }}
        >
          {tempDisplay}
        </span>
        <span
          className="font-mono text-fg-muted font-normal"
          style={{ fontSize: compact ? 22 : 28 }}
        >
          °C
        </span>
      </div>

      <div
        className={`flex items-stretch mt-auto ${compact ? 'pt-2' : 'pt-3'} border-t border-border-subtle`}
      >
        <Stat label="Feels like" value={fmtTemp(feelsLikeC)} />
        <span className="vhairline" />
        <Stat label="Min" value={fmtTemp(minC)} />
        <span className="vhairline" />
        <Stat label="Max" value={fmtTemp(maxC)} />
      </div>
    </HairlineCard>
  );
}

function fmtTemp(c: number | null | undefined): string {
  return c != null ? `${c.toFixed(1)}°` : '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col gap-0.5 px-3">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-sm tabular-nums text-fg">{value}</span>
    </div>
  );
}
