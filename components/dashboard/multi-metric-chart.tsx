'use client';

import { useCallback, useMemo, useRef, useState, type PointerEvent } from 'react';

export interface MultiMetricSeries {
  key: string;
  label: string;
  color: string;
  unit: string;
  values: Array<number | null>;
  decimals?: number;
}

interface MultiMetricChartProps {
  timestamps: string[];
  series: MultiMetricSeries[];
  rowHeight?: number;
  pad?: number;
}

export function MultiMetricChart({
  timestamps,
  series,
  rowHeight = 80,
  pad = 8,
}: MultiMetricChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const xLabels = useMemo(() => buildXLabels(timestamps, 6), [timestamps]);

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-fg-muted">
        Pick at least one metric to plot.
      </div>
    );
  }

  return (
    <div className="flex flex-col" onPointerLeave={() => setHoverIndex(null)}>
      {series.map((s) => (
        <SeriesRow
          key={s.key}
          series={s}
          rowHeight={rowHeight}
          pad={pad}
          totalPoints={timestamps.length}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
        />
      ))}
      <XAxis
        labels={xLabels}
        hoverIndex={hoverIndex}
        timestamps={timestamps}
      />
    </div>
  );
}

function SeriesRow({
  series,
  rowHeight,
  pad,
  totalPoints,
  hoverIndex,
  onHover,
}: {
  series: MultiMetricSeries;
  rowHeight: number;
  pad: number;
  totalPoints: number;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const vals = series.values;
  const points = vals.filter((v): v is number => v != null);
  const max = points.length ? Math.max(...points) : 1;
  const min = points.length ? Math.min(...points) : 0;
  const range = max - min || 1;
  const decimals = series.decimals ?? 1;
  const cellRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const node = cellRef.current;
      if (!node || totalPoints < 2) return;
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const idx = Math.round(pct * (totalPoints - 1));
      onHover(idx);
    },
    [onHover, totalPoints],
  );

  const hovered = hoverIndex != null && hoverIndex >= 0 && hoverIndex < vals.length
    ? vals[hoverIndex]
    : null;
  const displayValue = hovered ?? lastNumber(vals);
  const showingHover = hoverIndex != null && hovered != null;

  return (
    <div
      className="grid items-stretch gap-3 border-b border-border-subtle"
      style={{ gridTemplateColumns: '120px 1fr 80px' }}
    >
      <div className="flex flex-col gap-0.5 py-3 pl-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="block w-1.5 h-3 rounded-sm"
            style={{ background: series.color }}
          />
          <span className="text-sm font-medium text-fg">{series.label}</span>
        </div>
        <span className="font-mono text-[11px] text-fg-subtle pl-3.5 tabular-nums">
          {points.length ? `${min.toFixed(decimals)} – ${max.toFixed(decimals)} ${series.unit}` : 'no samples'}
        </span>
      </div>

      <div
        ref={cellRef}
        className="relative cursor-crosshair"
        style={{ height: rowHeight }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
      >
        <ChartSvg
          values={vals}
          min={min}
          max={max}
          range={range}
          color={series.color}
          height={rowHeight}
          pad={pad}
          hoverIndex={hoverIndex}
        />
      </div>

      <div className="flex flex-col items-end justify-center pr-1">
        <span
          className="font-mono text-base font-medium tabular-nums tracking-[-0.01em]"
          style={{ color: showingHover ? series.color : 'var(--fg)' }}
        >
          {displayValue != null ? displayValue.toFixed(decimals) : '—'}
        </span>
        <span className="text-[10px] text-fg-subtle uppercase tracking-[0.06em]">
          {series.unit}
        </span>
      </div>
    </div>
  );
}

function ChartSvg({
  values,
  min,
  max,
  range,
  color,
  height,
  pad,
  hoverIndex,
}: {
  values: Array<number | null>;
  min: number;
  max: number;
  range: number;
  color: string;
  height: number;
  pad: number;
  hoverIndex: number | null;
}) {
  const width = 800; // logical viewBox; container scales it
  const step = (width - pad * 2) / Math.max(1, values.length - 1);
  const yOf = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const xOf = (i: number) => pad + i * step;

  const segments: string[] = [];
  let currentSeg: string[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (currentSeg.length) {
        segments.push(currentSeg.join(' '));
        currentSeg = [];
      }
      return;
    }
    const x = xOf(i).toFixed(1);
    const y = yOf(v).toFixed(1);
    currentSeg.push(`${currentSeg.length === 0 ? 'M' : 'L'}${x} ${y}`);
  });
  if (currentSeg.length) segments.push(currentSeg.join(' '));

  let lastIdx = values.length - 1;
  while (lastIdx >= 0 && values[lastIdx] == null) lastIdx--;
  const lastPoint = lastIdx >= 0 ? [xOf(lastIdx), yOf(values[lastIdx] as number)] : null;

  const hoverValue =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < values.length
      ? values[hoverIndex]
      : null;
  const hoverX = hoverIndex != null ? xOf(hoverIndex) : null;
  const hoverY = hoverValue != null ? yOf(hoverValue) : null;

  const midY = pad + (height - pad * 2) / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={midY}
        y2={midY}
        stroke="var(--border-subtle)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {lastPoint && hoverIndex == null && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" fill={color} />
      )}

      {hoverX != null && (
        <line
          x1={hoverX}
          x2={hoverX}
          y1={0}
          y2={height}
          stroke="var(--border-hover)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {hoverX != null && hoverY != null && (
        <>
          <circle cx={hoverX} cy={hoverY} r="4.5" fill={color} fillOpacity={0.18} />
          <circle cx={hoverX} cy={hoverY} r="2.5" fill={color} />
        </>
      )}

      <text
        x={width - pad - 4}
        y={pad + 4}
        textAnchor="end"
        fontSize={10}
        fill="var(--fg-subtle)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {max.toFixed(1)}
      </text>
      <text
        x={width - pad - 4}
        y={height - pad - 2}
        textAnchor="end"
        fontSize={10}
        fill="var(--fg-subtle)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {min.toFixed(1)}
      </text>
    </svg>
  );
}

function XAxis({
  labels,
  hoverIndex,
  timestamps,
}: {
  labels: Array<{ pct: number; label: string }>;
  hoverIndex: number | null;
  timestamps: string[];
}) {
  const hoverPct =
    hoverIndex != null && timestamps.length > 1
      ? hoverIndex / (timestamps.length - 1)
      : null;
  const hoverLabel =
    hoverIndex != null && timestamps[hoverIndex]
      ? formatHoverLabel(timestamps[hoverIndex])
      : null;

  return (
    <div
      className="grid gap-3 pt-2"
      style={{ gridTemplateColumns: '120px 1fr 80px' }}
    >
      <span />
      <div className="relative h-4">
        {labels.map(({ pct, label }, idx) => (
          <span
            key={idx}
            className={[
              'absolute font-mono text-[10px] text-fg-subtle tabular-nums transition-opacity duration-150',
              hoverPct != null ? 'opacity-30' : 'opacity-100',
            ].join(' ')}
            style={{
              left: `${pct * 100}%`,
              transform:
                idx === 0
                  ? 'translateX(0)'
                  : idx === labels.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            {label}
          </span>
        ))}
        {hoverPct != null && hoverLabel && (
          <span
            className="absolute font-mono text-[10px] tabular-nums text-fg whitespace-nowrap px-1.5 py-0.5 rounded-sm bg-bg border border-border-subtle"
            style={{
              left: `${hoverPct * 100}%`,
              transform:
                hoverPct < 0.05
                  ? 'translateX(0)'
                  : hoverPct > 0.95
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
              top: -4,
            }}
          >
            {hoverLabel}
          </span>
        )}
      </div>
      <span />
    </div>
  );
}

function lastNumber(values: Array<number | null>): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return v;
  }
  return null;
}

function buildXLabels(timestamps: string[], count: number): Array<{ pct: number; label: string }> {
  if (timestamps.length === 0) return [];
  const step = (timestamps.length - 1) / Math.max(1, count - 1);
  const out: Array<{ pct: number; label: string }> = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step);
    const safeIdx = Math.min(idx, timestamps.length - 1);
    out.push({
      pct: timestamps.length === 1 ? 0 : safeIdx / (timestamps.length - 1),
      label: formatTimeLabel(timestamps[safeIdx]),
    });
  }
  return out;
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '';
  const sameDay = Date.now() - d.valueOf() < 24 * 60 * 60 * 1000;
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatHoverLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '';
  const dayOfYear = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dayOfYear} · ${time}`;
}
