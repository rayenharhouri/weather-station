'use client';

import { useMemo } from 'react';

export interface ForecastPoint {
  timestamp: string;
  value: number;
  confidence: number;
}

interface ForecastTrajectoryChartProps {
  points: ForecastPoint[];
  color: string;
  unit: string;
  decimals?: number;
  horizons?: number[];
  height?: number;
}

export function ForecastTrajectoryChart({
  points,
  color,
  unit,
  decimals = 1,
  horizons = [1, 3, 6, 24],
  height = 220,
}: ForecastTrajectoryChartProps) {
  const { line, upper, lower, markers, max, min } = useMemo(
    () => buildPaths(points, height),
    [points, height],
  );

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-fg-muted" style={{ height }}>
        No forecast data — model has nothing to project from.
      </div>
    );
  }

  const width = 1000;

  const now = Date.now();
  const horizonMarkers = horizons
    .map((h) => {
      const target = now + h * 60 * 60 * 1000;
      let bestIdx = -1;
      let bestDiff = Infinity;
      points.forEach((p, i) => {
        const diff = Math.abs(new Date(p.timestamp).valueOf() - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      });
      if (bestIdx < 0) return null;
      const m = markers[bestIdx];
      return {
        x: m.x,
        y: m.y,
        value: points[bestIdx].value,
        label: `+${h}h`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    >
      {/* Confidence band */}
      <path d={`${upper} L${lower}`} fill={color} fillOpacity={0.08} />

      {/* Midline (50% of Y range) */}
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="var(--border-subtle)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Forecast line */}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Y axis tick labels */}
      <text x={width - 8} y={14} textAnchor="end" fontSize={11} fill="var(--fg-subtle)" style={{ fontFamily: 'var(--font-mono)' }}>
        {max.toFixed(decimals)}
      </text>
      <text x={width - 8} y={height - 6} textAnchor="end" fontSize={11} fill="var(--fg-subtle)" style={{ fontFamily: 'var(--font-mono)' }}>
        {min.toFixed(decimals)}
      </text>

      {/* Horizon markers */}
      {horizonMarkers.map((m, i) => (
        <g key={i}>
          <line
            x1={m.x}
            x2={m.x}
            y1={0}
            y2={height}
            stroke="var(--border-subtle)"
            strokeWidth={1}
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={m.x} cy={m.y} r="3" fill={color} />
          <g transform={`translate(${m.x} ${m.y - 12})`}>
            <rect
              x={-26}
              y={-14}
              width={52}
              height={14}
              rx={3}
              fill="var(--bg)"
              stroke="var(--border-subtle)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={0}
              y={-3}
              textAnchor="middle"
              fontSize={10}
              fill="var(--fg)"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {`${m.label} · ${m.value.toFixed(decimals)}${unit}`}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

function buildPaths(
  points: ForecastPoint[],
  height: number,
): {
  line: string;
  upper: string;
  lower: string;
  markers: Array<{ x: number; y: number }>;
  max: number;
  min: number;
} {
  if (points.length === 0) {
    return { line: '', upper: '', lower: '', markers: [], max: 0, min: 0 };
  }

  const width = 1000;
  const pad = 8;
  const padTop = 20;
  const padBottom = 12;
  const drawableH = height - padTop - padBottom;

  const withBands = points.map((p) => {
    const bandHalf = Math.abs(p.value) * (1 - p.confidence / 100) * 0.1;
    return { value: p.value, upper: p.value + bandHalf, lower: p.value - bandHalf };
  });

  const allValues = withBands.flatMap((p) => [p.upper, p.lower, p.value]);
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = max - min || 1;

  const step = (width - pad * 2) / Math.max(1, points.length - 1);
  const xOf = (i: number) => pad + i * step;
  const yOf = (v: number) => padTop + (1 - (v - min) / range) * drawableH;

  const linePts = withBands.map((p, i) => [xOf(i), yOf(p.value)] as const);
  const upperPts = withBands.map((p, i) => [xOf(i), yOf(p.upper)] as const);
  const lowerPts = [...withBands].reverse().map((p, i) => {
    const origIdx = withBands.length - 1 - i;
    return [xOf(origIdx), yOf(p.lower)] as const;
  });

  return {
    line: linePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    upper: upperPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    lower: lowerPts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    markers: linePts.map(([x, y]) => ({ x, y })),
    max,
    min,
  };
}
