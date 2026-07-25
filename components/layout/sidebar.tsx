'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  LineChart,
  TrendingUp,
  Bell,
  ShieldCheck,
  RadioTower,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { BrandBlock } from '@/components/layout/brand-block';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Monitoring',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/live', label: 'Live', icon: Activity },
      { href: '/analytics', label: 'Analytics', icon: LineChart },
      { href: '/forecasts', label: 'Forecasts', icon: TrendingUp },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/alerts', label: 'Alerts', icon: Bell },
      { href: '/integrity', label: 'Integrity', icon: ShieldCheck },
      { href: '/stations', label: 'Stations', icon: RadioTower },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export interface FleetStatus {
  online: number;
  total: number;
}

export function Sidebar({
  tenantHost,
  fleet,
}: {
  tenantHost: string;
  fleet?: FleetStatus;
}) {
  const pathname = usePathname();
  const onlinePct = fleet && fleet.total > 0 ? Math.round((fleet.online / fleet.total) * 100) : null;

  return (
    <aside
      className="hidden md:flex w-60 h-full flex-col gap-4 px-3 py-4 bg-bg border-r border-border-subtle"
      aria-label="Primary navigation"
    >
      <BrandBlock tenantHost={tenantHost} />
      <hr className="hairline" />

      <nav className="flex flex-col gap-1" aria-label="Sections">
        {navGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <div className="px-2.5 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'group/nav relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-sm transition-colors duration-150',
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
        ))}
      </nav>

      <div className="mt-auto px-1">
        <div className="px-3 py-2.5 rounded-md bg-surface-2 border border-border-subtle">
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-sev-success shrink-0"
            />
            <span>
              {fleet
                ? `${fleet.online} of ${fleet.total} reporting`
                : 'Fleet status unavailable'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-fg-subtle">Fleet status</span>
            {onlinePct !== null && (
              <span className="font-mono text-[10px] text-fg-muted tabular-nums">{onlinePct}%</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
