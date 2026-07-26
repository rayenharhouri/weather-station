'use client';

import * as React from 'react';
import { Send, Save, MoreHorizontal, X, ChevronRight } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';

export type PlaygroundMetric =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'rainfall'
  | 'light'
  | 'aqi';

export type PlaygroundInterval = 'raw' | '5m' | '15m' | '1h' | '1d';

export interface PlaygroundQuery {
  stations: string[];
  metric: PlaygroundMetric;
  since: string;
  until: string;
  interval: PlaygroundInterval;
  limit: number;
}

const METRIC_OPTIONS: Array<{ value: PlaygroundMetric; label: string; color: string }> = [
  { value: 'temperature', label: 'Temperature', color: 'var(--m-temp)' },
  { value: 'humidity', label: 'Humidity', color: 'var(--m-humidity)' },
  { value: 'pressure', label: 'Pressure', color: 'var(--m-pressure)' },
  { value: 'rainfall', label: 'Rainfall', color: 'var(--m-rainfall)' },
  { value: 'light', label: 'Light', color: 'var(--m-light)' },
  { value: 'aqi', label: 'AQI', color: 'var(--m-aqi)' },
];

const INTERVAL_OPTIONS: PlaygroundInterval[] = ['raw', '5m', '15m', '1h', '1d'];

interface ParamsFormProps {
  query: PlaygroundQuery;
  onChange: (next: PlaygroundQuery) => void;
  onSend: () => void;
  onReset?: () => void;
  pending?: boolean;
  modifiedFields: number;
}

export function ParamsForm({
  query,
  onChange,
  onSend,
  onReset,
  pending,
  modifiedFields,
}: ParamsFormProps) {
  const update = <K extends keyof PlaygroundQuery>(key: K, value: PlaygroundQuery[K]) =>
    onChange({ ...query, [key]: value });

  return (
    <HairlineCard className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted font-medium">Parameters</span>
        <span className="font-mono text-[11px] text-fg-subtle ml-1.5">
          · 7 fields · {modifiedFields} modified
        </span>
        <Button variant="ghost" size="xs" className="ml-auto" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-1 flex flex-col gap-3.5 no-scroll">
        <FieldLabel label="station" type="string · array" hint="home tenant by default">
          <div className="flex items-center gap-1.5 flex-wrap min-h-[34px] px-2 rounded-lg bg-surface-2 border border-border-hover">
            {query.stations.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-sm bg-bg border border-border-hover"
              >
                <span
                  aria-hidden
                  className="w-1 h-1 rounded-full"
                  style={{ background: 'var(--sev-success)' }}
                />
                <span className="font-mono text-xs text-fg">{s}</span>
                <button
                  type="button"
                  aria-label={`Remove ${s}`}
                  onClick={() =>
                    update(
                      'stations',
                      query.stations.filter((x) => x !== s),
                    )
                  }
                  className="text-fg-subtle hover:text-fg flex transition-colors"
                >
                  <X size={10} strokeWidth={1.5} />
                </button>
              </span>
            ))}
            <span className="text-xs text-fg-subtle py-1">+ add station…</span>
          </div>
        </FieldLabel>

        <FieldLabel label="metric" type="enum">
          <ChipPicker
            options={METRIC_OPTIONS}
            active={query.metric}
            onChange={(v) => update('metric', v as PlaygroundMetric)}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-2.5">
          <FieldLabel label="since" type="ISO 8601">
            <TextInput
              mono
              value={query.since}
              onChange={(v) => update('since', v)}
            />
          </FieldLabel>
          <FieldLabel label="until" type="ISO 8601">
            <TextInput
              mono
              value={query.until}
              suffix={isNowish(query.until) ? 'now' : undefined}
              onChange={(v) => update('until', v)}
            />
          </FieldLabel>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] uppercase tracking-[0.05em] text-fg-subtle">
            Quick ranges
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => applyQuickRange(range, onChange, query)}
                className="h-[22px] px-2 rounded-md border border-border-subtle text-fg-muted text-[11px] hover:bg-surface-2 hover:text-fg hover:border-border-hover transition-colors"
              >
                last {range}
              </button>
            ))}
          </div>
        </div>

        <FieldLabel label="interval" type="enum">
          <Segmented
            options={INTERVAL_OPTIONS}
            active={query.interval}
            onChange={(v) => update('interval', v as PlaygroundInterval)}
          />
        </FieldLabel>

        <FieldLabel
          label="limit"
          type="integer · max 1000"
          hint={`${query.limit} configured`}
        >
          <TextInput
            mono
            value={String(query.limit)}
            onChange={(v) => {
              const n = parseInt(v, 10);
              if (!Number.isNaN(n)) update('limit', Math.max(1, Math.min(1000, n)));
            }}
          />
        </FieldLabel>

        <button
          type="button"
          className="flex items-center gap-1.5 py-2.5 border-t border-border-subtle cursor-pointer text-fg-muted hover:text-fg transition-colors"
        >
          <ChevronRight size={11} strokeWidth={1.5} />
          <span className="text-xs font-medium">Headers</span>
          <span className="font-mono text-[10px] text-fg-subtle">· 2</span>
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-border-subtle">
        <Button
          className="flex-1 justify-center"
          size="default"
          onClick={onSend}
          disabled={pending}
        >
          <Send size={13} strokeWidth={1.5} />
          <span>{pending ? 'Sending…' : 'Send request'}</span>
          <span
            className="font-mono text-[10px] px-1.5 py-px ml-1.5 rounded-sm border opacity-85"
            style={{ borderColor: 'color-mix(in srgb, white 25%, transparent)' }}
          >
            ⌘ ↵
          </span>
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Save query">
          <Save size={13} strokeWidth={1.5} />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="More actions">
          <MoreHorizontal size={13} strokeWidth={1.5} />
        </Button>
      </div>
    </HairlineCard>
  );
}

function FieldLabel({
  label,
  type,
  required,
  hint,
  children,
}: {
  label: string;
  type: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="font-mono text-xs text-fg font-medium">{label}</label>
        <span className="font-mono text-[10px] text-fg-subtle">{type}</span>
        {required && (
          <span className="text-[10px] text-sev-critical font-medium">required</span>
        )}
        {hint && (
          <span className="text-[10px] text-fg-subtle ml-auto">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  placeholder,
  prefix,
  suffix,
  mono,
  onChange,
}: {
  value: string;
  placeholder?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mono?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 h-[34px] rounded-lg bg-surface-2 border border-border-subtle focus-within:border-border-hover transition-colors">
      {prefix && <span className="text-fg-subtle flex">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={[
          'flex-1 bg-transparent border-0 outline-none text-fg placeholder:text-fg-subtle',
          mono ? 'font-mono text-[12.5px] tabular-nums' : 'text-[13px]',
        ].join(' ')}
      />
      {suffix && <span className="text-fg-subtle text-[11px]">{suffix}</span>}
    </div>
  );
}

function ChipPicker<T extends string>({
  options,
  active,
  onChange,
}: {
  options: Array<{ value: T; label: string; color?: string }>;
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => {
        const isActive = o.value === active;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={isActive}
            className={[
              'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11.5px] transition-colors duration-150',
              'border',
              isActive
                ? 'bg-surface-2 text-fg border-border-hover'
                : 'text-fg-muted border-border-subtle hover:bg-surface-2 hover:text-fg',
            ].join(' ')}
          >
            {o.color && (
              <span
                aria-hidden
                className="w-[7px] h-[7px] rounded-[2px]"
                style={{ background: o.color }}
              />
            )}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  active,
  onChange,
}: {
  options: T[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex border border-border-subtle rounded-lg overflow-hidden h-7">
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={o === active}
          className={[
            'flex-1 font-mono text-xs px-2.5 transition-colors duration-150',
            o === active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:text-fg hover:bg-surface-2',
            i < options.length - 1 ? 'border-r border-border-subtle' : '',
          ].join(' ')}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function isNowish(iso: string): boolean {
  const d = new Date(iso).valueOf();
  if (Number.isNaN(d)) return false;
  return Math.abs(Date.now() - d) < 5 * 60 * 1000;
}

function applyQuickRange(
  range: '1h' | '6h' | '24h' | '7d' | '30d',
  onChange: (q: PlaygroundQuery) => void,
  current: PlaygroundQuery,
) {
  const ms: Record<typeof range, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const now = new Date();
  const since = new Date(now.valueOf() - ms[range]);
  onChange({
    ...current,
    since: since.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    until: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });
}
