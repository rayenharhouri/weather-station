'use client';

import { HairlineCard } from '@/components/ui/hairline-card';
import type { WeatherReading } from '@/types';

interface StreamTapeProps {
  readings: WeatherReading[];
  maxRows?: number;
}

export function StreamTape({ readings, maxRows = 40 }: StreamTapeProps) {
  const shown = readings.slice(-maxRows).reverse();

  return (
    <HairlineCard className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted">Stream tape</span>
        <span className="font-mono text-xs text-fg-subtle">· last {shown.length}</span>
      </div>

      {shown.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-fg-muted px-4 py-8">
          Awaiting readings — the tape fills as messages arrive.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead className="sticky top-0 bg-bg">
              <tr className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="text-left font-medium px-4 py-2">Time</th>
                <th className="text-right font-medium px-2 py-2" style={{ color: 'var(--m-temp)' }}>°C</th>
                <th className="text-right font-medium px-2 py-2" style={{ color: 'var(--m-humidity)' }}>%</th>
                <th className="text-right font-medium px-2 py-2" style={{ color: 'var(--m-pressure)' }}>hPa</th>
                <th className="text-right font-medium px-4 py-2" style={{ color: 'var(--m-aqi)' }}>AQI</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, idx) => {
                const prev = shown[idx + 1];
                return (
                  <tr key={r.id} className="hover:bg-surface-2 transition-colors duration-150">
                    <td className="text-fg-subtle px-4 py-1.5">{formatHMS(r.recordedAt)}</td>
                    <Cell value={r.temperatureC} prev={prev?.temperatureC} decimals={1} />
                    <Cell value={r.humidityPct} prev={prev?.humidityPct} decimals={0} />
                    <Cell value={r.pressureHpa} prev={prev?.pressureHpa} decimals={0} />
                    <Cell value={r.airQualityValue} prev={prev?.airQualityValue} decimals={0} pad="px-4" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </HairlineCard>
  );
}

function Cell({
  value,
  prev,
  decimals,
  pad = 'px-2',
}: {
  value?: number | null;
  prev?: number | null;
  decimals: number;
  pad?: string;
}) {
  if (value == null) {
    return <td className={`text-right text-fg-subtle py-1.5 ${pad}`}>—</td>;
  }
  let toneClass = 'text-fg';
  if (prev != null) {
    if (value > prev) toneClass = 'text-sev-success';
    else if (value < prev) toneClass = 'text-sev-critical';
  }
  return (
    <td className={`text-right py-1.5 ${pad} ${toneClass}`}>{value.toFixed(decimals)}</td>
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
