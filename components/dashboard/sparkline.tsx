import * as React from 'react';

/**
 * Sparkline — line chart in the metric colour, with an optional 8% area
 * fill underneath. Used inside MetricTile and anywhere we need a small
 * trend indicator. Last point is highlighted with a 2px circle.
 *
 * Colour should be a CSS variable (e.g. `var(--m-temp)`), not a raw hex.
 */
export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color,
  width = 200,
  height = 36,
  fill = true,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];
  const areaPath =
    linePath +
    ` L${(width - pad).toFixed(1)} ${(height - pad).toFixed(1)}` +
    ` L${pad} ${(height - pad).toFixed(1)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {fill && <path d={areaPath} fill={color} fillOpacity={0.1} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}
