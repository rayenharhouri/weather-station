'use client';

import { ArrowRight, ShieldCheck, Copy } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { integrityAnchorStatus } from '@/lib/utils';
import type { IntegrityBatch } from '@/types';

interface IntegrityCardProps {
  batches: IntegrityBatch[];
  isLoading?: boolean;
  onVerifyRecord?: () => void;
}

export function IntegrityCard({ batches, isLoading, onVerifyRecord }: IntegrityCardProps) {
  const latest = batches[0];
  const status = latest ? integrityAnchorStatus(latest) : null;
  const totalRecords = batches.reduce((acc, b) => acc + (b.recordCount ?? 0), 0);
  const statusColor =
    status === 'verified' ? 'var(--sev-success)' : status === 'pending' ? 'var(--sev-warn)' : 'var(--fg-subtle)';
  const statusLabel = status === 'verified' ? 'Anchored' : status === 'pending' ? 'Pending' : 'Simulated';

  return (
    <HairlineCard className="flex flex-col h-full p-5 gap-3">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--sev-success)' }} className="flex">
          <ShieldCheck size={16} strokeWidth={1.5} />
        </span>
        <span className="text-sm text-fg-muted">Integrity</span>
        {latest && (
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[11px]"
            style={{ color: statusColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor }}
              aria-hidden
            />
            {statusLabel}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-fg-muted">
          Loading integrity…
        </div>
      ) : !latest ? (
        <div className="flex-1 flex items-center justify-center text-sm text-fg-muted text-center px-4">
          No batches anchored yet. New batches anchor on a rolling 30-minute window.
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <Row label="Last batch" value={formatRelativeTime(latest.consensusTimestamp)} />
          <Row label="Records" value={totalRecords.toLocaleString()} />
          {latest.hederaTransactionId && (
            <Row
              label="Hedera txn"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-fg">{truncateHash(latest.hederaTransactionId)}</span>
                  <button
                    type="button"
                    className="text-fg-subtle hover:text-fg transition-colors"
                    aria-label="Copy Hedera transaction id"
                    onClick={() => {
                      void navigator.clipboard?.writeText(latest.hederaTransactionId);
                    }}
                  >
                    <Copy size={11} strokeWidth={1.5} />
                  </button>
                </span>
              }
            />
          )}
          {latest.merkleRoot && <Row label="Merkle root" value={truncateHash(latest.merkleRoot)} />}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-border-subtle">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={onVerifyRecord}
        >
          <span>Verify a record</span>
          <ArrowRight size={12} strokeWidth={1.5} />
        </Button>
      </div>
    </HairlineCard>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.05em] text-fg-subtle">{label}</span>
      <span className="font-mono text-[13px] text-fg">{value}</span>
    </div>
  );
}

function truncateHash(h: string): string {
  if (h.length <= 12) return h;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  const diffMin = Math.max(0, Math.round((Date.now() - d.valueOf()) / 60_000));
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffMin < 1) return `${time} · just now`;
  if (diffMin < 60) return `${time} · ${diffMin} min ago`;
  return `${time} · ${Math.floor(diffMin / 60)}h ago`;
}
