'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Copy,
  Globe,
  Lock,
  Users,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';

export type DatasetVisibility = 'public' | 'private' | 'shared';
export type DatasetFormat = 'csv' | 'json' | 'parquet';
export type DatasetMetric =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'light'
  | 'aqi'
  | 'multi';

export interface Dataset {
  id: string;
  title: string;
  description: string;
  visibility: DatasetVisibility;
  metric: DatasetMetric;
  stationName: string;
  windowStart: string;
  windowEnd: string;
  recordCount: number;
  sizeBytes: number;
  formats: DatasetFormat[];
  updatedAt: string;
  /** DOI / formal citation string (public datasets only). */
  citation?: string;
  /** Optional Playground URL — opens with these query params pre-filled. */
  playgroundHref?: string;
}

interface DatasetCardProps {
  dataset: Dataset;
  onDownload?: (id: string, format: DatasetFormat) => void;
}

const METRIC_COLOR: Record<DatasetMetric, string> = {
  temperature: 'var(--m-temp)',
  humidity: 'var(--m-humidity)',
  pressure: 'var(--m-pressure)',
  rainfall: 'var(--m-rainfall)',
  light: 'var(--m-light)',
  aqi: 'var(--m-aqi)',
  multi: 'var(--fg-muted)',
};

const METRIC_LABEL: Record<DatasetMetric, string> = {
  temperature: 'temperature',
  humidity: 'humidity',
  pressure: 'pressure',
  rainfall: 'rainfall',
  light: 'light',
  aqi: 'aqi',
  multi: 'multi-metric',
};

const VISIBILITY_CONFIG: Record<DatasetVisibility, { label: string; Icon: typeof Globe }> = {
  public: { label: 'Public', Icon: Globe },
  private: { label: 'Private', Icon: Lock },
  shared: { label: 'Shared', Icon: Users },
};

export function DatasetCard({ dataset, onDownload }: DatasetCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visConfig = VISIBILITY_CONFIG[dataset.visibility];
  const VisIcon = visConfig.Icon;
  const color = METRIC_COLOR[dataset.metric];

  const copyCitation = () => {
    if (!dataset.citation) return;
    void navigator.clipboard?.writeText(dataset.citation);
  };

  return (
    <HairlineCard interactive className="flex flex-col gap-3 p-4 h-full">
      {/* Top row: title + visibility */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-fg leading-snug">{dataset.title}</span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.06em]"
            style={{ color }}
          >
            {METRIC_LABEL[dataset.metric]}
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border border-border-subtle text-[10px] uppercase tracking-[0.06em] text-fg-muted"
          aria-label={`Visibility: ${visConfig.label}`}
        >
          <VisIcon size={10} strokeWidth={1.5} />
          {visConfig.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-fg-muted leading-[1.55] line-clamp-2">
        {dataset.description}
      </p>

      {/* Metadata row: station + window */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-fg-muted">
        <span className="font-mono">{dataset.stationName}</span>
        <span className="text-fg-subtle">·</span>
        <span className="font-mono tabular-nums">
          {formatDateShort(dataset.windowStart)} – {formatDateShort(dataset.windowEnd)}
        </span>
      </div>

      {/* Size / format row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <span className="font-mono text-xs tabular-nums text-fg">
          {dataset.recordCount.toLocaleString()}
        </span>
        <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">records</span>
        <span className="text-fg-subtle">·</span>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {formatBytes(dataset.sizeBytes)}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {dataset.formats.map((f) => (
            <span
              key={f}
              className="font-mono text-[10px] px-1.5 py-px rounded-sm bg-surface-2 border border-border-subtle text-fg-muted uppercase"
            >
              {f}
            </span>
          ))}
        </span>
      </div>

      {/* Citation (public only) */}
      {dataset.citation && (
        <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-md bg-surface-2 border border-border-inset">
          <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle shrink-0">
            Cite
          </span>
          <span className="font-mono text-[11px] text-fg-muted truncate flex-1">
            {dataset.citation}
          </span>
          <button
            type="button"
            onClick={copyCitation}
            aria-label="Copy citation"
            className="shrink-0 text-fg-subtle hover:text-fg transition-colors"
          >
            <Copy size={11} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Action row */}
      <div className="mt-auto pt-2 flex items-center gap-2">
        <span className="text-[11px] text-fg-subtle font-mono mr-auto">
          Updated {formatDateShort(dataset.updatedAt)}
        </span>

        {dataset.playgroundHref && (
          <Link
            href={dataset.playgroundHref}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
          >
            Open in Playground
            <ArrowRight size={11} strokeWidth={1.5} />
          </Link>
        )}

        <div className="relative">
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Download size={11} strokeWidth={1.5} />
            Download
            <ChevronDown size={11} strokeWidth={1.5} className="opacity-60" />
          </Button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-20 min-w-[110px] py-1 rounded-md border border-border-subtle bg-bg shadow-md"
                style={{ boxShadow: '0 8px 24px color-mix(in oklch, var(--fg) 18%, transparent)' }}
              >
                {dataset.formats.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDownload?.(dataset.id, f);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors flex items-center justify-between"
                  >
                    <span className="font-mono uppercase">{f}</span>
                    <span className="text-[10px] text-fg-subtle">
                      {f === 'csv' ? 'Excel-friendly' : f === 'json' ? 'API-shaped' : 'Columnar'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </HairlineCard>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
