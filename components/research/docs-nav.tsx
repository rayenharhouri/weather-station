'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Search, GitBranch, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocsLeaf {
  label: string;
  href: string;
  badge?: string;
  /** Defaults to `false` for now — only set `true` once the page exists. */
  available?: boolean;
}

interface DocsBranch {
  label: string;
  href?: string;
  children?: DocsLeaf[];
}

interface DocsSection {
  id: string;
  title: string;
  initiallyExpanded?: boolean;
  items: Array<DocsBranch | DocsLeaf>;
}

const SECTIONS: DocsSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    initiallyExpanded: true,
    items: [
      { label: 'Quickstart', href: '/research/docs/quickstart' },
      { label: 'Authentication', href: '/research/docs/authentication' },
      { label: 'Pagination', href: '/research/docs/pagination' },
      { label: 'Rate limits', href: '/research/docs/rate-limits' },
      { label: 'Errors', href: '/research/docs/errors' },
    ],
  },
  {
    id: 'resources',
    title: 'Resources',
    initiallyExpanded: true,
    items: [
      { label: 'Stations', href: '/research/docs/stations' },
      {
        label: 'Readings',
        children: [
          { label: 'List readings', href: '/research/docs/readings', available: true },
          { label: 'Get reading', href: '/research/docs/readings/get' },
          {
            label: 'Stream readings (SSE)',
            href: '/research/docs/readings/stream',
            badge: 'Live',
          },
        ],
      },
      { label: 'Forecasts', href: '/research/docs/forecasts' },
      { label: 'Alerts', href: '/research/docs/alerts' },
      { label: 'Integrity', href: '/research/docs/integrity' },
    ],
  },
  {
    id: 'sdks',
    title: 'SDKs',
    items: [
      { label: 'Python', href: '/research/docs/sdks/python' },
      { label: 'JavaScript / Node', href: '/research/docs/sdks/node' },
      { label: 'R', href: '/research/docs/sdks/r' },
    ],
  },
  {
    id: 'changelog',
    title: 'Changelog',
    items: [],
  },
];

/**
 * Docs nav — the second sidebar. Sections are collapsible; the active page
 * highlights with the brand accent bar (same convention as the operations
 * sidebar). Branches with children (e.g. Readings) auto-expand when one of
 * their leaves is active.
 *
 * Leaves carry an `available` flag. Only built-out routes set `available:
 * true`; everything else renders dimmed, non-interactive, with a "soon" tag —
 * honest signal that the page is on the way.
 */
export function DocsNav() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex w-60 h-full flex-col bg-bg border-r border-border-subtle shrink-0"
      aria-label="Documentation sections"
    >
      <div className="px-3.5 pt-3.5 pb-2.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-fg-subtle hover:text-fg"
          type="button"
        >
          <span className="inline-flex items-center gap-1.5">
            <Search size={12} strokeWidth={1.5} />
            <span className="text-xs">Find in docs</span>
          </span>
          <span className="font-mono text-[10px] px-1 border border-border-subtle rounded-sm">
            /
          </span>
        </Button>
      </div>
      <hr className="hairline" />

      <div className="flex-1 overflow-y-auto px-1.5 py-2.5 no-scroll">
        {SECTIONS.map((section) => (
          <NavSection key={section.id} section={section} pathname={pathname} />
        ))}
      </div>

      <div className="flex flex-col gap-1 px-3.5 py-3 border-t border-border-subtle">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-6 px-1.5 text-xs text-fg-muted hover:text-fg transition-colors rounded-sm"
        >
          <GitBranch size={11} strokeWidth={1.5} /> View on GitHub
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-6 px-1.5 text-xs text-fg-muted hover:text-fg transition-colors rounded-sm"
        >
          <Terminal size={11} strokeWidth={1.5} /> OpenAPI · download
        </button>
      </div>
    </aside>
  );
}

function NavSection({
  section,
  pathname,
}: {
  section: DocsSection;
  pathname: string | null;
}) {
  const isLeaf = (item: DocsBranch | DocsLeaf): item is DocsLeaf => 'href' in item;
  const sectionActive = section.items.some((item) =>
    isLeaf(item)
      ? pathname === item.href
      : (item.children?.some((c) => pathname === c.href) ?? false),
  );
  const [expanded, setExpanded] = useState(Boolean(section.initiallyExpanded || sectionActive));

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.06em] text-fg-subtle hover:text-fg-muted rounded-sm"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown size={11} strokeWidth={1.5} />
        ) : (
          <ChevronRight size={11} strokeWidth={1.5} />
        )}
        <span>{section.title}</span>
      </button>
      {expanded &&
        section.items.map((item, idx) =>
          isLeaf(item) ? (
            <NavLeaf key={idx} item={item} pathname={pathname} indent={1} />
          ) : (
            <NavBranch key={idx} item={item} pathname={pathname} />
          ),
        )}
    </div>
  );
}

function NavBranch({
  item,
  pathname,
}: {
  item: DocsBranch;
  pathname: string | null;
}) {
  const childActive = item.children?.some((c) => pathname === c.href) ?? false;
  const [expanded, setExpanded] = useState<boolean>(childActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="relative w-full flex items-center gap-1.5 py-1.5 pl-3.5 pr-2.5 rounded-md text-[12.5px] text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors duration-150"
      >
        {expanded ? (
          <ChevronDown size={10} strokeWidth={1.5} className="text-fg-subtle" />
        ) : (
          <ChevronRight size={10} strokeWidth={1.5} className="text-fg-subtle" />
        )}
        <span className="flex-1 text-left truncate">{item.label}</span>
      </button>
      {expanded &&
        item.children?.map((child, idx) => (
          <NavLeaf key={idx} item={child} pathname={pathname} indent={2} />
        ))}
    </div>
  );
}

function NavLeaf({
  item,
  pathname,
  indent,
}: {
  item: DocsLeaf;
  pathname: string | null;
  indent: 1 | 2;
}) {
  const active = pathname === item.href;
  const padLeft = indent === 1 ? 'pl-8' : 'pl-11';
  const disabled = !item.available && !active;

  // Disabled: render as a non-link span. Looks dimmed, cursor-not-allowed,
  // explains itself via title + aria-disabled.
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className={[
          'relative flex items-center gap-1.5 py-1.5 pr-2.5 rounded-md text-[12.5px] cursor-not-allowed select-none',
          padLeft,
          'text-fg-subtle/70 opacity-70',
        ].join(' ')}
      >
        <span className="flex-1 truncate">{item.label}</span>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.06em] px-1 py-px rounded-sm border border-border-subtle text-fg-subtle"
          aria-hidden
        >
          soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={[
        'relative flex items-center gap-1.5 py-1.5 pr-2.5 rounded-md text-[12.5px] transition-colors duration-150',
        padLeft,
        active
          ? 'bg-accent-brand-soft text-fg font-medium'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        'focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-[-2px]',
      ].join(' ')}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-sm bg-accent-brand"
        />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className="font-mono text-[9px] px-1 py-px rounded-sm border border-border-subtle"
          style={{ color: 'var(--sev-success)' }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
