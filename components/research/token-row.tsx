'use client';

import { useState } from 'react';
import { MoreHorizontal, Copy, RotateCw, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TokenStatus = 'active' | 'revoked' | 'expired';

export interface TokenScope {
  /** Empty array = home-tenant default; `['*']` = all stations. */
  stations: string[];
  /** Empty array = all metrics. */
  metrics: string[];
  readOnly: boolean;
  /** True if any cross-tenant grant is attached. */
  crossTenant?: boolean;
}

export interface ApiToken {
  id: string;
  name: string;
  /** Last 4 chars of the real token, e.g. "aB7c". */
  suffix: string;
  status: TokenStatus;
  scope: TokenScope;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  requestsToday: number;
  requestsTotal: number;
}

interface TokenRowProps {
  token: ApiToken;
  onCopySuffix?: (id: string) => void;
  onRotate?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

export function TokenRow({ token, onCopySuffix, onRotate, onRevoke }: TokenRowProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(`wh_rsa_••••${token.suffix}`);
    onCopySuffix?.(token.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const status = token.status;
  const isInactive = status !== 'active';
  const scopeSummary = describeScope(token.scope);

  return (
    <div
      className={[
        'grid items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors duration-150',
        isInactive ? 'opacity-70' : '',
      ].join(' ')}
      style={{ gridTemplateColumns: 'minmax(200px,1.4fr) 1.4fr 1fr 1fr auto' }}
    >
      {/* Name + suffix */}
      <div className="flex items-center gap-2 min-w-0">
        <Key
          size={14}
          strokeWidth={1.5}
          className="text-fg-subtle shrink-0"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm text-fg font-medium truncate">{token.name}</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-fg-subtle hover:text-fg transition-colors"
          >
            wh_rsa_••••{token.suffix}
            <span
              className={[
                'text-fg-subtle transition-opacity duration-150',
                copied ? 'opacity-100 text-sev-success' : 'opacity-60',
              ].join(' ')}
            >
              {copied ? '✓ copied' : <Copy size={10} strokeWidth={1.5} />}
            </span>
          </button>
        </div>
      </div>

      {/* Scope */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-fg truncate">{scopeSummary.stations}</span>
        <span className="font-mono text-[11px] text-fg-subtle truncate">
          {scopeSummary.metrics}
          {token.scope.readOnly && <span className="ml-1.5">· read-only</span>}
          {token.scope.crossTenant && <span className="ml-1.5 text-sev-warn">· cross-tenant</span>}
        </span>
      </div>

      {/* Last used */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs text-fg tabular-nums">
          {token.lastUsedAt ? formatRelative(token.lastUsedAt) : 'never'}
        </span>
        <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
          {token.requestsToday.toLocaleString()} / day · {token.requestsTotal.toLocaleString()} total
        </span>
      </div>

      {/* Expires */}
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs text-fg tabular-nums">
          {token.expiresAt ? formatExpiry(token.expiresAt) : 'no expiry'}
        </span>
        <StatusPill status={status} />
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${token.name}`}
            />
          }
        >
          <MoreHorizontal size={14} strokeWidth={1.5} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={copy}>
            <Copy size={13} strokeWidth={1.5} />
            <span>Copy masked id</span>
          </DropdownMenuItem>
          {status === 'active' && (
            <DropdownMenuItem onSelect={() => onRotate?.(token.id)}>
              <RotateCw size={13} strokeWidth={1.5} />
              <span>Rotate token</span>
            </DropdownMenuItem>
          )}
          {status === 'active' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onRevoke?.(token.id)}>
                <span className="text-sev-critical inline-flex items-center gap-2">
                  <Trash2 size={13} strokeWidth={1.5} />
                  Revoke
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatusPill({ status }: { status: TokenStatus }) {
  const color =
    status === 'active'
      ? 'var(--sev-success)'
      : status === 'expired'
        ? 'var(--sev-warn)'
        : 'var(--sev-critical)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em]"
      style={{ color }}
    >
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {status}
    </span>
  );
}

function describeScope(scope: TokenScope): { stations: string; metrics: string } {
  const stations =
    scope.stations.length === 0
      ? 'Home tenant · all stations'
      : scope.stations.includes('*')
        ? 'All stations (cross-tenant)'
        : scope.stations.join(', ');

  const metrics =
    scope.metrics.length === 0 ? 'all metrics' : scope.metrics.join(', ');

  return { stations, metrics };
}

function formatRelative(iso: string): string {
  const t = new Date(iso).valueOf();
  if (Number.isNaN(t)) return '—';
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatExpiry(iso: string): string {
  const t = new Date(iso).valueOf();
  if (Number.isNaN(t)) return '—';
  const days = Math.round((t - Date.now()) / 86_400_000);
  if (days < 0) return `expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'expires today';
  if (days <= 30) return `expires in ${days}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
