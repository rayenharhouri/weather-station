'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Authenticated page wrapper. Kept as a named re-export so the eight
 * existing page files (`app/dashboard/page.tsx`, etc.) don't have to be
 * touched in PR-3. Internal markup is the new flight-deck `<AppShell>`.
 *
 * When pages are migrated one by one, they can switch to importing
 * `AppShell` directly and this file can eventually be deleted.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export default DashboardLayout;
