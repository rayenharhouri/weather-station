'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  RadioTower,
  ChevronDown,
  ChevronRight,
  Search,
  Menu,
  LogOut,
} from 'lucide-react';
import { LiveDot, type LiveState } from '@/components/dashboard/live-dot';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/providers/AuthProvider';
import { authService } from '@/services/api';

export interface TopbarProps {
  station?: { name: string; location?: string };
  totalStations?: number;
  liveState?: LiveState;
  liveDetail?: string;
  onOpenMobileNav?: () => void;
}

export function Topbar({
  station,
  totalStations,
  liveState = 'live',
  liveDetail,
  onOpenMobileNav,
}: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const initials =
    user?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ?? 'U';

  const pageLabel = pathname?.split('/').filter(Boolean)[0] ?? 'dashboard';
  const formattedPage = pageLabel.charAt(0).toUpperCase() + pageLabel.slice(1);

  return (
    <header
      className="h-14 flex items-center gap-4 px-4 md:px-6 bg-bg border-b border-border-subtle"
      role="banner"
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* Station selector */}
      <button
        type="button"
        className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border-subtle text-fg-muted hover:border-border-hover hover:text-fg transition-colors"
      >
        <RadioTower size={13} strokeWidth={1.5} />
        <span className="text-sm">Station</span>
        <span className="text-sm text-fg ml-1.5">{station?.name ?? '—'}</span>
        {totalStations != null && (
          <span className="font-mono text-xs text-fg-subtle ml-1">/{totalStations}</span>
        )}
        <ChevronDown size={12} strokeWidth={1.5} className="ml-1 opacity-60" />
      </button>

      {/* Breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-fg-subtle">
        <span>{station?.name ?? formattedPage}</span>
        {station?.location && (
          <>
            <ChevronRight size={11} strokeWidth={1.5} />
            <span className="text-fg-muted">{station.location}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Search (mock — opens command palette in a later PR) */}
      <button
        type="button"
        className="hidden sm:inline-flex items-center justify-between h-8 w-56 px-2.5 rounded-md border border-border-subtle text-fg-subtle hover:border-border-hover hover:text-fg transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <Search size={13} strokeWidth={1.5} />
          <span className="text-sm">Search stations, alerts…</span>
        </span>
        <span className="font-mono text-[10px] px-1 py-px border border-border-subtle rounded-sm">⌘K</span>
      </button>

      {/* Live indicator */}
      <div className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-border-subtle">
        <LiveDot state={liveState} />
        <span className="text-xs text-fg-muted">
          {liveState === 'live' ? 'Live' : liveState === 'warn' ? 'Reconnecting' : 'Offline'}
        </span>
        {liveDetail && (
          <span className="hidden lg:inline-flex font-mono text-[11px] text-fg-subtle pl-1.5 border-l border-border-subtle">
            {liveDetail}
          </span>
        )}
      </div>

      {/* Avatar + menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Account menu"
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
              style={{
                background: 'linear-gradient(135deg, oklch(0.6 0.14 280), oklch(0.55 0.18 255))',
              }}
            />
          }
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {user && (
            <>
              <div className="px-2 py-1.5 text-xs">
                <div className="font-medium text-fg">{user.name}</div>
                <div className="font-mono text-[11px] text-fg-muted truncate">{user.email}</div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut}>
            <LogOut size={14} strokeWidth={1.5} />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
