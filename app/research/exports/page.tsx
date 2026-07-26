'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  RotateCw,
  Trash2,
  Copy,
  Inbox,
} from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import { exportService, type ExportResource } from '@/services/api';

type Tab = 'active' | 'ready' | 'failed' | 'all';
type ExportStatus = 'queued' | 'running' | 'ready' | 'failed' | 'expired';
type ExportFormat = 'csv' | 'json' | 'parquet';

interface ExportJob {
  id: string;
  name: string;
  metric: string;
  stationName: string;
  windowStart: string;
  windowEnd: string;
  format: ExportFormat;
  status: ExportStatus;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  recordCount: number | null;
  sizeBytes: number | null;
  progressPct: number;
  errorMessage: string | null;
}

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
  { value: 'all', label: 'All' },
];

const METRIC_COLOR: Record<string, string> = {
  temperature: 'var(--m-temp)',
  humidity: 'var(--m-humidity)',
  pressure: 'var(--m-pressure)',
  rainfall: 'var(--m-rainfall)',
  light: 'var(--m-light)',
  aqi: 'var(--m-aqi)',
  'multi-metric': 'var(--fg-muted)',
};

export default function ExportsPage() {
  const [tab, setTab] = useState<Tab>('active');
  const queryClient = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ['v1.exports'],
    queryFn: () => exportService.list(),
    refetchInterval: (q) => {
      const data = q.state.data as ExportResource[] | undefined;
      const hasActive = data?.some((j) => j.status === 'queued' || j.status === 'running');
      return hasActive ? 3_000 : 30_000;
    },
  });

  const jobs: ExportJob[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        metric: r.metric,
        stationName: r.stationName,
        windowStart: r.windowStart,
        windowEnd: r.windowEnd,
        format: r.format,
        status: r.status,
        requestedAt: r.requestedAt,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        expiresAt: r.expiresAt,
        recordCount: r.recordCount,
        sizeBytes: r.sizeBytes,
        progressPct: r.progressPct,
        errorMessage: r.errorMessage,
      })),
    [rows],
  );

  const counts = useMemo(() => {
    const c = { active: 0, ready: 0, failed: 0, all: jobs.length };
    for (const j of jobs) {
      if (j.status === 'queued' || j.status === 'running') c.active++;
      else if (j.status === 'ready') c.ready++;
      else if (j.status === 'failed') c.failed++;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    if (tab === 'all') return jobs;
    if (tab === 'active') return jobs.filter((j) => j.status === 'queued' || j.status === 'running');
    if (tab === 'ready') return jobs.filter((j) => j.status === 'ready');
    if (tab === 'failed') return jobs.filter((j) => j.status === 'failed');
    return jobs;
  }, [jobs, tab]);

  const monthCount = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return jobs.filter((j) => new Date(j.requestedAt).valueOf() >= start.valueOf()).length;
  }, [jobs]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['v1.exports'] });

  const retryMutation = useMutation({
    mutationFn: async (job: ExportJob) =>
      exportService.create({
        name: job.name,
        metric: job.metric,
        stationName: job.stationName,
        windowStart: job.windowStart,
        windowEnd: job.windowEnd,
        format: job.format,
      }),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => exportService.cancel(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => exportService.delete(id),
    onSuccess: invalidate,
  });

  const handleRetry = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job) retryMutation.mutate(job);
  };

  const handleCancel = (id: string) => cancelMutation.mutate(id);

  const handleDelete = (id: string) => deleteMutation.mutate(id);

  return (
    <ResearchAppShell crumbs={[{ label: 'Exports' }]}>
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5 gap-4 overflow-hidden">
        <PageHeader />

        {/* KPI strip */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Kpi icon={Loader2} label="Running" value={String(jobs.filter((j) => j.status === 'running').length)} tone="info" />
          <Kpi icon={Clock} label="Queued" value={String(jobs.filter((j) => j.status === 'queued').length)} />
          <Kpi icon={CheckCircle2} label="Ready" value={String(counts.ready)} tone="success" sub="downloads expire after 7 days" />
          <Kpi icon={Download} label="This month" value={String(monthCount)} sub="exports requested" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={setTab}
            options={TABS.map((t) => ({ value: t.value, label: t.label, badge: counts[t.value] }))}
          />
        </div>

        {/* Job list */}
        {filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <HairlineCard className="flex-1 min-h-0 overflow-y-auto no-scroll">
            <TableHead />
            <div>
              {filtered.map((j, i) => (
                <div key={j.id}>
                  <ExportJobRow
                    job={j}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                  />
                  {i < filtered.length - 1 && <div className="hairline" />}
                </div>
              ))}
            </div>
          </HairlineCard>
        )}

        <div className="text-[11px] text-fg-subtle leading-[1.5]">
          Exports under ~50,000 rows run client-side directly from the Playground. Larger
          queries land here as async jobs; downloads stay available for 7 days then expire.
        </div>
      </div>
    </ResearchAppShell>
  );
}

function PageHeader() {
  return (
    <div className="flex items-end justify-between flex-wrap gap-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Exports</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Async exports of bulk queries — CSV, JSON, and Parquet. Each job carries its query so
          you can re-run or share.
        </span>
      </div>
      <Button size="sm">
        <Plus size={13} strokeWidth={1.5} /> New export
      </Button>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: 'success' | 'info';
}) {
  const iconColor =
    tone === 'success' ? 'var(--sev-success)' : tone === 'info' ? 'var(--accent-brand)' : 'var(--fg-muted)';
  return (
    <HairlineCard className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-1.5">
        <Icon size={14} strokeWidth={1.5} style={{ color: iconColor }} />
        <span className="text-xs font-medium text-fg-muted">{label}</span>
      </div>
      <span className="font-mono text-2xl text-fg tabular-nums leading-none tracking-[-0.01em]">{value}</span>
      {sub && <span className="text-[11px] text-fg-subtle">{sub}</span>}
    </HairlineCard>
  );
}

function TableHead() {
  return (
    <div
      className="grid gap-3 px-4 py-2.5 border-b border-border-subtle text-[10px] uppercase tracking-[0.06em] text-fg-subtle"
      style={{ gridTemplateColumns: 'minmax(220px, 1.8fr) 100px minmax(220px, 1.4fr) 110px 32px' }}
    >
      <span>Job · query</span>
      <span>Format</span>
      <span>Status · progress</span>
      <span className="text-right">Records · size</span>
      <span></span>
    </div>
  );
}

function ExportJobRow({
  job,
  onRetry,
  onCancel,
  onDelete,
}: {
  job: ExportJob;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="grid gap-3 items-center px-4 py-3 hover:bg-surface-2 transition-colors duration-150"
      style={{ gridTemplateColumns: 'minmax(220px, 1.8fr) 100px minmax(220px, 1.4fr) 110px 32px' }}
    >
      {/* Job + query */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className="w-1.5 h-7 rounded-sm shrink-0"
          style={{ background: METRIC_COLOR[job.metric] ?? 'var(--fg-muted)' }}
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm text-fg truncate">{job.name}</span>
          <span className="font-mono text-[11px] text-fg-subtle truncate">
            {job.stationName} · {formatDateShort(job.windowStart)} – {formatDateShort(job.windowEnd)}
          </span>
        </div>
      </div>

      {/* Format */}
      <span className="font-mono text-[11px] px-1.5 py-px rounded-sm bg-surface-2 border border-border-subtle text-fg-muted uppercase w-fit">
        {job.format}
      </span>

      {/* Status + progress */}
      <StatusCell job={job} />

      {/* Records + size */}
      <div className="flex flex-col items-end gap-0.5">
        {job.recordCount != null ? (
          <>
            <span className="font-mono text-xs text-fg tabular-nums">
              {job.recordCount.toLocaleString()}
            </span>
            <span className="font-mono text-[10.5px] text-fg-subtle tabular-nums">
              {job.sizeBytes != null ? formatBytes(job.sizeBytes) : ''}
            </span>
          </>
        ) : (
          <span className="font-mono text-[11px] text-fg-subtle">—</span>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${job.name}`} />}
        >
          <MoreHorizontal size={14} strokeWidth={1.5} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {job.status === 'ready' && job.expiresAt && (
            <>
              <DropdownMenuItem onSelect={() => downloadStub(job)}>
                <Download size={13} strokeWidth={1.5} />
                <span>Download {job.format.toUpperCase()}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(downloadUrl(job))}>
                <Copy size={13} strokeWidth={1.5} />
                <span>Copy direct URL</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {(job.status === 'failed' || job.status === 'ready' || job.status === 'expired') && (
            <DropdownMenuItem onSelect={() => onRetry(job.id)}>
              <RotateCw size={13} strokeWidth={1.5} />
              <span>Run again</span>
            </DropdownMenuItem>
          )}
          {(job.status === 'running' || job.status === 'queued') && (
            <DropdownMenuItem onSelect={() => onCancel(job.id)}>
              <span className="text-sev-warn inline-flex items-center gap-2">
                <XCircle size={13} strokeWidth={1.5} />
                Cancel job
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onDelete(job.id)}>
            <span className="text-sev-critical inline-flex items-center gap-2">
              <Trash2 size={13} strokeWidth={1.5} />
              Delete
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function StatusCell({ job }: { job: ExportJob }) {
  if (job.status === 'queued') {
    return (
      <div className="flex flex-col gap-1">
        <StatusPill status={job.status} />
        <span className="text-[10.5px] text-fg-subtle">
          Queued {formatRelative(job.requestedAt)}
        </span>
      </div>
    );
  }
  if (job.status === 'running') {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Loader2
            size={11}
            strokeWidth={2}
            className="animate-spin shrink-0"
            style={{ color: 'var(--accent-brand)' }}
          />
          <span className="text-[10.5px] uppercase tracking-[0.06em] text-fg" style={{ color: 'var(--accent-brand)' }}>
            running
          </span>
          <span className="font-mono text-[10.5px] text-fg-subtle ml-auto tabular-nums">
            {job.progressPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-1 rounded-sm bg-surface-2 border border-border-inset overflow-hidden">
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${job.progressPct}%`, background: 'var(--accent-brand)', opacity: 0.9 }}
          />
        </div>
      </div>
    );
  }
  if (job.status === 'ready') {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status="ready" />
          <Button
            size="xs"
            variant="outline"
            onClick={() => downloadStub(job)}
            className="ml-auto"
          >
            <Download size={11} strokeWidth={1.5} />
            Download
          </Button>
        </div>
        <span className="text-[10.5px] text-fg-subtle">
          {job.finishedAt && <>Finished {formatRelative(job.finishedAt)} · </>}
          {job.expiresAt && <>expires {formatRelative(job.expiresAt, 'future')}</>}
        </span>
      </div>
    );
  }
  if (job.status === 'failed') {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <StatusPill status="failed" />
          <AlertTriangle size={11} strokeWidth={1.5} className="text-sev-critical" />
        </div>
        <span className="text-[10.5px] text-sev-critical truncate" title={job.errorMessage ?? ''}>
          {job.errorMessage ?? 'Job failed.'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <StatusPill status="expired" />
      <span className="text-[10.5px] text-fg-subtle">
        Available {job.finishedAt ? formatRelative(job.finishedAt) : '—'}, expired.
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: ExportStatus }) {
  const config: Record<ExportStatus, { color: string; label: string; Icon: typeof CheckCircle2 | null }> = {
    queued: { color: 'var(--fg-muted)', label: 'queued', Icon: Clock },
    running: { color: 'var(--accent-brand)', label: 'running', Icon: null },
    ready: { color: 'var(--sev-success)', label: 'ready', Icon: CheckCircle2 },
    failed: { color: 'var(--sev-critical)', label: 'failed', Icon: XCircle },
    expired: { color: 'var(--fg-subtle)', label: 'expired', Icon: null },
  };
  const { color, label, Icon } = config[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.06em]"
      style={{ color }}
    >
      {Icon && <Icon size={10} strokeWidth={2} />}
      {label}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  if (tab === 'active') {
    return (
      <HairlineCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Inbox size={20} strokeWidth={1.5} className="text-fg-subtle" />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-fg">No active exports.</span>
          <span className="text-xs text-fg-subtle max-w-[28rem]">
            Trigger a bulk export from the Playground response panel — anything over ~50,000
            rows runs here and pings you when it's ready.
          </span>
        </div>
      </HairlineCard>
    );
  }
  if (tab === 'ready') {
    return (
      <HairlineCard className="flex items-center justify-center py-12">
        <span className="text-sm text-fg-muted">No ready exports.</span>
      </HairlineCard>
    );
  }
  if (tab === 'failed') {
    return (
      <HairlineCard className="flex items-center justify-center py-12">
        <span className="text-sm text-fg-muted">No failed exports — nice.</span>
      </HairlineCard>
    );
  }
  return (
    <HairlineCard className="flex items-center justify-center py-12">
      <span className="text-sm text-fg-muted">No export jobs yet.</span>
    </HairlineCard>
  );
}

function downloadUrl(job: ExportJob): string {
  return exportService.downloadHref(job.id);
}

function downloadStub(job: ExportJob): void {
  if (typeof window === 'undefined') return;
  void streamingDownload(job);
}

async function streamingDownload(job: ExportJob): Promise<void> {
  try {
    const blob = await exportService.downloadBlob(job.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.name.replace(/[^a-z0-9-]+/gi, '_').toLowerCase()}.${job.format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[exports] download failed', err);
    window.alert('Download failed. The token may have expired or the export was cleaned up.');
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatRelative(iso: string, mode: 'past' | 'future' = 'past'): string {
  const t = new Date(iso).valueOf();
  if (Number.isNaN(t)) return '—';
  const deltaSec = mode === 'past' ? Math.floor((Date.now() - t) / 1000) : Math.floor((t - Date.now()) / 1000);
  if (deltaSec < 0) return mode === 'future' ? 'expired' : 'just now';
  if (deltaSec < 60) return mode === 'past' ? `${deltaSec}s ago` : `in ${deltaSec}s`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return mode === 'past' ? `${min}m ago` : `in ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return mode === 'past' ? `${hr}h ago` : `in ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return mode === 'past' ? `${day}d ago` : `in ${day}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

