'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HairlineCard } from '@/components/ui/hairline-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import {
  TokenRow,
  type ApiToken,
  type TokenStatus,
} from '@/components/research/token-row';
import { NewTokenDialog } from '@/components/research/new-token-dialog';
import { tokenService, type ApiTokenResource } from '@/services/api';

type Tab = 'active' | 'revoked' | 'expired' | 'all';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All' },
];

const QUERY_KEY = ['research', 'tokens'] as const;

/**
 * Maps the API resource shape onto the UI ApiToken type. They're kept
 * separate so adding server-only fields (userId, revokedAt, etc.) doesn't
 * leak into the UI.
 */
function toUiToken(resource: ApiTokenResource): ApiToken {
  return {
    id: resource.id,
    name: resource.name,
    suffix: resource.suffix,
    status: resource.status,
    scope: {
      stations: resource.scope.stations,
      metrics: resource.scope.metrics,
      readOnly: resource.scope.readOnly,
      crossTenant: resource.scope.crossTenant,
    },
    createdAt: resource.createdAt,
    lastUsedAt: resource.lastUsedAt,
    expiresAt: resource.expiresAt,
    requestsToday: 0,
    requestsTotal: resource.requestsTotal,
  };
}

export default function TokensPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [newOpen, setNewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => tokenService.list(),
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => tokenService.revoke(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const tokens = useMemo(() => (data?.items ?? []).map(toUiToken), [data]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      active: 0,
      revoked: 0,
      expired: 0,
      all: tokens.length,
    };
    for (const t of tokens) c[t.status]++;
    return c;
  }, [tokens]);

  const filtered = useMemo(() => {
    if (tab === 'all') return tokens;
    return tokens.filter((t) => t.status === (tab as TokenStatus));
  }, [tab, tokens]);

  const handleRevoke = (id: string) => {
    revokeMutation.mutate(id);
  };

  const handleRotate = (id: string) => {
    // For v1: revoke then reopen the create dialog so the user picks the
    // replacement name + scope. A real rotate-in-place could short-circuit
    // through `tokenService.rotate(id)` here once the dialog supports the flow.
    revokeMutation.mutate(id);
    setNewOpen(true);
  };

  // After the reveal phase closes, refetch so the list reconciles with the
  // server-issued token (id, scope, expiresAt). The dialog already showed
  // the plaintext during the one-shot reveal.
  const handleCreated = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return (
    <ResearchAppShell crumbs={[{ label: 'Tokens' }]}>
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5 gap-4 overflow-hidden">
        <PageHeader onNew={() => setNewOpen(true)} activeCount={counts.active} />

        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={setTab}
            options={TABS.map((t) => ({
              value: t.value,
              label: t.label,
              badge: counts[t.value],
            }))}
          />
        </div>

        {error ? (
          <ErrorBanner message={String((error as Error)?.message ?? error)} />
        ) : isLoading ? (
          <HairlineCard className="flex items-center justify-center py-12 text-sm text-fg-muted">
            Loading tokens…
          </HairlineCard>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} onNew={() => setNewOpen(true)} />
        ) : (
          <HairlineCard className="flex-1 min-h-0 overflow-y-auto no-scroll">
            <TableHeader />
            <div>
              {filtered.map((t, idx) => (
                <div key={t.id}>
                  <TokenRow
                    token={t}
                    onRotate={handleRotate}
                    onRevoke={handleRevoke}
                  />
                  {idx < filtered.length - 1 && <div className="hairline" />}
                </div>
              ))}
            </div>
          </HairlineCard>
        )}

        <SecurityNote />
      </div>

      <NewTokenDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleCreated}
      />
    </ResearchAppShell>
  );
}

function PageHeader({
  onNew,
  activeCount,
}: {
  onNew: () => void;
  activeCount: number;
}) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Tokens</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          {activeCount > 0 ? (
            <>
              <span className="font-mono text-fg">{activeCount}</span> active{' '}
              {activeCount === 1 ? 'token' : 'tokens'}. Per-token rate limits apply: 60 req/min,
              10,000 req/day.
            </>
          ) : (
            'No active tokens. Mint one to start using the API.'
          )}
        </span>
      </div>
      <Button size="sm" onClick={onNew}>
        <Plus size={13} strokeWidth={1.5} />
        New token
      </Button>
    </div>
  );
}

function TableHeader() {
  return (
    <div
      className="grid gap-3 px-4 py-2.5 border-b border-border-subtle text-[10px] uppercase tracking-[0.06em] text-fg-subtle"
      style={{ gridTemplateColumns: 'minmax(200px,1.4fr) 1.4fr 1fr 1fr 32px' }}
    >
      <span>Name · id</span>
      <span>Scope</span>
      <span>Last used · usage</span>
      <span>Expires · status</span>
      <span></span>
    </div>
  );
}

function EmptyState({ tab, onNew }: { tab: Tab; onNew: () => void }) {
  if (tab === 'active') {
    return (
      <HairlineCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Key size={20} strokeWidth={1.5} className="text-fg-subtle" />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-fg">No active tokens.</span>
          <span className="text-xs text-fg-subtle max-w-[28rem]">
            Tokens are how scripts and apps authenticate to the API. Each token has its own
            scope and rate limit — mint one per project so you can revoke without blast radius.
          </span>
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus size={13} strokeWidth={1.5} />
          Mint your first token
        </Button>
      </HairlineCard>
    );
  }
  return (
    <HairlineCard className="flex items-center justify-center py-12">
      <span className="text-sm text-fg-muted">
        No {tab === 'revoked' ? 'revoked' : tab === 'expired' ? 'expired' : ''} tokens.
      </span>
    </HairlineCard>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <HairlineCard
      className="flex items-center gap-2 px-4 py-3"
      style={{
        borderColor: 'color-mix(in oklch, var(--sev-critical) 35%, var(--border-subtle))',
        background: 'color-mix(in oklch, var(--sev-critical) 6%, transparent)',
      }}
    >
      <span className="text-sm text-sev-critical font-medium">Couldn't load tokens.</span>
      <span className="text-xs text-fg-muted truncate" title={message}>
        {message}
      </span>
    </HairlineCard>
  );
}

function SecurityNote() {
  return (
    <div className="text-[11px] text-fg-subtle leading-[1.5]">
      Tokens are stored hashed at rest. We display each full token exactly once on creation; the
      list view shows only the last four characters. If a token is leaked, revoke it here and any
      script using it stops working on the next request.
    </div>
  );
}
