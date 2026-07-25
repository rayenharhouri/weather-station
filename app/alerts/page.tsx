'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, SlidersHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HairlineCard } from '@/components/ui/hairline-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SevCritical, SevInfo, SevWarn } from '@/components/dashboard/sev';
import { AlertRow } from '@/components/dashboard/alert-row';
import { AlertDetailPanel } from '@/components/dashboard/alert-detail-panel';
import { alertService, stationService } from '@/services/api';
import type { Alert } from '@/types';

type StatusFilter = 'open' | 'acknowledged' | 'resolved' | 'all';
type SeverityFilter = 'all' | 'info' | 'warn' | 'critical';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'open', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

export default function AlertsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AlertsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AlertsContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });
  const station = stationsData?.items[0];
  const stationId = station?.id ?? 'station-001';

  const { data: allAlertsData } = useQuery({
    queryKey: ['alerts-page', stationId, 'all'],
    queryFn: () => alertService.getAlerts({ stationId }),
    refetchInterval: 30_000,
    enabled: !!station,
  });

  const allAlerts = allAlertsData?.items ?? [];

  const counts = useMemo(() => {
    const byStatus = {
      open: allAlerts.filter((a) => a.status === 'open').length,
      acknowledged: allAlerts.filter((a) => a.status === 'acknowledged').length,
      resolved: allAlerts.filter((a) => a.status === 'resolved').length,
      all: allAlerts.length,
    };
    const bySeverity = {
      info: allAlerts.filter((a) => a.severity === 'info').length,
      warn: allAlerts.filter((a) => a.severity === 'warning').length,
      critical: allAlerts.filter((a) => a.severity === 'critical').length,
    };
    return { byStatus, bySeverity };
  }, [allAlerts]);

  const filtered = useMemo(() => {
    return allAlerts.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (severityFilter !== 'all') {
        const want = severityFilter === 'warn' ? 'warning' : severityFilter;
        if (a.severity !== want) return false;
      }
      return true;
    });
  }, [allAlerts, statusFilter, severityFilter]);

  const lastTriggered = filtered[0]?.triggeredAt;

  // Clear selection if the selected alert is no longer in the filtered view.
  const selectedAlert = useMemo(
    () => (selectedId ? filtered.find((a) => a.id === selectedId) ?? null : null),
    [filtered, selectedId],
  );
  useEffect(() => {
    if (selectedId && !selectedAlert) setSelectedId(null);
  }, [selectedId, selectedAlert]);

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertService.acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts-page'] }),
  });
  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertService.resolveAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts-page'] }),
  });

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader
        totalActive={counts.byStatus.open}
        totalAlerts={counts.byStatus.all}
        lastTriggeredAt={lastTriggered}
      />

      {/* Severity multi-select strip */}
      <HairlineCard className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle mr-1">Severity</span>
          <SeverityChip
            label="Critical"
            count={counts.bySeverity.critical}
            color="var(--sev-critical)"
            active={severityFilter === 'critical'}
            onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
            shape={<SevCritical size={12} />}
          />
          <SeverityChip
            label="Warning"
            count={counts.bySeverity.warn}
            color="var(--sev-warn)"
            active={severityFilter === 'warn'}
            onClick={() => setSeverityFilter(severityFilter === 'warn' ? 'all' : 'warn')}
            shape={<SevWarn size={12} />}
          />
          <SeverityChip
            label="Info"
            count={counts.bySeverity.info}
            color="var(--sev-info)"
            active={severityFilter === 'info'}
            onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
            shape={<SevInfo size={12} />}
          />
          <span className="ml-auto flex items-center gap-3 text-xs text-fg-subtle">
            <span>
              {filtered.length}{' '}
              <span className="text-fg-subtle">of {allAlerts.length} alerts</span>
            </span>
          </span>
        </div>
      </HairlineCard>

      {/* Status tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedTabs<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
            badge: counts.byStatus[o.value],
          }))}
        />
      </div>

      {/* Alert list + optional detail panel */}
      <div
        className={[
          'grid gap-3 min-h-0',
          selectedAlert ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]' : 'grid-cols-1',
        ].join(' ')}
      >
        <HairlineCard
          className={[
            // On mobile, hide the list while a row is selected so the panel takes over.
            selectedAlert ? 'hidden lg:block' : 'block',
          ].join(' ')}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-fg-muted">
              {allAlerts.length === 0
                ? 'No alerts found for this station. Threshold incidents will show up here.'
                : 'No alerts match the current filters.'}
            </div>
          ) : (
            <div>
              {filtered.map((alert, idx) => (
                <div key={alert.id}>
                  <AlertRow
                    alert={alert}
                    showStation
                    selected={alert.id === selectedId}
                    onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                    onAcknowledge={(id) => ackMutation.mutate(id)}
                    onResolve={(id) => resolveMutation.mutate(id)}
                    pending={ackMutation.isPending || resolveMutation.isPending}
                  />
                  {idx < filtered.length - 1 && <div className="hairline" />}
                </div>
              ))}
            </div>
          )}
        </HairlineCard>

        {selectedAlert && (
          <AlertDetailPanel
            alert={selectedAlert}
            onClose={() => setSelectedId(null)}
            onAcknowledge={(id) => ackMutation.mutate(id)}
            onResolve={(id) => resolveMutation.mutate(id)}
            pending={ackMutation.isPending || resolveMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function SeverityChip({
  label,
  count,
  color,
  active,
  shape,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  shape: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <ToggleChip active={active} color={color} icon={shape} onClick={onClick}>
      <span>{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-fg-muted">{count}</span>
    </ToggleChip>
  );
}

function PageHeader({
  totalActive,
  totalAlerts,
  lastTriggeredAt,
}: {
  totalActive: number;
  totalAlerts: number;
  lastTriggeredAt?: string;
}) {
  const lastLabel = lastTriggeredAt ? formatRelativeTime(lastTriggeredAt) : '—';

  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Alerts</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Threshold incidents ·{' '}
          <span className="font-medium text-fg-muted">{totalActive} active</span>
          {totalAlerts > 0 && (
            <>
              {' · last triggered '}
              <span className="font-mono text-fg-muted">{lastLabel}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Download size={13} strokeWidth={1.5} /> Export
        </Button>
        <Button variant="outline" size="sm">
          <SlidersHorizontal size={13} strokeWidth={1.5} /> Manage thresholds
        </Button>
        <Button size="sm">
          <Plus size={13} strokeWidth={1.5} /> New rule
        </Button>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  const diff = Math.max(0, Date.now() - d.valueOf());
  const min = Math.floor(diff / 60_000);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (min < 1) return `${time} · just now`;
  if (min < 60) return `${time} · ${min}m ago`;
  return `${time} · ${Math.floor(min / 60)}h ago`;
}
