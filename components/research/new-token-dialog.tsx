'use client';

import { useState } from 'react';
import { Copy, Check, AlertTriangle, Key } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ApiToken, TokenScope } from '@/components/research/token-row';

type Expiry = '30d' | '90d' | '365d' | 'never';
type ScopePreset = 'home-tenant' | 'specific-station' | 'cross-tenant';

interface NewTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the user closes the reveal phase. Pass the freshly-minted token back. */
  onCreated?: (token: ApiToken, plaintext: string) => void;
}

interface RevealedToken {
  token: ApiToken;
  plaintext: string;
}

const EXPIRY_OPTIONS: Array<{ value: Expiry; label: string; hint: string }> = [
  { value: '30d', label: '30 days', hint: 'short-lived' },
  { value: '90d', label: '90 days', hint: 'default' },
  { value: '365d', label: '1 year', hint: 'long-running scripts' },
  { value: 'never', label: 'No expiry', hint: 'discouraged' },
];

const SCOPE_OPTIONS: Array<{ value: ScopePreset; label: string; hint: string }> = [
  { value: 'home-tenant', label: 'Home tenant · all stations', hint: 'default · read-only' },
  { value: 'specific-station', label: 'Specific station', hint: 'narrower scope' },
  { value: 'cross-tenant', label: 'Cross-tenant', hint: 'requires active grant' },
];

export function NewTokenDialog({ open, onOpenChange, onCreated }: NewTokenDialogProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ScopePreset>('home-tenant');
  const [expiry, setExpiry] = useState<Expiry>('90d');
  const [revealed, setRevealed] = useState<RevealedToken | null>(null);

  const reset = () => {
    setName('');
    setScope('home-tenant');
    setExpiry('90d');
    setRevealed(null);
  };

  const submit = () => {
    if (!name.trim()) return;
    const plaintext = generateToken();
    const token: ApiToken = {
      id: `t_${Math.random().toString(36).slice(2, 10)}`,
      name: name.trim(),
      suffix: plaintext.slice(-4),
      status: 'active',
      scope: scopeFromPreset(scope),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: expiryToIso(expiry),
      requestsToday: 0,
      requestsTotal: 0,
    };
    setRevealed({ token, plaintext });
  };

  const finish = () => {
    if (revealed) {
      onCreated?.(revealed.token, revealed.plaintext);
    }
    onOpenChange(false);
    // Reset after the close animation so the form doesn't flash empty mid-close.
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {revealed ? (
          <RevealPhase revealed={revealed} onDone={finish} />
        ) : (
          <CreatePhase
            name={name}
            setName={setName}
            scope={scope}
            setScope={setScope}
            expiry={expiry}
            setExpiry={setExpiry}
            onSubmit={submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreatePhase({
  name,
  setName,
  scope,
  setScope,
  expiry,
  setExpiry,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  scope: ScopePreset;
  setScope: (v: ScopePreset) => void;
  expiry: Expiry;
  setExpiry: (v: Expiry) => void;
  onSubmit: () => void;
}) {
  const canSubmit = name.trim().length >= 3;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Key size={16} strokeWidth={1.5} />
          New API token
        </DialogTitle>
        <DialogDescription className="text-xs text-fg-muted">
          Personal access tokens authenticate API + SSE requests. Give every script its own
          token — rotation is per-token.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 pt-2">
        <Field
          label="Token name"
          type="string · required"
          hint="A short label, e.g. papers-2026"
        >
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="papers-2026"
            className="h-9 px-2.5 rounded-md bg-surface-2 border border-border-subtle focus:border-border-hover outline-none text-sm text-fg placeholder:text-fg-subtle"
          />
        </Field>

        <Field label="Scope" type="enum" hint="picks which stations the token can read">
          <div className="flex flex-col gap-1.5">
            {SCOPE_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.value}
                value={opt.value}
                active={scope === opt.value}
                onSelect={setScope}
                label={opt.label}
                hint={opt.hint}
              />
            ))}
          </div>
        </Field>

        <Field label="Expiration" type="enum">
          <div className="grid grid-cols-2 gap-1.5">
            {EXPIRY_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.value}
                value={opt.value}
                active={expiry === opt.value}
                onSelect={setExpiry}
                label={opt.label}
                hint={opt.hint}
                warn={opt.value === 'never'}
              />
            ))}
          </div>
        </Field>
      </div>

      <DialogFooter className="pt-2">
        <DialogClose render={<Button variant="ghost" size="sm" />}>Cancel</DialogClose>
        <Button size="sm" disabled={!canSubmit} onClick={onSubmit}>
          Generate token
        </Button>
      </DialogFooter>
    </>
  );
}

function RevealPhase({
  revealed,
  onDone,
}: {
  revealed: RevealedToken;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(revealed.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Check size={16} strokeWidth={1.75} className="text-sev-success" />
          Token created
        </DialogTitle>
        <DialogDescription className="text-xs text-fg-muted">
          Copy <span className="font-mono text-fg">{revealed.token.name}</span> below.
          This is the only time the full token is shown.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-2 border border-border-subtle">
          <Key size={13} strokeWidth={1.5} className="text-fg-subtle shrink-0" />
          <span className="font-mono text-[12.5px] text-fg select-all break-all flex-1 min-w-0">
            {revealed.plaintext}
          </span>
          <Button
            size="xs"
            variant={copied ? 'ghost' : 'outline'}
            onClick={copy}
            aria-label="Copy token"
            className={copied ? 'text-sev-success' : ''}
          >
            {copied ? (
              <>
                <Check size={11} strokeWidth={1.75} /> Copied
              </>
            ) : (
              <>
                <Copy size={11} strokeWidth={1.5} /> Copy
              </>
            )}
          </Button>
        </div>

        <div
          className="flex items-start gap-2 px-3 py-2 rounded-md"
          style={{
            border: '1px solid color-mix(in oklch, var(--sev-warn) 45%, transparent)',
            background: 'color-mix(in oklch, var(--sev-warn) 8%, transparent)',
          }}
          role="alert"
        >
          <AlertTriangle
            size={13}
            strokeWidth={1.5}
            className="text-sev-warn shrink-0 mt-0.5"
          />
          <span className="text-xs text-fg-muted leading-[1.5]">
            Store it somewhere safe — a password manager or a secret store. We don't keep a
            recoverable copy. If you lose this token, generate a new one and revoke the old.
          </span>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Small form primitives — colocated since they're only used in this dialog.
// ─────────────────────────────────────────────────────────────
function Field({
  label,
  type,
  hint,
  children,
}: {
  label: string;
  type: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="font-mono text-xs text-fg font-medium">{label}</label>
        <span className="font-mono text-[10px] text-fg-subtle">{type}</span>
        {hint && <span className="text-[10px] text-fg-subtle ml-auto">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function RadioOption<T extends string>({
  value,
  active,
  onSelect,
  label,
  hint,
  warn,
}: {
  value: T;
  active: boolean;
  onSelect: (v: T) => void;
  label: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={[
        'group/option relative flex items-center justify-between gap-2 h-9 px-2.5 rounded-md border text-left transition-colors duration-150',
        active
          ? 'bg-surface-2 text-fg border-border-hover'
          : 'text-fg-muted border-border-subtle hover:bg-surface-2 hover:text-fg',
      ].join(' ')}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className={[
            'w-3 h-3 rounded-full shrink-0 transition-colors duration-150',
            active ? 'border-2 border-accent-brand bg-bg' : 'border border-border-hover bg-surface-2',
          ].join(' ')}
          style={
            active
              ? { boxShadow: 'inset 0 0 0 2px var(--bg), inset 0 0 0 4px var(--accent-brand)' }
              : undefined
          }
        />
        <span className="text-xs truncate">{label}</span>
      </span>
      {hint && (
        <span
          className={[
            'text-[10px] truncate',
            warn ? 'text-sev-warn' : 'text-fg-subtle',
          ].join(' ')}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function generateToken(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 32; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `wh_rsa_${body}`;
}

function expiryToIso(expiry: Expiry): string | null {
  if (expiry === 'never') return null;
  const days = expiry === '30d' ? 30 : expiry === '90d' ? 90 : 365;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function scopeFromPreset(preset: ScopePreset): TokenScope {
  if (preset === 'cross-tenant') {
    return { stations: ['*'], metrics: [], readOnly: true, crossTenant: true };
  }
  if (preset === 'specific-station') {
    return { stations: ['tunis-campus'], metrics: [], readOnly: true };
  }
  return { stations: [], metrics: [], readOnly: true };
}
