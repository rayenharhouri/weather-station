'use client';

import Link from 'next/link';
import { Copy, GitBranch, ThumbsUp, ThumbsDown, RadioTower, ArrowRight, ArrowLeft } from 'lucide-react';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import { DocsNav } from '@/components/research/docs-nav';
import { CodePanel } from '@/components/research/code-panel';
import { Button } from '@/components/ui/button';
import { HairlineCard } from '@/components/ui/hairline-card';
import {
  Callout,
  DocsCode,
  DocsH2,
  ErrorRow,
  MethodBadge,
  ParamRow,
  SchemaRow,
} from '@/components/research/docs-primitives';

export default function ListReadingsDocPage() {
  return (
    <ResearchAppShell
      crumbs={[
        { label: 'Docs' },
        { label: 'Resources' },
        { label: 'Readings' },
      ]}
    >
      <DocsNav />
      <Article />
      <CodePanel />
    </ResearchAppShell>
  );
}

function Article() {
  const copyEndpoint = () => {
    void navigator.clipboard?.writeText('https://research.weatherhub.tn/v1/readings');
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-12 py-8 no-scroll">
      <div className="max-w-[620px] mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
              Resources · Readings
            </span>
            <span className="font-mono text-[11px] text-fg-subtle px-1.5 py-px rounded border border-border-subtle">
              v1
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-fg-subtle">
            <span>Updated 20 May 2026</span>
            <span className="w-px h-3 bg-border-subtle" />
            <Button variant="ghost" size="xs">
              <GitBranch size={11} strokeWidth={1.5} /> Edit
            </Button>
          </div>
        </div>

        {/* H1 */}
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-fg leading-tight">
          List readings
        </h1>
        <p className="mt-2.5 mb-4 text-sm text-fg-muted leading-[1.6] max-w-[62ch]">
          Returns a paginated list of sensor readings ordered by{' '}
          <DocsCode>recorded_at</DocsCode> descending. Supports filtering by station, metric,
          and time range. Use <DocsCode>cursor</DocsCode> to paginate beyond 1,000 records per
          call.
        </p>

        {/* Endpoint card */}
        <HairlineCard
          className="flex items-center gap-3 px-3.5 py-2.5"
          style={{ background: 'var(--surface-2)' }}
        >
          <MethodBadge method="GET" />
          <span className="font-mono text-[13px] text-fg flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            https://research.weatherhub.tn/v1/readings
          </span>
          <button
            type="button"
            onClick={copyEndpoint}
            aria-label="Copy endpoint URL"
            className="w-5.5 h-5.5 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg transition-colors"
          >
            <Copy size={11} strokeWidth={1.5} />
          </button>
        </HairlineCard>

        {/* Authentication */}
        <DocsH2 id="auth">Authentication</DocsH2>
        <p className="mb-3 text-sm text-fg-muted leading-[1.6]">
          All requests require a bearer token. Pass it in the{' '}
          <DocsCode>Authorization</DocsCode> header. Tokens are managed in your{' '}
          <Link href="/research/tokens" className="text-accent-brand hover:underline">
            Tokens
          </Link>{' '}
          page.
        </p>

        {/* Query parameters */}
        <DocsH2 id="params">Query parameters</DocsH2>
        <HairlineCard className="overflow-hidden">
          <ParamRow name="station" type="string · array" defaultValue="home tenant">
            One or more station IDs (comma-separated). Cross-tenant station IDs require an
            active grant from the owning tenant&apos;s admin.
          </ParamRow>
          <ParamRow name="metric" type="enum">
            One of{' '}
            <DocsCode>temperature, humidity, pressure, rainfall, light, aqi, battery, rssi</DocsCode>.
          </ParamRow>
          <ParamRow name="since" type="ISO 8601" defaultValue="24h ago">
            Lower bound on <DocsCode>recorded_at</DocsCode>, inclusive. Maximum window is
            30 days.
          </ParamRow>
          <ParamRow name="until" type="ISO 8601" defaultValue="now">
            Upper bound on <DocsCode>recorded_at</DocsCode>, exclusive.
          </ParamRow>
          <ParamRow name="interval" type="enum">
            Aggregation window: <DocsCode>1m, 5m, 15m, 1h, 1d</DocsCode>. When set, returns
            mean-aggregated readings instead of raw points.
          </ParamRow>
          <ParamRow name="limit" type="integer" defaultValue="100">
            Page size. Max 1,000.
          </ParamRow>
          <ParamRow name="cursor" type="string">
            Opaque pagination cursor returned by a previous call.
          </ParamRow>
        </HairlineCard>

        {/* Returns */}
        <DocsH2 id="returns">Returns</DocsH2>
        <p className="mb-3 text-sm text-fg-muted leading-[1.6]">
          <span style={{ color: 'var(--sev-success)' }}>200 OK</span> — an object with a{' '}
          <DocsCode>data</DocsCode> array and <DocsCode>next_cursor</DocsCode> for pagination.
        </p>
        <HairlineCard className="overflow-hidden">
          <SchemaRow name="data" type="object[]">
            List of readings.
          </SchemaRow>
          <SchemaRow name="id" type="string" indent={1}>
            Unique reading identifier (cross-batch stable).
          </SchemaRow>
          <SchemaRow name="station_id" type="string" indent={1}>
            Station identifier (tenant-scoped).
          </SchemaRow>
          <SchemaRow name="sensor_id" type="string" indent={1}>
            Sensor identifier on the station.
          </SchemaRow>
          <SchemaRow name="metric" type="enum" indent={1}>
            Metric type (see <DocsCode>metric</DocsCode> param above).
          </SchemaRow>
          <SchemaRow name="value" type="number" indent={1}>
            Reading value in <DocsCode>unit</DocsCode>.
          </SchemaRow>
          <SchemaRow name="unit" type="string" indent={1}>
            SI unit. e.g. <DocsCode>celsius</DocsCode>, <DocsCode>hPa</DocsCode>.
          </SchemaRow>
          <SchemaRow name="recorded_at" type="ISO 8601" indent={1}>
            Reading timestamp, millisecond precision.
          </SchemaRow>
          <SchemaRow name="merkle_anchor" type="string" indent={1}>
            Batch ID this reading is anchored in. <DocsCode>null</DocsCode> if unanchored (less
            than 1h old).
          </SchemaRow>
          <SchemaRow name="next_cursor" type="string">
            Pass to a subsequent call to retrieve the next page.{' '}
            <DocsCode>null</DocsCode> when no more results.
          </SchemaRow>
        </HairlineCard>

        {/* Cross-tenant callout */}
        <div className="mt-6">
          <Callout kind="warn" title="Cross-tenant access" icon={RadioTower}>
            Querying stations outside your home tenant requires an explicit grant from the
            owning tenant&apos;s admin. Active and pending grants are visible on your{' '}
            <Link href="/research/tokens" className="text-accent-brand hover:underline">
              Tokens
            </Link>{' '}
            page. Without a grant, cross-tenant station IDs return{' '}
            <DocsCode>403 cross_tenant_denied</DocsCode>.
          </Callout>
        </div>

        {/* Rate limits */}
        <DocsH2 id="rate-limits">Rate limits</DocsH2>
        <p className="mb-3 text-sm text-fg-muted leading-[1.6]">
          Each bearer token is limited to{' '}
          <span className="font-mono text-fg">60 req/min</span> and{' '}
          <span className="font-mono text-fg">10,000 req/day</span>. Current usage is returned
          in <DocsCode>X-RateLimit-*</DocsCode> response headers; exceeded limits return{' '}
          <DocsCode>429 rate_limited</DocsCode> with a <DocsCode>Retry-After</DocsCode> header.
        </p>

        {/* Errors */}
        <DocsH2 id="errors">Errors</DocsH2>
        <HairlineCard className="overflow-hidden">
          <ErrorRow code={401} name="invalid_token">
            Authorization header missing, malformed, or token revoked.
          </ErrorRow>
          <ErrorRow code={403} name="cross_tenant_denied">
            No active grant for one or more requested stations.
          </ErrorRow>
          <ErrorRow code={422} name="invalid_params">
            Unrecognized or malformed parameter (see <DocsCode>details</DocsCode>).
          </ErrorRow>
          <ErrorRow code={429} name="rate_limited">
            Per-token request rate exceeded.
          </ErrorRow>
          <ErrorRow code={500} name="upstream_unavailable">
            Sensor database temporarily unreachable. Retry with backoff.
          </ErrorRow>
        </HairlineCard>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between pt-4 pb-2 border-t border-border-subtle flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-fg-muted">
            <span>Was this page helpful?</span>
            <Button variant="outline" size="xs">
              <ThumbsUp size={11} strokeWidth={1.5} /> Yes
            </Button>
            <Button variant="outline" size="xs">
              <ThumbsDown size={11} strokeWidth={1.5} /> No
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/research/docs/stations"
              className="text-fg-muted hover:text-fg inline-flex items-center gap-1"
            >
              <ArrowLeft size={11} strokeWidth={1.5} /> Stations
            </Link>
            <Link
              href="/research/docs/readings/get"
              className="text-accent-brand hover:underline inline-flex items-center gap-1"
            >
              Get reading <ArrowRight size={11} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
