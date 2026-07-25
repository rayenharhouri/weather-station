'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Key,
  Globe,
  Bell,
  BookOpen,
  ShieldAlert,
  LogOut,
  Download as DownloadIcon,
  Pencil,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import { useAuthContext } from '@/providers/AuthProvider';
import { useActiveToken } from '@/hooks/use-active-token';
import {
  accountService,
  authService,
  grantService,
  tokenService,
  type AccountResource,
  type ApiTokenResource,
  type GrantResource,
} from '@/services/api';

interface TokenChoice {
  id: string;
  name: string;
  suffix: string;
  scope: string;
}

const formatScope = (token: ApiTokenResource): string => {
  const parts: string[] = [];
  parts.push(token.scope.stations.length === 0 ? 'all stations' : `${token.scope.stations.length} station${token.scope.stations.length === 1 ? '' : 's'}`);
  parts.push(token.scope.metrics.length === 0 ? 'all metrics' : token.scope.metrics.join('+'));
  if (token.scope.readOnly) parts.push('ro');
  if (token.scope.crossTenant) parts.push('cross-tenant');
  return parts.join(' · ');
};

type CitationFormat = 'apa' | 'mla' | 'chicago' | 'bibtex';

const CITATION_FORMATS: Array<{ value: CitationFormat; label: string; sample: string }> = [
  { value: 'apa', label: 'APA', sample: 'Researcher, C. (2026). WeatherHub readings [Dataset]…' },
  { value: 'mla', label: 'MLA', sample: 'Researcher, Chiheb. "WeatherHub Readings." 2026…' },
  { value: 'chicago', label: 'Chicago', sample: 'Researcher, Chiheb. 2026. "WeatherHub readings."…' },
  { value: 'bibtex', label: 'BibTeX', sample: '@dataset{weatherhub2026, author = {…}, year = 2026…}' },
];

interface NotificationPrefs {
  weeklyDigest: boolean;
  rateLimitWarnings: boolean;
  breakingChanges: boolean;
  anchorCompletion: boolean;
  grantUpdates: boolean;
}

interface CrossTenantGrant {
  tenant: string;
  status: 'active' | 'pending' | 'revoked';
  scope: string;
  grantedAt?: string;
  expiresAt?: string;
}

const toCrossTenantGrant = (g: GrantResource): CrossTenantGrant & { id: string } => ({
  id: g.id,
  tenant: g.targetTenant,
  status: g.status,
  scope: g.scope,
  grantedAt: g.grantedAt ?? undefined,
  expiresAt: g.expiresAt ?? undefined,
});

export default function AccountPage() {
  const router = useRouter();
  const { user, setUser } = useAuthContext();
  const queryClient = useQueryClient();
  const { active: activeStored, setActive } = useActiveToken();

  // ─── Server data ────────────────────────────────────────────────
  const { data: tokensPage } = useQuery({
    queryKey: ['v1.tokens'],
    queryFn: () => tokenService.list(),
    staleTime: 60_000,
  });
  const tokens = tokensPage?.items ?? [];

  const AVAILABLE_TOKENS: TokenChoice[] = useMemo(
    () =>
      tokens.map((t) => ({
        id: t.id,
        name: t.name,
        suffix: t.suffix,
        scope: formatScope(t),
      })),
    [tokens],
  );

  const { data: account } = useQuery({
    queryKey: ['v1.account'],
    queryFn: () => accountService.get(),
    staleTime: 60_000,
  });

  const { data: grants = [] } = useQuery({
    queryKey: ['v1.grants'],
    queryFn: () => grantService.list(),
    staleTime: 60_000,
  });

  // ─── Local state mirrored from server (so toggles feel instant) ─
  const [activeTokenId, setActiveTokenId] = useState<string>('');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    weeklyDigest: true,
    rateLimitWarnings: true,
    breakingChanges: true,
    anchorCompletion: false,
    grantUpdates: true,
  });
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('apa');
  const [autoCite, setAutoCite] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Seed local mirrors when the server payload arrives. The local-token
  // pick (from `useActiveToken`) wins for the topbar chip even before the
  // server round-trip lands, so the experience is snappy.
  useEffect(() => {
    if (!account) return;
    setNotifPrefs(account.notifications);
    setCitationFormat(account.citationFormat);
    setAutoCite(account.autoCite);
    if (!activeTokenId && account.activeTokenId) setActiveTokenId(account.activeTokenId);
  }, [account, activeTokenId]);

  useEffect(() => {
    if (!activeTokenId && activeStored.id) setActiveTokenId(activeStored.id);
  }, [activeStored.id, activeTokenId]);

  const activeToken = useMemo(
    () => AVAILABLE_TOKENS.find((t) => t.id === activeTokenId) ?? AVAILABLE_TOKENS[0] ?? {
      id: '',
      name: 'no token selected',
      suffix: '----',
      scope: 'pick one below',
    },
    [activeTokenId, AVAILABLE_TOKENS],
  );

  // ─── Mutations ──────────────────────────────────────────────────
  const patchAccount = useMutation({
    mutationFn: accountService.patch,
    onSuccess: (next) => {
      queryClient.setQueryData(['v1.account'], next);
    },
  });

  const requestGrant = useMutation({
    mutationFn: grantService.request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['v1.grants'] }),
  });

  const revokeGrant = useMutation({
    mutationFn: grantService.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['v1.grants'] }),
  });

  // ─── Handlers ───────────────────────────────────────────────────
  const handlePickActiveToken = (tokenId: string) => {
    setActiveTokenId(tokenId);
    // Local mirror: the id propagates immediately to the topbar chip + any
    // other consumer of `useActiveToken`. Plaintext is unchanged — picking
    // an existing token doesn't authenticate /v1/* calls until the user
    // (re)mints + saves the plaintext via the new-token dialog.
    setActive({ id: tokenId, plaintext: activeStored.plaintext });
    patchAccount.mutate({ activeTokenId: tokenId });
  };

  const togglePref = (key: keyof NotificationPrefs) => (checked: boolean) =>
    setNotifPrefs((cur) => ({ ...cur, [key]: checked }));

  const handleSavePrefs = () => {
    patchAccount.mutate(
      {
        notifications: notifPrefs,
        citationFormat,
        autoCite,
      },
      {
        onSuccess: () => {
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1500);
        },
      },
    );
  };

  const handleRevokeGrant = (grantId: string) => {
    if (!grantId) return;
    revokeGrant.mutate(grantId);
  };

  const handleRequestGrant = () => {
    // Minimal prompt-based flow; a proper modal is a future polish task.
    const targetTenant = window.prompt('Target tenant slug (e.g. esprit)');
    if (!targetTenant) return;
    const scope = window.prompt('Scope description');
    if (!scope) return;
    requestGrant.mutate({ targetTenant: targetTenant.trim(), scope: scope.trim() });
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ResearchAppShell crumbs={[{ label: 'Account' }]}>
      <div className="flex-1 min-w-0 overflow-y-auto no-scroll">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">
          <PageHeader />

          {/* Profile */}
          <Section
            icon={User}
            title="Profile"
            description="Your identity across the WeatherHub research portal."
            action={
              <Button variant="outline" size="xs">
                <Pencil size={11} strokeWidth={1.5} /> Edit
              </Button>
            }
          >
            <div className="flex items-start gap-4">
              <div
                aria-hidden
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-[#231a14] shrink-0"
                style={{ background: 'linear-gradient(135deg, oklch(0.72 0.14 50), oklch(0.68 0.16 38))' }}
              >
                {initials(user?.name)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1">
                <KV label="Name" value={user?.name ?? 'Chiheb Researcher'} />
                <KV label="Email" value={user?.email ?? 'chiheb@enit.utm.tn'} mono />
                <KV label="ORCID iD" value="0000-0002-1825-0097" mono href="https://orcid.org/0000-0002-1825-0097" />
                <KV label="Affiliation" value="ENIT · Tunis-Campus" />
              </div>
            </div>
          </Section>

          {/* Identity strip */}
          <Section icon={ShieldAlert} title="Identity">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
              <KV label="Role" value="Verified researcher" />
              <KV label="Joined" value="12 Sep 2024" mono />
              <KV label="Last sign-in" value="just now · this device" />
            </div>
          </Section>

          {/* Default active token */}
          <Section
            icon={Key}
            title="Default API session"
            description="Which token the topbar shows and the Playground sends with. Switch any time — your existing scripts use whatever token they were minted with."
            action={
              <Button variant="ghost" size="xs" onClick={() => router.push('/research/tokens')}>
                Manage tokens →
              </Button>
            }
          >
            <div className="flex flex-col gap-1.5">
              {AVAILABLE_TOKENS.map((token) => {
                const checked = token.id === activeTokenId;
                return (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => handlePickActiveToken(token.id)}
                    aria-pressed={checked}
                    className={[
                      'group/option flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-colors duration-150',
                      checked
                        ? 'bg-surface-2 border-border-hover'
                        : 'border-border-subtle hover:bg-surface-2 hover:border-border-hover',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{
                        boxShadow: checked
                          ? 'inset 0 0 0 2px var(--bg), inset 0 0 0 5px var(--accent-brand)'
                          : 'inset 0 0 0 1px var(--border-hover)',
                        background: checked ? 'var(--bg)' : 'var(--surface-2)',
                      }}
                    />
                    <Key size={13} strokeWidth={1.5} className="text-fg-subtle shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm text-fg truncate">{token.name}</span>
                      <span className="font-mono text-[11px] text-fg-subtle truncate">
                        wh_rsa_••••{token.suffix} · {token.scope}
                      </span>
                    </div>
                    {checked && (
                      <Chip tone="up" className="shrink-0">
                        active
                      </Chip>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-fg-subtle mt-2.5">
              Currently using <span className="font-mono text-fg-muted">{activeToken.name}</span>{' '}
              · <span className="font-mono text-fg-muted">wh_rsa_••••{activeToken.suffix}</span>.
              Choice is stored locally on this device.
            </p>
          </Section>

          {/* Cross-tenant grants */}
          <Section
            icon={Globe}
            title="Cross-tenant grants"
            description="Permissions other campuses have granted you. Required to query their stations from your tokens."
            action={
              <Button variant="outline" size="xs" onClick={handleRequestGrant}>
                Request grant
              </Button>
            }
          >
            <div className="flex flex-col">
              {grants.length === 0 && (
                <div className="py-3 text-xs text-fg-subtle text-center">
                  No grants requested yet.
                </div>
              )}
              {grants.map((raw, idx) => {
                const grant = toCrossTenantGrant(raw);
                return (
                <div
                  key={grant.id}
                  className={[
                    'flex items-start gap-3 py-2.5',
                    idx < grants.length - 1 ? 'border-b border-border-subtle' : '',
                  ].join(' ')}
                >
                  <GrantBadge status={grant.status} />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm text-fg">{grant.tenant}</span>
                    <span className="text-xs text-fg-muted truncate">{grant.scope}</span>
                    {grant.grantedAt && (
                      <span className="font-mono text-[10.5px] text-fg-subtle">
                        granted {grant.grantedAt}
                        {grant.expiresAt && ` · expires ${grant.expiresAt}`}
                      </span>
                    )}
                  </div>
                  {grant.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-fg-muted shrink-0"
                      onClick={() => handleRevokeGrant(grant.id)}
                    >
                      Revoke
                    </Button>
                  )}
                  {grant.status === 'pending' && (
                    <span className="font-mono text-[10.5px] text-fg-subtle shrink-0 pt-1">
                      awaiting admin
                    </span>
                  )}
                </div>
                );
              })}
            </div>
          </Section>

          {/* Notification preferences */}
          <Section
            icon={Bell}
            title="Notifications"
            description="Email preferences for the research portal. Operational alerts about your own stations live in the main settings page."
            action={
              savedFlash ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-sev-success">
                  <Check size={11} strokeWidth={2} />
                  saved
                </span>
              ) : (
                <Button variant="outline" size="xs" onClick={handleSavePrefs}>
                  Save preferences
                </Button>
              )
            }
          >
            <PrefRow
              label="Weekly usage digest"
              description="Summary of API calls, top endpoints, and quota use, every Monday."
              checked={notifPrefs.weeklyDigest}
              onCheckedChange={togglePref('weeklyDigest')}
            />
            <PrefRow
              label="Rate-limit warnings"
              description="Get a heads-up when a token crosses 80% of the daily quota."
              checked={notifPrefs.rateLimitWarnings}
              onCheckedChange={togglePref('rateLimitWarnings')}
            />
            <PrefRow
              label="API breaking-change notices"
              description="At least 60 days in advance, when an endpoint shape changes."
              checked={notifPrefs.breakingChanges}
              onCheckedChange={togglePref('breakingChanges')}
              recommended
            />
            <PrefRow
              label="Anchor batch completion"
              description="Notify each time a Merkle batch finishes anchoring on Hedera."
              checked={notifPrefs.anchorCompletion}
              onCheckedChange={togglePref('anchorCompletion')}
            />
            <PrefRow
              label="Cross-tenant grant updates"
              description="When a campus admin grants, revokes, or modifies access."
              checked={notifPrefs.grantUpdates}
              onCheckedChange={togglePref('grantUpdates')}
              last
            />
          </Section>

          {/* Citation defaults */}
          <Section
            icon={BookOpen}
            title="Citation defaults"
            description="How citations render on dataset cards + in CSV / JSON export headers."
          >
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CITATION_FORMATS.map((fmt) => {
                  const active = fmt.value === citationFormat;
                  return (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => setCitationFormat(fmt.value)}
                      aria-pressed={active}
                      className={[
                        'h-9 px-3 rounded-md text-sm border transition-colors duration-150',
                        active
                          ? 'bg-surface-2 text-fg border-border-hover'
                          : 'text-fg-muted border-border-subtle hover:bg-surface-2 hover:text-fg',
                      ].join(' ')}
                    >
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 rounded-md bg-surface-2 border border-border-inset">
                <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">Sample</span>
                <p className="font-mono text-[11.5px] text-fg-muted mt-1 leading-[1.5]">
                  {CITATION_FORMATS.find((f) => f.value === citationFormat)?.sample}
                </p>
              </div>
              <PrefRow
                label="Auto-cite on export"
                description="Prepend the citation as a CSV/JSON comment so downstream tools surface it."
                checked={autoCite}
                onCheckedChange={setAutoCite}
                last
              />
            </div>
          </Section>

          {/* Danger zone — destructive operations, walled off visually */}
          <HairlineCard
            className="p-4 flex flex-col gap-3"
            style={{ borderColor: 'color-mix(in oklch, var(--sev-critical) 30%, var(--border-subtle))' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} className="text-sev-critical" />
              <span className="text-sm font-semibold text-fg">Danger zone</span>
            </div>

            <DangerRow
              title="Export everything as JSON"
              description="A copy of your profile, tokens (masked), grants, saved datasets, and preferences."
              actionLabel={
                <>
                  <DownloadIcon size={11} strokeWidth={1.5} />
                  Request export
                </>
              }
            />
            <DangerRow
              title="Sign out of this device"
              description="Other devices keep their session. Tokens stay active until revoked."
              actionLabel={
                signingOut ? (
                  'Signing out…'
                ) : (
                  <>
                    <LogOut size={11} strokeWidth={1.5} />
                    Sign out
                  </>
                )
              }
              onAction={handleSignOut}
              actionDisabled={signingOut}
            />
            <DangerRow
              title="Delete this account"
              description="Revokes every token, removes your profile, releases any cross-tenant grants you hold. Tenant-owned data (stations, readings, batches) is unaffected."
              actionLabel="Delete account"
              destructive
              actionDisabled
            />
          </HairlineCard>
        </div>
      </div>
    </ResearchAppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline subcomponents
// ─────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Account</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Researcher profile, default session, grants, and notification settings.
        </span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <HairlineCard className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <Icon size={14} strokeWidth={1.5} className="text-fg-muted mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-fg">{title}</span>
          {description && <span className="text-xs text-fg-muted leading-[1.5]">{description}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="pt-1">{children}</div>
    </HairlineCard>
  );
}

function KV({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const content = (
    <span
      className={[
        'text-[13px]',
        mono ? 'font-mono text-fg' : 'text-fg',
        href ? 'underline decoration-fg-subtle hover:decoration-fg' : '',
      ].join(' ')}
    >
      {value}
    </span>
  );
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.06em] text-fg-subtle">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onCheckedChange,
  recommended,
  last,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  recommended?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-4 py-2.5',
        last ? '' : 'border-b border-border-subtle',
      ].join(' ')}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg">{label}</span>
          {recommended && (
            <span
              className="text-[9px] uppercase tracking-[0.06em] px-1.5 py-px rounded-sm"
              style={{
                color: 'var(--sev-success)',
                border: '1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)',
              }}
            >
              Recommended
            </span>
          )}
        </div>
        {description && <span className="text-[11px] text-fg-subtle leading-[1.5]">{description}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function GrantBadge({ status }: { status: CrossTenantGrant['status'] }) {
  const color =
    status === 'active'
      ? 'var(--sev-success)'
      : status === 'pending'
        ? 'var(--sev-warn)'
        : 'var(--sev-critical)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] mt-1.5 shrink-0"
      style={{ color }}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {status}
    </span>
  );
}

function DangerRow({
  title,
  description,
  actionLabel,
  destructive,
  onAction,
  actionDisabled,
}: {
  title: string;
  description: string;
  actionLabel: ReactNode;
  destructive?: boolean;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm text-fg">{title}</span>
        <span className="text-[11px] text-fg-muted leading-[1.5]">{description}</span>
      </div>
      <Button
        size="sm"
        variant={destructive ? 'destructive' : 'outline'}
        onClick={onAction}
        disabled={actionDisabled}
        className="shrink-0"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function initials(name?: string | null): string {
  if (!name) return 'YA';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'YA';
}
