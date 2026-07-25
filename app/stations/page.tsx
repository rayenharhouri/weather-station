'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HairlineCard } from '@/components/ui/hairline-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StationCard } from '@/components/dashboard/station-card';
import { stationService } from '@/services/api';

type StatusFilter = 'all' | 'online' | 'offline' | 'maintenance';

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function StationsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <StationsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function StationsContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: stationsData, isLoading } = useQuery({
    queryKey: ['stations-list'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });

  const stations = stationsData?.items ?? [];

  const counts = useMemo(() => {
    return {
      all: stations.length,
      online: stations.filter((s) => s.status === 'online').length,
      offline: stations.filter((s) => s.status === 'offline').length,
      maintenance: stations.filter((s) => s.status === 'maintenance').length,
    };
  }, [stations]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return stations;
    return stations.filter((s) => s.status === statusFilter);
  }, [stations, statusFilter]);

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <PageHeader counts={counts} />

      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedTabs<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            badge: counts[t.value],
          }))}
        />
        <span className="text-xs text-fg-subtle ml-1">
          {filtered.length} station{filtered.length === 1 ? '' : 's'} shown
        </span>
      </div>

      {isLoading ? (
        <HairlineCard className="px-4 py-12 text-center text-sm text-fg-muted">
          Loading stations…
        </HairlineCard>
      ) : filtered.length === 0 ? (
        <HairlineCard className="px-4 py-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <MapPin size={24} strokeWidth={1.5} className="text-fg-subtle" />
            <p className="text-sm font-medium text-fg">No stations configured</p>
            <p className="text-xs text-fg-muted max-w-sm">
              Add your first station to start collecting data. Each ESP32 device publishes to its
              own MQTT topic under <span className="font-mono">tenants/&lt;tid&gt;/stations/&lt;id&gt;/readings</span>.
            </p>
          </div>
        </HairlineCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader({ counts }: { counts: Record<StatusFilter, number> }) {
  return (
    <div className="flex items-end justify-between pb-1 flex-wrap gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Stations</h1>
          <Chip>v1.4</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Monitoring network · {' '}
          <span className="font-mono text-fg-muted">{counts.online}</span> online ·{' '}
          <span className="font-mono text-fg-muted">{counts.offline}</span> offline
          {counts.maintenance > 0 && (
            <>
              {' · '}
              <span className="font-mono text-fg-muted">{counts.maintenance}</span> maintenance
            </>
          )}
        </span>
      </div>
      <Button size="sm">
        <Plus size={13} strokeWidth={1.5} /> Add station
      </Button>
    </div>
  );
}
