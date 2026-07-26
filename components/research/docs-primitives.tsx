'use client';

import * as React from 'react';
import { Info as InfoIcon, type LucideIcon } from 'lucide-react';

const METHOD_COLOR: Record<string, string> = {
  GET: 'var(--sev-info)',
  POST: 'var(--sev-warn)',
  PUT: 'var(--sev-warn)',
  PATCH: 'var(--sev-warn)',
  DELETE: 'var(--sev-critical)',
};

export function MethodBadge({ method }: { method: string }) {
  const c = METHOD_COLOR[method] ?? 'var(--fg-muted)';
  return (
    <span
      className="inline-flex items-center justify-center h-[22px] px-2 rounded font-mono text-[11px] font-semibold tracking-[0.04em]"
      style={{
        border: `1px solid ${c}`,
        background: `color-mix(in oklch, ${c} 14%, transparent)`,
        color: c,
      }}
    >
      {method}
    </span>
  );
}

export interface ParamRowProps {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  children?: React.ReactNode;
}

export function ParamRow({ name, type, required, defaultValue, children }: ParamRowProps) {
  return (
    <div
      className="grid gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0 items-start"
      style={{ gridTemplateColumns: '180px 1fr' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[12.5px] text-fg font-medium">{name}</span>
        <div className="flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
          <span className="font-mono">{type}</span>
          {required ? (
            <span className="text-sev-critical font-medium">required</span>
          ) : (
            <span>optional</span>
          )}
        </div>
        {defaultValue && (
          <span className="font-mono text-[10.5px] text-fg-subtle">
            default: <span className="text-fg-muted">{defaultValue}</span>
          </span>
        )}
      </div>
      <div className="text-[13px] text-fg-muted leading-[1.55]">{children}</div>
    </div>
  );
}

export interface SchemaRowProps {
  name: string;
  type: string;
  indent?: 0 | 1 | 2;
  children?: React.ReactNode;
}

export function SchemaRow({ name, type, indent = 0, children }: SchemaRowProps) {
  const nameCol = 180 - indent * 16;
  return (
    <div
      className="grid gap-4 py-2 border-b border-border-subtle last:border-b-0 items-start pr-4"
      style={{
        gridTemplateColumns: `${nameCol}px 1fr`,
        paddingLeft: 16 + indent * 16,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[12.5px] text-fg">{name}</span>
        <span className="font-mono text-[10.5px] text-fg-subtle">{type}</span>
      </div>
      <div className="text-[13px] text-fg-muted leading-[1.55] pt-0.5">{children}</div>
    </div>
  );
}

export interface ErrorRowProps {
  code: number;
  name: string;
  children?: React.ReactNode;
}

export function ErrorRow({ code, name, children }: ErrorRowProps) {
  const c =
    code >= 500 ? 'var(--sev-critical)' : code >= 400 ? 'var(--sev-warn)' : 'var(--sev-info)';
  return (
    <div
      className="grid gap-4 px-4 py-2.5 border-b border-border-subtle last:border-b-0 items-center"
      style={{ gridTemplateColumns: '56px 180px 1fr' }}
    >
      <span className="font-mono text-xs font-semibold" style={{ color: c }}>
        {code}
      </span>
      <span className="font-mono text-[12.5px] text-fg">{name}</span>
      <span className="text-[12.5px] text-fg-muted">{children}</span>
    </div>
  );
}

type CalloutKind = 'info' | 'warn' | 'critical' | 'success';

export interface CalloutProps {
  kind?: CalloutKind;
  title?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

const CALLOUT_COLOR: Record<CalloutKind, string> = {
  info: 'var(--accent-brand)',
  warn: 'var(--sev-warn)',
  critical: 'var(--sev-critical)',
  success: 'var(--sev-success)',
};

export function Callout({ kind = 'info', title, icon: Icon, children }: CalloutProps) {
  const c = CALLOUT_COLOR[kind];
  const I = Icon ?? InfoIcon;
  return (
    <div
      className="flex gap-3 px-3.5 py-3 rounded-lg"
      style={{
        border: `1px solid color-mix(in oklch, ${c} 45%, transparent)`,
        background: `color-mix(in oklch, ${c} 8%, transparent)`,
      }}
    >
      <span style={{ color: c, marginTop: 2 }} className="flex-shrink-0">
        <I size={14} strokeWidth={1.5} />
      </span>
      <div className="flex flex-col gap-1 flex-1">
        {title && <span className="text-[13px] text-fg font-semibold">{title}</span>}
        <span className="text-[12.5px] text-fg-muted leading-[1.55]">{children}</span>
      </div>
    </div>
  );
}

export function DocsCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[12.5px] text-fg px-1.5 py-px rounded-sm bg-surface-2 border border-border-inset">
      {children}
    </code>
  );
}

export function DocsH2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 mt-7 mb-3 text-lg font-semibold tracking-[-0.01em] text-fg scroll-mt-20"
    >
      <span className="font-mono text-fg-subtle opacity-60" aria-hidden>
        §
      </span>
      <span>{children}</span>
    </h2>
  );
}
