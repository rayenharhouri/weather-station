'use client';

import { ChevronDown, Clock, BookOpen, Save, Share2 } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Button } from '@/components/ui/button';
import { MethodBadge } from '@/components/research/docs-primitives';

export interface EndpointBarProps {
  method?: string;
  baseUrl?: string;
  path?: string;
  lastRunAt?: string;
  lastRunMs?: number;
  lastRunStatus?: string;
}

export function EndpointBar({
  method = 'GET',
  baseUrl = 'https://research.weatherhub.tn',
  path = '/v1/readings',
  lastRunAt,
  lastRunMs,
  lastRunStatus = '200 OK',
}: EndpointBarProps) {
  return (
    <HairlineCard className="flex items-center gap-2.5 px-3.5 py-2.5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <MethodBadge method={method} />
        <ChevronDown size={11} strokeWidth={1.5} className="text-fg-subtle" />
      </div>

      <span className="font-mono text-[13px] text-fg flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-fg-subtle truncate hidden sm:inline">{baseUrl}</span>
        <span>{path}</span>
        <ChevronDown size={11} strokeWidth={1.5} className="text-fg-subtle" />
      </span>

      {lastRunAt && (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-subtle">
          <Clock size={11} strokeWidth={1.5} />
          <span>
            Last run{' '}
            <span className="font-mono text-fg-muted">{formatHMShort(lastRunAt)}</span>
            {lastRunMs != null && (
              <>
                {' · '}
                <span className="font-mono text-fg-muted">{lastRunMs} ms</span>
              </>
            )}
            {' · '}
            <span style={{ color: 'var(--sev-success)' }} className="font-mono">
              {lastRunStatus}
            </span>
          </span>
        </span>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <Button variant="outline" size="xs">
          <BookOpen size={11} strokeWidth={1.5} /> Open in docs
        </Button>
        <Button variant="outline" size="xs">
          <Save size={11} strokeWidth={1.5} /> Saved queries{' '}
          <ChevronDown size={11} strokeWidth={1.5} className="opacity-60" />
        </Button>
        <Button variant="outline" size="xs">
          <Share2 size={11} strokeWidth={1.5} /> Share
        </Button>
      </div>
    </HairlineCard>
  );
}

function formatHMShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
