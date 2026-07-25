'use client';

import { HairlineCard } from '@/components/ui/hairline-card';
import { integrityAnchorStatus } from '@/lib/utils';
import type { IntegrityBatch } from '@/types';

interface AnchorStreamTableProps {
  batches: IntegrityBatch[];
  isLoading?: boolean;
}

export function AnchorStreamTable({ batches, isLoading }: AnchorStreamTableProps) {
  return (
    <HairlineCard>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-fg-muted">Anchor stream</span>
        <span className="font-mono text-xs text-fg-subtle">· last 24h · {batches.length}</span>
      </div>
      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm text-fg-muted">Loading anchors…</div>
      ) : batches.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-fg-muted">
          No anchors in the last 24 hours. Batches anchor on a rolling 30-min window.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle border-b border-border-subtle">
                <th className="text-left font-medium px-4 py-2">Batch</th>
                <th className="text-left font-medium px-3 py-2">Time</th>
                <th className="text-right font-medium px-3 py-2">Records</th>
                <th className="text-left font-medium px-3 py-2">Hedera txn</th>
                <th className="text-left font-medium px-3 py-2">Merkle root</th>
                <th className="text-right font-medium px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, idx) => (
                <tr
                  key={b.id}
                  className={`hover:bg-surface-2 transition-colors duration-150 ${
                    idx < batches.length - 1 ? 'border-b border-border-subtle' : ''
                  }`}
                >
                  <td className="px-4 py-2 text-fg">{b.id.slice(0, 10)}…</td>
                  <td className="px-3 py-2 text-fg-muted">
                    {b.consensusTimestamp ? formatHMS(b.consensusTimestamp) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-fg">{b.recordCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-fg-muted">
                    {b.hederaTransactionId ? truncate(b.hederaTransactionId) : '—'}
                  </td>
                  <td className="px-3 py-2 text-fg-muted">
                    {b.merkleRoot ? truncate(b.merkleRoot) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {(() => {
                      const status = integrityAnchorStatus(b);
                      const tone = status === 'verified' ? '--sev-success' : status === 'pending' ? '--sev-warn' : '--fg-subtle';
                      const label = status === 'verified' ? 'Anchored' : status === 'pending' ? 'Pending' : 'Simulated';
                      return (
                        <span
                          className="inline-flex items-center text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 rounded-sm"
                          style={{ color: `var(${tone})`, background: `oklch(from var(${tone}) l c h / 0.10)` }}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HairlineCard>
  );
}

function truncate(h: string): string {
  if (h.length <= 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

function formatHMS(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
