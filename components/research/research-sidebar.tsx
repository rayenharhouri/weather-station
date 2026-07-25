'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  BookOpen,
  Database,
  Key,
  Download,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const apiItems: NavItem[] = [
  { href: '/research/playground', label: 'Playground', icon: Terminal },
  { href: '/research/docs', label: 'Docs', icon: BookOpen },
  { href: '/research/datasets', label: 'Datasets', icon: Database },
];

const acctItems: NavItem[] = [
  { href: '/research/tokens', label: 'Tokens', icon: Key, badge: '4' },
  { href: '/research/exports', label: 'Exports', icon: Download },
  { href: '/research/usage', label: 'Usage', icon: BarChart3 },
  { href: '/research/account', label: 'Account', icon: Settings },
];

export function ResearchSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex w-60 h-full flex-col gap-4 px-3 py-4 bg-bg border-r border-border-subtle shrink-0"
      aria-label="Researcher portal navigation"
    >
      <Link
        href="/research"
        className="flex items-center gap-2.5 px-2 py-1 rounded-md focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2"
      >
        <Image
          src="/logo.png"
          alt="WeatherHub for Research"
          width={28}
          height={28}
          className="block shrink-0"
          priority
        />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-semibold text-fg tracking-tight">WeatherHub</span>
          <span className="font-mono text-[11px] text-fg-subtle">for Research · v1</span>
        </div>
      </Link>

      <hr className="hairline" />

      <nav className="flex flex-col gap-1">
        <NavGroup title="API" items={apiItems} pathname={pathname} />
        <NavGroup title="Account" items={acctItems} pathname={pathname} />
      </nav>

      <div className="mt-auto px-1">
        <div className="px-3 py-2.5 rounded-md bg-surface-2 border border-border-subtle">
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-sev-success shrink-0" />
            <span>API · all systems normal</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-fg-subtle">Status page</span>
            <span className="font-mono text-[10px] text-fg-muted tabular-nums">p50 86 ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-2.5 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
        {title}
      </div>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/research' && pathname?.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-sm transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2',
              isActive
                ? 'bg-accent-brand-soft text-fg'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            ].join(' ')}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-sm bg-accent-brand"
              />
            )}
            <Icon size={16} strokeWidth={1.5} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto font-mono text-[11px] px-1.5 py-px rounded-sm bg-surface-2 border border-border-subtle text-fg-muted">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
