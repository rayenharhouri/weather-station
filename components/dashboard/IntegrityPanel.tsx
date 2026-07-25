'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Clock, Shield, Hash, Hexagon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IntegrityBatch } from '@/types';
import { cn, integrityAnchorStatus } from '@/lib/utils';

interface IntegrityBatchCardProps {
  batch: IntegrityBatch;
  onSelect?: (batchId: string) => void;
}

export const IntegrityBatchCard: React.FC<IntegrityBatchCardProps> = ({ batch, onSelect }) => {
  const status = integrityAnchorStatus(batch);
  const verified = status === 'verified';
  const timeWindowStart = new Date(batch.timeWindowStart);
  const timeWindowEnd = new Date(batch.timeWindowEnd);

  return (
    <Card
      onClick={() => onSelect?.(batch.id)}
      className={cn('relative overflow-hidden', onSelect && 'cursor-pointer hover:-translate-y-0.5 transition-transform')}
    >
      <div aria-hidden className={cn(
        'absolute inset-x-0 -top-12 h-24 bg-gradient-to-b to-transparent blur-2xl opacity-80 pointer-events-none',
        verified ? 'from-aurora/30' : status === 'pending' ? 'from-sunrise/30' : 'from-foreground/10',
      )} />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              verified ? 'bg-aurora/15 text-aurora' : status === 'pending' ? 'bg-sunrise/15 text-sunrise' : 'bg-foreground/10 text-muted-foreground',
            )}>
              <Hexagon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-mono tracking-tight">{batch.id.slice(0, 8)}</CardTitle>
              <CardDescription className="text-xs">
                {batch.recordCount.toLocaleString()} records anchored
              </CardDescription>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full ring-1',
            verified ? 'bg-aurora/10 text-aurora ring-aurora/20' : status === 'pending' ? 'bg-sunrise/10 text-sunrise ring-sunrise/20' : 'bg-foreground/10 text-muted-foreground ring-foreground/10',
          )}>
            {verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {verified ? 'Verified' : status === 'pending' ? 'Pending' : 'Simulated'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl glass-subtle p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Window</div>
            <div className="font-mono text-xs tabular-nums">{timeWindowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="font-mono text-xs tabular-nums text-muted-foreground">{timeWindowEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="rounded-xl glass-subtle p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Topic</div>
            <div className="font-mono text-xs">{batch.hederaTopicId}</div>
            <div className="font-mono text-xs text-muted-foreground">#{batch.hederaSequenceNumber}</div>
          </div>
        </div>

        {batch.merkleRoot && (
          <div className="rounded-xl glass-subtle p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              <Hash className="w-3 h-3" /> Merkle Root
            </div>
            <div className="font-mono text-xs break-all text-foreground/80">
              {batch.merkleRoot.slice(0, 32)}…
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface IntegrityPanelProps {
  batches: IntegrityBatch[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

export const IntegrityPanel: React.FC<IntegrityPanelProps> = ({
  batches,
  isLoading = false,
  onViewAll,
}) => {
  const latestBatch = batches[0];
  const realCount = batches.filter((b) => !b.simulated).length;
  const verifiedCount = batches.filter((b) => integrityAnchorStatus(b) === 'verified').length;
  const verifyPct = batches.length ? Math.round((verifiedCount / batches.length) * 100) : 0;
  const allSimulated = batches.length > 0 && realCount === 0;

  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute -top-20 -right-12 w-48 h-48 rounded-full bg-aurora/15 blur-3xl pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-3 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-aurora/15 text-aurora flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base">Data Integrity</CardTitle>
            <CardDescription className="text-xs">
              {allSimulated
                ? `${batches.length} simulated — Hedera anchoring not yet live`
                : `${verifiedCount}/${batches.length} verified on Hedera`}
            </CardDescription>
          </div>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
            View all →
          </Button>
        )}
      </CardHeader>

      <CardContent className="relative space-y-4">
        {batches.length > 0 && (
          <div className="rounded-xl glass-subtle p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Verification rate</span>
              <span className="font-medium tabular-nums text-aurora">{verifyPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-aurora to-sky transition-all"
                style={{ width: `${verifyPct}%` }}
              />
            </div>
          </div>
        )}

        {!isLoading && batches.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-foreground/5 text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No anchors yet</p>
            <p className="text-xs text-muted-foreground mt-1">Data will appear once anchored to Hedera</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
        ) : (
          latestBatch && (
            <div className="rounded-xl glass-subtle p-4 space-y-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-aurora to-sky" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Latest anchor</div>
                <div className="text-sm font-medium tabular-nums">
                  {new Date(latestBatch.consensusTimestamp).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Topic</div>
                  <div className="font-mono">{latestBatch.hederaTopicId}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Sequence</div>
                  <div className="font-mono">#{latestBatch.hederaSequenceNumber}</div>
                </div>
              </div>
              {(() => {
                const latestStatus = integrityAnchorStatus(latestBatch);
                if (latestStatus === 'verified') {
                  return (
                    <div className="flex items-center gap-2 text-aurora text-xs pt-2 border-t border-foreground/10">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="font-medium">Verified on Hedera Mirror</span>
                    </div>
                  );
                }
                if (latestStatus === 'pending') {
                  return (
                    <div className="flex items-center gap-2 text-sunrise text-xs pt-2 border-t border-foreground/10">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium">Anchored — mirror confirmation pending</span>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs pt-2 border-t border-foreground/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">Simulated anchor — Hedera not yet live</span>
                  </div>
                );
              })()}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};
