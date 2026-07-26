'use client';

import type { ReactNode } from 'react';
import { ResearchSidebar } from '@/components/research/research-sidebar';
import {
  ResearchTopbar,
  type ResearchBreadcrumb,
} from '@/components/research/research-topbar';

interface ResearchAppShellProps {
  children: ReactNode;
  crumbs?: ResearchBreadcrumb[];
}

export function ResearchAppShell({ children, crumbs }: ResearchAppShellProps) {
  return (
    <div className="relative flex h-dvh overflow-hidden bg-bg text-fg">
      <ResearchSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ResearchTopbar crumbs={crumbs} />
        <main className="flex-1 min-h-0 flex">{children}</main>
      </div>
    </div>
  );
}
