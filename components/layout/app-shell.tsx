'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar, type FleetStatus } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuthContext } from '@/providers/AuthProvider';
import { stationService } from '@/services/api';
import { LiveStatusProvider, useLiveStatus } from '@/providers/LiveStatusProvider';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LiveStatusProvider>
      <AppShellInner>{children}</AppShellInner>
    </LiveStatusProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuthContext();
  const live = useLiveStatus();

  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: () => stationService.getAll(),
    staleTime: 60_000,
  });

  const tenantSlug = user?.email?.split('@')[1]?.split('.')[0]?.toLowerCase() ?? 'enit';
  const tenantHost = `${tenantSlug}.weatherhub.tn`;

  const stationList = stations?.items ?? [];
  const selectedStation = stationList[0];
  const fleet: FleetStatus | undefined = stationList.length
    ? {
        online: stationList.filter((s) => s.status === 'online').length,
        total: stationList.length,
      }
    : undefined;

  return (
    <div className="relative flex h-dvh overflow-hidden bg-bg text-fg">
      <Sidebar tenantHost={tenantHost} fleet={fleet} />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-bg border-r border-border-subtle">
          {/* Mobile drawer reuses the same Sidebar component but always visible inside */}
          <div className="md:hidden h-full block">
            <Sidebar tenantHost={tenantHost} fleet={fleet} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          station={
            selectedStation
              ? { name: selectedStation.name, location: selectedStation.location }
              : undefined
          }
          totalStations={stationList.length || undefined}
          liveState={live.state}
          liveDetail={
            live.detail ??
            (live.lastSyncAt
              ? `last sync ${formatRelative(live.lastSyncAt)}`
              : undefined)
          }
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const deltaSec = Math.floor((Date.now() - t) / 1000);
  if (deltaSec < 0) return 'just now';
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleString();
}
