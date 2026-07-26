'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, FlaskConical, Key } from 'lucide-react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useActiveToken } from '@/hooks/use-active-token';
import { tokenService } from '@/services/api';

export interface ResearchBreadcrumb {
  label: string;
  href?: string;
}

interface ResearchTopbarProps {
  crumbs?: ResearchBreadcrumb[];
}

export function ResearchTopbar({ crumbs = [] }: ResearchTopbarProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { active } = useActiveToken();

  const { data: tokensPage } = useQuery({
    queryKey: ['v1.tokens'],
    queryFn: () => tokenService.list(),
    staleTime: 60_000,
  });
  const currentToken = active.id
    ? tokensPage?.items.find((t) => t.id === active.id)
    : undefined;
  const tokenSuffix = currentToken ? `wh_rsa_••••${currentToken.suffix}` : 'no token';
  const tokenNickname = currentToken?.name ?? 'pick on Account';

  const initials =
    user?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') ?? 'R';

  return (
    <header
      className="h-14 flex items-center gap-4 px-4 md:px-6 bg-bg border-b border-border-subtle"
      role="banner"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-subtle min-w-0 overflow-hidden">
        <span className="font-mono text-fg-muted">research.weatherhub.tn</span>
        {crumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1.5">
            <ChevronRight size={11} strokeWidth={1.5} />
            <span className={idx === crumbs.length - 1 ? 'text-fg' : 'text-fg-muted'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* Researcher mode chip */}
      <div
        className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-border-hover bg-surface-2"
        aria-label="Researcher mode active"
      >
        <FlaskConical size={12} strokeWidth={1.5} style={{ color: 'var(--accent-brand)' }} />
        <span className="text-[11.5px] font-medium text-fg">Researcher mode</span>
      </div>

      {/* Active token chip */}
      <button
        type="button"
        onClick={() => router.push('/research/account')}
        aria-label="Active API token — click to manage"
        className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border-subtle hover:border-border-hover transition-colors"
      >
        <Key size={12} strokeWidth={1.5} className="text-fg-muted" />
        <span className="font-mono text-[11.5px] text-fg-muted">{tokenSuffix}</span>
        <span className="font-mono text-[10px] text-fg-subtle pl-1.5 border-l border-border-subtle">
          {tokenNickname}
        </span>
        <ChevronDown size={11} strokeWidth={1.5} className="opacity-60 text-fg-muted" />
      </button>

      {/* Search */}
      <button
        type="button"
        className="hidden sm:inline-flex items-center justify-between h-8 w-56 px-2.5 rounded-md border border-border-subtle text-fg-subtle hover:border-border-hover hover:text-fg transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <Search size={13} strokeWidth={1.5} />
          <span className="text-sm">Search the docs…</span>
        </span>
        <span className="font-mono text-[10px] px-1 py-px border border-border-subtle rounded-sm">⌘K</span>
      </button>

      {/* Avatar */}
      <button
        type="button"
        aria-label="Account"
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-[#231a14] focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
        style={{
          background: 'linear-gradient(135deg, oklch(0.72 0.14 50), oklch(0.68 0.16 38))',
        }}
      >
        {initials}
      </button>
    </header>
  );
}
