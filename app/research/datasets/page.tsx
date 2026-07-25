'use client';

import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { ResearchAppShell } from '@/components/research/research-app-shell';
import {
  DatasetCard,
  type Dataset,
  type DatasetFormat,
  type DatasetMetric,
  type DatasetVisibility,
} from '@/components/research/dataset-card';
import {
  datasetService,
  type DatasetResource,
} from '@/services/api';

type Tab = 'public' | 'private' | 'shared' | 'all';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Your saves' },
  { value: 'shared', label: 'Shared with you' },
  { value: 'all', label: 'All' },
];

const KNOWN_METRICS: DatasetMetric[] = [
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
  'light',
  'aqi',
  'multi',
];

const toCardDataset = (d: DatasetResource): Dataset => ({
  id: d.id,
  title: d.title,
  description: d.description,
  visibility: d.visibility,
  // Backend metric is free-form; fall back to `multi` so the card's color
  // map always has a known key to look up.
  metric: (KNOWN_METRICS as readonly string[]).includes(d.metric)
    ? (d.metric as DatasetMetric)
    : 'multi',
  stationName: d.stationName,
  windowStart: d.windowStart,
  windowEnd: d.windowEnd,
  recordCount: d.recordCount,
  sizeBytes: d.sizeBytes,
  formats: d.formats,
  updatedAt: d.updatedAt,
  citation: d.citation ?? undefined,
  playgroundHref: d.playgroundHref ?? undefined,
});

export default function DatasetsPage() {
  const [tab, setTab] = useState<Tab>('public');
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['v1.datasets'],
    queryFn: () => datasetService.list(),
    staleTime: 60_000,
  });

  // Filter client-side so tab + search switches feel instant. The list is
  // capped at 200 rows by the backend, so this is cheap.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((d) => {
        if (tab !== 'all' && d.visibility !== (tab as DatasetVisibility)) return false;
        if (!term) return true;
        return (
          d.title.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term) ||
          d.stationName.toLowerCase().includes(term)
        );
      })
      .map(toCardDataset);
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const c = { public: 0, private: 0, shared: 0, all: rows.length };
    for (const d of rows) c[d.visibility]++;
    return c;
  }, [rows]);

  const handleDownload = (id: string, format: DatasetFormat) => {
    // Phase 3.4's exports module owns materialised downloads. The dataset
    // endpoint serves a metadata-CSV stub for now; we open it in a new tab
    // so the click is observably wired without a download library.
    const href = `${datasetService.downloadHref(id)}?format=${format}`;
    window.open(href, '_blank', 'noopener');
  };

  return (
    <ResearchAppShell crumbs={[{ label: 'Datasets' }]}>
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5 gap-4 overflow-hidden">
        <PageHeader />

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

          <label className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border-subtle text-fg-subtle hover:border-border-hover focus-within:border-border-hover transition-colors w-72">
            <Search size={13} strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search datasets…"
              className="flex-1 bg-transparent border-0 outline-none text-sm text-fg placeholder:text-fg-subtle"
            />
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 no-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-fg-muted">
              Loading datasets…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} hasSearch={Boolean(search.trim())} />
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-4">
              {filtered.map((d) => (
                <DatasetCard key={d.id} dataset={d} onDownload={handleDownload} />
              ))}
            </div>
          )}
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
          <h1 className="text-xl font-semibold text-fg tracking-tight">Datasets</h1>
          <Chip>v1</Chip>
        </div>
        <span className="text-xs text-fg-subtle">
          Public reference data, your own saved queries, and datasets your collaborators
          have shared. All citable, all exportable.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Plus size={13} strokeWidth={1.5} />
          New from playground
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ tab, hasSearch }: { tab: Tab; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-fg-muted">
        No datasets match the search.
      </div>
    );
  }
  if (tab === 'private') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-1 text-center">
        <span className="text-sm text-fg-muted">No saved queries yet.</span>
        <span className="text-xs text-fg-subtle">
          Run a query in the Playground and click <span className="font-mono">Save</span> to add
          it here.
        </span>
      </div>
    );
  }
  if (tab === 'shared') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-1 text-center">
        <span className="text-sm text-fg-muted">Nothing shared with you yet.</span>
        <span className="text-xs text-fg-subtle">
          When a collaborator shares a dataset, it'll show up here with their citation.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-20 text-sm text-fg-muted">
      No datasets to show.
    </div>
  );
}
