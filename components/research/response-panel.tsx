'use client';

import { useState } from 'react';
import { Download, Database, ArrowRight } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';

export interface PlaygroundResponsePoint {
  id: string;
  recordedAt: string;
  value: number;
  unit: string;
  merkleAnchor: string | null;
}

export interface PlaygroundResponse {
  status: string;
  contentType: string;
  durationMs: number;
  sizeBytes: number;
  records: number;
  data: PlaygroundResponsePoint[];
  cursor: string | null;
  metricLabel: string;
  color: string;
}

interface ResponsePanelProps {
  response: PlaygroundResponse | null;
  pending?: boolean;
}

type ResponseTab = 'chart' | 'table' | 'json' | 'headers';

const TABS: Array<{ key: ResponseTab; label: string }> = [
  { key: 'chart', label: 'Chart' },
  { key: 'table', label: 'Table' },
  { key: 'json', label: 'JSON' },
  { key: 'headers', label: 'Headers' },
];

export function ResponsePanel({ response, pending }: ResponsePanelProps) {
  const [tab, setTab] = useState<ResponseTab>('chart');

  const downloadCsv = () => {
    if (!response) return;
    const csv = buildCsv(response);
    const filename = buildCsvFilename(response);
    triggerDownload(csv, filename);
  };

  return (
    <HairlineCard className="flex flex-col h-full overflow-hidden">
      <ResponseTabs active={tab} onChange={setTab} onExportCsv={downloadCsv} canExport={!!response} />
      <StatsRow response={response} />

      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden px-4 py-3.5">
        {response == null ? (
          <EmptyState pending={pending} />
        ) : tab === 'chart' ? (
          <>
            <ResponseChart response={response} />
            <MiniTablePreview response={response} />
          </>
        ) : tab === 'table' ? (
          <FullTable response={response} />
        ) : tab === 'json' ? (
          <JsonView response={response} />
        ) : (
          <HeadersView response={response} />
        )}
      </div>
    </HairlineCard>
  );
}

function ResponseTabs({
  active,
  onChange,
  onExportCsv,
  canExport,
}: {
  active: ResponseTab;
  onChange: (next: ResponseTab) => void;
  onExportCsv: () => void;
  canExport: boolean;
}) {
  return (
    <div className="flex items-center px-3 pt-2 border-b border-border-subtle">
      {TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={isActive}
            className={[
              'relative px-3 pb-2.5 pt-2 text-[12.5px] transition-colors',
              isActive ? 'text-fg font-semibold' : 'text-fg-muted font-medium hover:text-fg',
            ].join(' ')}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-3 right-3 -bottom-px h-0.5"
                style={{ background: 'var(--accent-brand)' }}
              />
            )}
          </button>
        );
      })}
      <span className="ml-auto flex items-center gap-1 pb-1.5">
        <Button variant="ghost" size="xs" onClick={onExportCsv} disabled={!canExport}>
          <Download size={11} strokeWidth={1.5} /> CSV
        </Button>
        <Button variant="ghost" size="xs" disabled>
          <Database size={11} strokeWidth={1.5} /> Save to dataset
        </Button>
      </span>
    </div>
  );
}

function StatsRow({ response }: { response: PlaygroundResponse | null }) {
  if (!response) {
    return (
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border-subtle text-[11px] text-fg-subtle">
        <span>Configure parameters and hit Send to run a query.</span>
      </div>
    );
  }

  const values = response.data.map((d) => d.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border-subtle flex-wrap">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm"
          style={{
            color: 'var(--sev-success)',
            border: '1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)',
          }}
        >
          {response.status}
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">{response.contentType}</span>
      </span>
      <Kpi label="Records" value={String(response.records)} />
      <Kpi label="Size" value={formatBytes(response.sizeBytes)} />
      <Kpi label="Time" value={`${response.durationMs} ms`} />
      <Kpi label="Mean" value={`${mean.toFixed(2)} ${unitForLabel(response.metricLabel)}`} color={response.color} />
      <Kpi
        label="Range"
        value={`${min.toFixed(1)} → ${max.toFixed(1)}`}
        color={response.color}
      />
      <span className="ml-auto flex items-center gap-2">
        <span className="text-[11px] text-fg-subtle">Cursor</span>
        <span className="font-mono text-[11px] text-fg-muted truncate max-w-[10rem]">
          {response.cursor ?? '—'}
        </span>
        <Button variant="outline" size="xs" disabled={!response.cursor}>
          <ArrowRight size={11} strokeWidth={1.5} /> Next page
        </Button>
      </span>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0">
      <span className="text-[9px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <span className="font-mono text-[13px] tabular-nums" style={{ color: color ?? 'var(--fg)' }}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ pending }: { pending?: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
      {pending ? 'Running query…' : 'No response yet — hit Send to query.'}
    </div>
  );
}

function ResponseChart({ response }: { response: PlaygroundResponse }) {
  const data = response.data;
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-fg-subtle py-12">
        Not enough samples to chart.
      </div>
    );
  }

  const W = 760;
  const H = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const vals = data.map((p) => p.value);
  const yMin = Math.floor(Math.min(...vals) - 0.5);
  const yMax = Math.ceil(Math.max(...vals) + 0.5);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const minIdx = vals.indexOf(minVal);
  const maxIdx = vals.indexOf(maxVal);

  const xToPx = (i: number) => pad.left + (i / (data.length - 1)) * innerW;
  const yToPx = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const linePath = data
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${xToPx(i).toFixed(1)} ${yToPx(p.value).toFixed(1)}`,
    )
    .join(' ');
  const areaPath =
    linePath +
    ` L${xToPx(data.length - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)}` +
    ` L${pad.left.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) yTicks.push(yMin + ((yMax - yMin) * i) / 4);

  const xTickCount = Math.min(7, data.length);
  const xTicks: number[] = [];
  for (let i = 0; i < xTickCount; i++) {
    xTicks.push(Math.round((i / (xTickCount - 1)) * (data.length - 1)));
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      className="block"
      style={{ height: H }}
      aria-hidden="true"
    >
      {yTicks.map((t, i) => {
        const y = yToPx(t);
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              shapeRendering="crispEdges"
            />
            <text
              x={pad.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-subtle)"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}

      <line
        x1={pad.left}
        x2={pad.left + innerW}
        y1={yToPx(mean)}
        y2={yToPx(mean)}
        stroke="var(--fg-muted)"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <text
        x={pad.left + innerW - 4}
        y={yToPx(mean) - 4}
        textAnchor="end"
        fontSize={10}
        fill="var(--fg-muted)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        mean {mean.toFixed(1)}
      </text>

      <path d={areaPath} fill={response.color} fillOpacity="0.10" />
      <path
        d={linePath}
        stroke={response.color}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle
        cx={xToPx(minIdx)}
        cy={yToPx(minVal)}
        r="3"
        fill="var(--bg)"
        stroke={response.color}
        strokeWidth="1.4"
      />
      <text
        x={xToPx(minIdx)}
        y={yToPx(minVal) + 16}
        textAnchor="middle"
        fontSize={10}
        fill="var(--fg-subtle)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        min {minVal.toFixed(1)}
      </text>
      <circle
        cx={xToPx(maxIdx)}
        cy={yToPx(maxVal)}
        r="3"
        fill="var(--bg)"
        stroke={response.color}
        strokeWidth="1.4"
      />
      <text
        x={xToPx(maxIdx)}
        y={yToPx(maxVal) - 7}
        textAnchor="middle"
        fontSize={10}
        fill="var(--fg-subtle)"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        max {maxVal.toFixed(1)}
      </text>

      {xTicks.map((idx) => (
        <text
          key={idx}
          x={xToPx(idx)}
          y={pad.top + innerH + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--fg-subtle)"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatXLabel(data[idx]?.recordedAt)}
        </text>
      ))}
      <line
        x1={pad.left}
        x2={pad.left + innerW}
        y1={pad.top + innerH}
        y2={pad.top + innerH}
        stroke="var(--border-subtle)"
        strokeWidth="1"
        shapeRendering="crispEdges"
      />
    </svg>
  );
}

function MiniTablePreview({ response }: { response: PlaygroundResponse }) {
  const rows = response.data.slice(-4).reverse();
  const remaining = Math.max(0, response.records - rows.length);
  return (
    <HairlineCard className="bg-surface-2 flex-1 min-h-0 overflow-hidden flex flex-col">
      <TableHead unit={unitForLabel(response.metricLabel)} />
      {rows.map((row, i) => (
        <TableRow
          key={row.id}
          row={row}
          unit={unitForLabel(response.metricLabel)}
          last={i === rows.length - 1}
        />
      ))}
      {remaining > 0 && (
        <div className="px-3.5 py-1.5 text-[11px] text-fg-subtle text-center">
          … {remaining.toLocaleString()} more rows
        </div>
      )}
    </HairlineCard>
  );
}

function FullTable({ response }: { response: PlaygroundResponse }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto no-scroll border border-border-subtle rounded-md">
      <TableHead unit={unitForLabel(response.metricLabel)} />
      {response.data.map((row, i) => (
        <TableRow
          key={row.id}
          row={row}
          unit={unitForLabel(response.metricLabel)}
          last={i === response.data.length - 1}
        />
      ))}
    </div>
  );
}

function TableHead({ unit }: { unit: string }) {
  return (
    <div
      className="grid gap-3 px-3.5 py-2 border-b border-border-subtle text-[10px] uppercase tracking-[0.05em] text-fg-subtle"
      style={{ gridTemplateColumns: '180px 1fr 80px 80px 130px' }}
    >
      <span>recorded_at</span>
      <span>id</span>
      <span className="text-right">value</span>
      <span>unit · {unit}</span>
      <span>merkle_anchor</span>
    </div>
  );
}

function TableRow({
  row,
  unit,
  last,
}: {
  row: PlaygroundResponsePoint;
  unit: string;
  last: boolean;
}) {
  return (
    <div
      className={[
        'grid gap-3 px-3.5 py-1.5 font-mono text-xs tabular-nums',
        last ? '' : 'border-b border-border-subtle',
      ].join(' ')}
      style={{ gridTemplateColumns: '180px 1fr 80px 80px 130px' }}
    >
      <span className="text-fg-muted">{row.recordedAt}</span>
      <span className="text-fg truncate">{row.id}</span>
      <span className="text-fg text-right">{row.value.toFixed(2)}</span>
      <span className="text-fg-subtle">{unit}</span>
      <span className={row.merkleAnchor ? 'text-fg-muted' : 'text-fg-subtle'}>
        {row.merkleAnchor ?? '— pending'}
      </span>
    </div>
  );
}

function JsonView({ response }: { response: PlaygroundResponse }) {
  const sample = {
    data: response.data.slice(0, 3),
    next_cursor: response.cursor,
  };
  return (
    <pre className="flex-1 min-h-0 overflow-auto no-scroll px-4 py-3 font-mono text-[12px] leading-[1.55] text-fg bg-surface-2 border border-border-subtle rounded-md whitespace-pre">
      {JSON.stringify(sample, null, 2)}
    </pre>
  );
}

function HeadersView({ response }: { response: PlaygroundResponse }) {
  const headers: Array<[string, string]> = [
    ['Status', response.status],
    ['Content-Type', response.contentType],
    ['Content-Length', String(response.sizeBytes)],
    ['X-RateLimit-Limit', '60/min'],
    ['X-RateLimit-Remaining', '57/min'],
    ['X-Request-Id', 'req_29f3a8c4'],
    ['Server-Timing', `db;dur=${(response.durationMs * 0.6).toFixed(0)}, total;dur=${response.durationMs}`],
  ];
  return (
    <div className="flex-1 min-h-0 overflow-auto no-scroll px-4 py-3 font-mono text-[12px]">
      {headers.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[200px_1fr] gap-3 py-1 border-b border-border-subtle last:border-b-0">
          <span className="text-fg-muted">{k}</span>
          <span className="text-fg">{v}</span>
        </div>
      ))}
    </div>
  );
}

function formatXLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function unitForLabel(label: string): string {
  if (/temperature/i.test(label)) return '°C';
  if (/humidity/i.test(label)) return '%';
  if (/pressure/i.test(label)) return 'hPa';
  if (/rainfall/i.test(label)) return 'mm';
  if (/light/i.test(label)) return 'lx';
  if (/aqi/i.test(label)) return 'AQI';
  return '';
}

function buildCsv(response: PlaygroundResponse): string {
  const headers = ['recorded_at', 'id', 'metric', 'value', 'unit', 'merkle_anchor'];
  const metricSlug = response.metricLabel.toLowerCase().replace(/\s+/g, '_');
  const lines = [headers.map(csvField).join(',')];
  for (const row of response.data) {
    lines.push(
      [
        csvField(row.recordedAt),
        csvField(row.id),
        csvField(metricSlug),
        csvField(row.value),
        csvField(row.unit),
        csvField(row.merkleAnchor ?? ''),
      ].join(','),
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvFilename(response: PlaygroundResponse): string {
  const metricSlug = response.metricLabel
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const first = response.data[0]?.recordedAt;
  const last = response.data[response.data.length - 1]?.recordedAt;
  const since = first ? toFileStamp(first) : 'start';
  const until = last ? toFileStamp(last) : 'end';
  return `weatherhub-${metricSlug}-${since}_to_${until}.csv`;
}

function toFileStamp(iso: string): string {
  return iso.replace(/[:.]/g, '-').slice(0, 19);
}

function triggerDownload(csv: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
