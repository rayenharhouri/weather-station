'use client';

import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { VerifyRecordCard } from '@/components/dashboard/verify-record-card';
import { AnchorHealthCard } from '@/components/dashboard/anchor-health-card';
import { AnchorStreamTable } from '@/components/dashboard/anchor-stream-table';
import { stationService, integrityService } from '@/services/api';

export default function IntegrityPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <IntegrityContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function IntegrityContent() {
  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['integrity-batches', stationId, '24h'],
    queryFn: () => integrityService.getBatches({ stationId }),
    refetchInterval: 120_000,
    enabled: !!station,
  });

  const verifyMutation = useMutation({
    mutationFn: (recordId: string) => integrityService.verifyRecord(recordId),
  });

  const batches = batchesData?.items ?? [];
  const stats = useMemo(() => {
    const verified = batches.filter((b) => b.mirrorNodeVerified).length;
    const total = batches.length;
    const recordsToday = batches.reduce((acc, b) => acc + (b.recordCount ?? 0), 0);
    const health = total === 0 ? 0 : Math.round((verified / total) * 100);
    const cadencePerHour = total === 0 ? 0 : Math.round(recordsToday / 24);
    return { verified, total, recordsToday, health, cadencePerHour };
  }, [batches]);

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader lastAnchorAt={batches[0]?.consensusTimestamp} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-fg-subtle">
          <span className="font-mono text-fg-muted">{stats.verified}</span> of{' '}
          <span className="font-mono text-fg-muted">{stats.total}</span> batches verified on Hedera
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download size={13} strokeWidth={1.5} /> Export proofs
          </Button>
          <Button variant="outline" size="sm">
            <Settings2 size={13} strokeWidth={1.5} /> Anchor settings
          </Button>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}
      >
        <div className="flex flex-col gap-3 min-w-0">
          <VerifyRecordCard
            onVerify={async (recordId) => verifyMutation.mutateAsync(recordId)}
            isPending={verifyMutation.isPending}
          />
          <AnchorStreamTable batches={batches} isLoading={batchesLoading} />
        </div>

        <AnchorHealthCard
          health={stats.health}
          anchorsToday={stats.total}
          recordsToday={stats.recordsToday}
          cadencePerHour={stats.cadencePerHour}
          nextAnchorIn={estimateNextAnchor()}
        />
      </div>
    </div>
  );
}

function PageHeader({ lastAnchorAt }: { lastAnchorAt?: string }) {
  const last = lastAnchorAt
    ? new Date(lastAnchorAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Integrity</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Hedera-anchored Merkle batches · verify-by-record · last anchor{' '}
          <span className="font-mono text-fg-muted">{last}</span>
        </span>
      </div>
    </div>
  );
}

function estimateNextAnchor(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const elapsed = minutes % 30;
  const remainingMin = 30 - elapsed;
  const remainingSec = 60 - now.getSeconds();
  if (remainingMin === 1) return `${remainingSec}s`;
  return `${remainingMin - 1}m ${remainingSec}s`;
}
