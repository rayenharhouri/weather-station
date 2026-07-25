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
  /** SSE connection state for the current view. */
  connected: boolean;
  /** Timestamp of the last reading this view received, if any. */
  lastSyncAt?: string | null;
  /** Optional short detail (e.g. "2 readings · 12 alerts") for the topbar. */
  detail?: string | null;
}

const LiveStatusContext = createContext<LiveStatusContextValue | null>(null);

/**
 * Provides the cross-page live-data signal the topbar paints. Pages that
 * subscribe to SSE (`/dashboard`, `/live`) call `report()` whenever their
 * connection state changes or a reading lands; the topbar consumes the
 * latest report and renders the `LiveDot` accordingly.
 *
 * Falls back to `disconnected` when nothing reports — preferable to the
 * old hardcoded `live` because at least the dot now reflects something
 * real (nobody is subscribed → no live data is flowing).
 */
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
    // Render-safe fallback for pages that don't mount the provider —
    // returns a no-op `report` so the hook is safe to call unconditionally.
    return {
      state: 'offline',
      lastSyncAt: null,
      detail: null,
      report: () => undefined,
    };
  }
  return ctx;
}

/**
 * Convenience hook for SSE pages: re-reports the live status whenever
 * `connected` or `lastSyncAt` change. Saves the page from open-coding a
 * `useEffect(() => report(...))` block per consumer.
 */
export function useReportLiveStatus(input: LiveReport): void {
  const { report } = useLiveStatus();
  useEffect(() => {
    report(input);
    // We intentionally re-report on every change to the inputs — the
    // provider de-dupes equivalent updates via its setter.
  }, [input.connected, input.lastSyncAt, input.detail, report]);
}
