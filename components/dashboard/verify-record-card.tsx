'use client';

import { useState } from 'react';
import { Hash, Check, Minus, X, Copy, ShieldCheck } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import type { RecordVerificationResult } from '@/types';

interface VerifyRecordCardProps {
  onVerify: (recordId: string) => Promise<RecordVerificationResult | null>;
  isPending?: boolean;
}

export function VerifyRecordCard({ onVerify, isPending }: VerifyRecordCardProps) {
  const [recordId, setRecordId] = useState('');
  const [result, setResult] = useState<RecordVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = recordId.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const r = await onVerify(trimmed);
      setResult(r);
      if (!r) setError('No verification result returned.');
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  return (
    <HairlineCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--sev-success)' }} className="flex">
          <ShieldCheck size={18} strokeWidth={1.5} />
        </span>
        <h2 className="text-base font-semibold text-fg">Verify a record</h2>
        <span className="ml-2 text-xs text-fg-subtle">
          Confirms hash match, batch membership, and Hedera anchor.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md border border-border-subtle focus-within:border-border-hover">
          <Hash size={14} strokeWidth={1.5} className="text-fg-subtle" />
          <input
            type="text"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            placeholder="Paste a record id…"
            className="flex-1 bg-transparent border-0 outline-none text-sm text-fg placeholder:text-fg-subtle font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </div>
        <Button onClick={submit} disabled={isPending || !recordId.trim()}>
          Verify
        </Button>
      </div>

      {error && (
        <div className="text-sm text-sev-critical px-3 py-2 rounded-md bg-surface-2 border border-border-subtle">
          {error}
        </div>
      )}

      {result && <VerifyResult result={result} />}
    </HairlineCard>
  );
}

function VerifyResult({ result }: { result: RecordVerificationResult }) {
  const locallyValid = result.hashMatch && result.batchMembership;
  const chainVerified = locallyValid && result.mirrorNodeVerified && result.simulated === false;
  const tone = chainVerified ? 'var(--sev-success)' : locallyValid ? 'var(--sev-warn)' : 'var(--sev-critical)';

  let headline: string;
  if (chainVerified) {
    headline = 'Record verified';
  } else if (locallyValid && result.simulated) {
    headline = 'Hash + Merkle proof verified — Hedera anchor is simulated';
  } else if (locallyValid) {
    headline = 'Hash matches but mirror confirmation is still pending';
  } else if (result.hashMatch) {
    headline = 'Hash matches but anchor incomplete';
  } else {
    headline = 'Record could not be verified';
  }

  return (
    <div className="border border-border-subtle rounded-md overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderLeft: `2px solid ${tone}` }}
      >
        {chainVerified ? (
          <Check size={16} strokeWidth={2} style={{ color: tone }} />
        ) : locallyValid ? (
          <Minus size={16} strokeWidth={2} style={{ color: tone }} />
        ) : (
          <X size={16} strokeWidth={2} style={{ color: tone }} />
        )}
        <span className="text-sm font-medium text-fg">{headline}</span>
        {result.verificationMessage && (
          <span className="ml-auto text-xs text-fg-subtle">{result.verificationMessage}</span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border-subtle">
        <ResultKv label="Hash match" value={booleanBadge(result.hashMatch)} mono={false} />
        <ResultKv label="Batch membership" value={booleanBadge(result.batchMembership)} mono={false} />
        <ResultKv label="Mirror node" value={booleanBadge(result.mirrorNodeVerified)} mono={false} />
        {result.simulated !== undefined && (
          <ResultKv label="Anchor type" value={result.simulated ? 'Simulated' : 'Live Hedera'} mono={false} />
        )}
        {result.batchId && <ResultKv label="Batch" value={result.batchId} copyable />}
        {result.hederaTransactionId && (
          <ResultKv label="Hedera txn" value={truncate(result.hederaTransactionId)} copyable copyText={result.hederaTransactionId} />
        )}
        {result.recordHash && (
          <ResultKv label="Record hash" value={truncate(result.recordHash)} copyable copyText={result.recordHash} />
        )}
        {result.computedHash && (
          <ResultKv label="Computed hash" value={truncate(result.computedHash)} copyable copyText={result.computedHash} />
        )}
        {result.consensusTimestamp && (
          <ResultKv label="Consensus" value={formatHMS(result.consensusTimestamp)} />
        )}
      </div>
    </div>
  );
}

function ResultKv({
  label,
  value,
  mono = true,
  copyable,
  copyText,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  copyText?: string;
}) {
  return (
    <div className="bg-bg px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs text-fg ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</span>
        {copyable && copyText && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            onClick={() => {
              void navigator.clipboard?.writeText(copyText);
            }}
            className="text-fg-subtle hover:text-fg transition-colors"
          >
            <Copy size={11} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

function booleanBadge(value: boolean): React.ReactNode {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 text-sev-success">
        <Check size={12} strokeWidth={2} /> yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sev-critical">
      <X size={12} strokeWidth={2} /> no
    </span>
  );
}

function truncate(h: string): string {
  if (h.length <= 18) return h;
  return `${h.slice(0, 10)}…${h.slice(-4)}`;
}

function formatHMS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
