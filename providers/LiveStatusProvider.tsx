'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LiveState } from '@/components/dashboard/live-dot';

interface LiveStatusContextValue {
  state: LiveState;
  lastSyncAt: string | null;
  detail: string | null;
  report: (status: LiveReport) => void;
}

export interface LiveReport {
  connected: boolean;
  lastSyncAt?: string | null;
  detail?: string | null;
}

const LiveStatusContext = createContext<LiveStatusContextValue | null>(null);

export function LiveStatusProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<{
    state: LiveState;
    lastSyncAt: string | null;
    detail: string | null;
  }>({ state: 'offline', lastSyncAt: null, detail: null });

  const report = useCallback((r: LiveReport) => {
    setSnapshot((cur) => ({
      state: r.connected ? 'live' : 'offline',
      lastSyncAt: r.lastSyncAt ?? cur.lastSyncAt,
      detail: r.detail ?? cur.detail,
    }));
  }, []);

  const value = useMemo(
    () => ({
      state: snapshot.state,
      lastSyncAt: snapshot.lastSyncAt,
      detail: snapshot.detail,
      report,
    }),
    [snapshot, report],
  );

  return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>;
}

export function useLiveStatus(): LiveStatusContextValue {
  const ctx = useContext(LiveStatusContext);
  if (!ctx) {
    return {
      state: 'offline',
      lastSyncAt: null,
      detail: null,
      report: () => undefined,
    };
  }
  return ctx;
}

export function useReportLiveStatus(input: LiveReport): void {
  const { report } = useLiveStatus();
  useEffect(() => {
    report(input);
  }, [input.connected, input.lastSyncAt, input.detail, report]);
}
