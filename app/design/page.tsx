'use client';

import * as React from 'react';
import { Thermometer, Droplets, Gauge, CloudRain, Sun, Wind, Cpu } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { LiveDot } from '@/components/dashboard/live-dot';
import { SevInfo, SevWarn, SevCritical } from '@/components/dashboard/sev';
import { Sparkline } from '@/components/dashboard/sparkline';
import { MetricTile } from '@/components/dashboard/metric-tile';

const seed = {
  humidity: [60, 61, 60, 62, 63, 65, 64, 63, 64, 65, 66, 64, 63, 64, 65, 64],
  pressure: [1014.1, 1014.0, 1013.8, 1013.5, 1013.2, 1013.1, 1013.0, 1013.0, 1013.2, 1013.3, 1013.1, 1013.0, 1012.9, 1013.0, 1013.1, 1013.0],
  rainfall: [0, 0, 0, 0, 0.1, 0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  light: [380, 390, 395, 400, 405, 408, 410, 412, 415, 414, 412, 410, 408, 410, 411, 412],
  aqi: [42, 41, 40, 39, 40, 41, 40, 39, 38, 38, 37, 38, 39, 38, 37, 38],
  temp: [21, 21.3, 21.7, 22, 22.4, 22.8, 23, 23.2, 23.3, 23.4, 23.4, 23.3, 23.2, 23.3, 23.4, 23.4],
};

export default function DesignShowcase() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border-subtle px-8 py-5">
        <div className="text-xs uppercase tracking-wider text-fg-subtle font-medium">Internal · PR-2</div>
        <h1 className="text-xl font-semibold mt-1">Primitives showcase</h1>
        <p className="text-sm text-fg-muted mt-1 max-w-2xl">
          Every shared component, rendered against the live tokens. Used to verify
          the design system before page-by-page migration. Not linked from the product nav.
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-12">
        <Section title="Tokens — fast visual sanity check">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Swatch label="--bg" varName="--bg" />
            <Swatch label="--surface-2" varName="--surface-2" />
            <Swatch label="--fg" varName="--fg" />
            <Swatch label="--fg-muted" varName="--fg-muted" />
            <Swatch label="--fg-subtle" varName="--fg-subtle" />
            <Swatch label="--border-subtle" varName="--border-subtle" />
            <Swatch label="--accent-brand" varName="--accent-brand" />
            <Swatch label="--accent-brand-soft" varName="--accent-brand-soft" />
            <Swatch label="--sev-info" varName="--sev-info" />
            <Swatch label="--sev-warn" varName="--sev-warn" />
            <Swatch label="--sev-critical" varName="--sev-critical" />
            <Swatch label="--sev-success" varName="--sev-success" />
            <Swatch label="--m-temp" varName="--m-temp" />
            <Swatch label="--m-humidity" varName="--m-humidity" />
            <Swatch label="--m-pressure" varName="--m-pressure" />
            <Swatch label="--m-rainfall" varName="--m-rainfall" />
            <Swatch label="--m-light" varName="--m-light" />
            <Swatch label="--m-aqi" varName="--m-aqi" />
            <Swatch label="--m-battery" varName="--m-battery" />
            <Swatch label="--m-rssi" varName="--m-rssi" />
          </div>
        </Section>

        <Section title="HairlineCard" subtitle="Default + interactive">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <HairlineCard className="p-5">
              <div className="text-sm text-fg-muted">Static card</div>
              <div className="mt-2 text-base">No hover state. Border at <span className="font-mono">--border-subtle</span>.</div>
            </HairlineCard>
            <HairlineCard interactive className="p-5">
              <div className="text-sm text-fg-muted">Interactive card</div>
              <div className="mt-2 text-base">Hover me — border brightens to <span className="font-mono">--border-hover</span>.</div>
            </HairlineCard>
          </div>
        </Section>

        <Section title="Chip" subtitle="Inline mono pills with tone variants">
          <div className="flex flex-wrap gap-2 items-center">
            <Chip>default</Chip>
            <Chip tone="up">▲ 1.2</Chip>
            <Chip tone="down">▼ 0.3</Chip>
            <Chip tone="flat">▬ 0</Chip>
            <Chip>v1.4</Chip>
            <Chip>⌘K</Chip>
          </div>
        </Section>

        <Section title="LiveDot" subtitle="One pulse per view — the rest are static">
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-2">
              <LiveDot state="live" />
              <span className="text-sm text-fg-muted">Live (animated)</span>
            </div>
            <div className="flex items-center gap-2">
              <LiveDot state="warn" />
              <span className="text-sm text-fg-muted">Reconnecting (static yellow)</span>
            </div>
            <div className="flex items-center gap-2">
              <LiveDot state="offline" />
              <span className="text-sm text-fg-muted">Offline (static red)</span>
            </div>
          </div>
        </Section>

        <Section title="Severity shapes" subtitle="Info=dot, Warn=triangle, Critical=diamond — shape carries meaning alongside colour">
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-2">
              <SevInfo size={16} title="Info" />
              <span className="text-sm text-fg-muted">Info</span>
            </div>
            <div className="flex items-center gap-2">
              <SevWarn size={16} title="Warning" />
              <span className="text-sm text-fg-muted">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <SevCritical size={16} title="Critical" />
              <span className="text-sm text-fg-muted">Critical</span>
            </div>
          </div>
        </Section>

        <Section title="Sparkline" subtitle="Line + 8% area fill, with last-point marker">
          <div className="flex flex-wrap gap-6 items-center">
            <Sparkline data={seed.temp} color="var(--m-temp)" />
            <Sparkline data={seed.humidity} color="var(--m-humidity)" />
            <Sparkline data={seed.pressure} color="var(--m-pressure)" fill={false} />
          </div>
        </Section>

        <Section title="MetricTile" subtitle="The repeating dashboard unit, full composition">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
            <MetricTile
              icon={Droplets}
              metric="humidity"
              label="Humidity"
              value="64"
              unit="%"
              delta="1.2"
              deltaDir="up"
              data={seed.humidity}
              sparkWidth={210}
            />
            <MetricTile
              icon={Gauge}
              metric="pressure"
              label="Pressure"
              value="1013"
              unit="hPa"
              delta="0.3"
              deltaDir="down"
              data={seed.pressure}
              sparkWidth={210}
            />
            <MetricTile
              icon={CloudRain}
              metric="rainfall"
              label="Rainfall"
              value="0.0"
              unit="mm"
              delta="0"
              deltaDir="flat"
              data={seed.rainfall}
              sparkWidth={210}
            />
            <MetricTile
              icon={Sun}
              metric="light"
              label="Light"
              value="412"
              unit="lx"
              delta="12"
              deltaDir="up"
              data={seed.light}
              sparkWidth={210}
            />
            <MetricTile
              icon={Wind}
              metric="aqi"
              label="Air quality"
              value="38"
              unit="AQI"
              delta="1"
              deltaDir="down"
              data={seed.aqi}
              statusLabel="Good"
              sparkWidth={210}
            />
            <MetricTile
              icon={Thermometer}
              metric="temp"
              label="Temperature"
              value="23.4"
              unit="°C"
              delta="0.4"
              deltaDir="up"
              data={seed.temp}
              sparkWidth={210}
            />
          </div>
        </Section>

        <Section title="Type — Mono numerics" subtitle="Hero metric scale + smaller pairs">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[88px] font-medium tabular-nums leading-[0.9] tracking-[-0.03em]">23.4</span>
            <span className="font-mono text-2xl text-fg-muted">°C</span>
          </div>
          <div className="mt-6 flex gap-8 text-sm">
            <KV label="Feels like" value="22.1°" />
            <KV label="Min" value="18.7°" />
            <KV label="Max" value="26.0°" />
            <KV label="Latency" value="142 ms" />
          </div>
        </Section>
      </main>

      <footer className="border-t border-border-subtle px-8 py-5 mt-12">
        <span className="text-xs text-fg-subtle">
          PR-2 · primitives · port targets in <span className="font-mono">weather station/dashboard.jsx</span>
        </span>
      </footer>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ label, varName }: { label: string; varName: string }) {
  return (
    <HairlineCard className="p-3">
      <div
        className="h-10 w-full rounded-sm border border-border-inset"
        style={{ background: `var(${varName})` }}
      />
      <div className="mt-2 font-mono text-xs text-fg-muted">{label}</div>
    </HairlineCard>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}
