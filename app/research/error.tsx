'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HairlineCard } from '@/components/ui/hairline-card';

/**
 * Research-portal scoped error boundary. Renders in place of the route
 * content but leaves the research shell (sidebar + topbar) intact, so the
 * user can navigate to another page without a full reload.
 *
 * Most crashes here are either:
 *   - the user has no active API token, so a /v1/* call 401'd; or
 *   - the backend returned an unexpected shape (schema validation throw).
 * Either is recoverable by retrying or going to the Account page.
 */
export default function ResearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[research/error] caught:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <HairlineCard className="max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-fg">
          <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--sev-critical)' }} />
          <span className="text-sm font-medium">Couldn't load this page</span>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">
          A /v1/* call failed or returned an unexpected response. If you haven't picked an
          active API token yet, do that on the Account page first.
        </p>
        {error.digest && (
          <div className="font-mono text-[11px] text-fg-subtle bg-surface-2 border border-border-subtle rounded-sm px-2 py-1.5">
            ref: {error.digest}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            <RotateCw size={13} strokeWidth={1.5} />
            Retry
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = '/research/account';
            }}
          >
            Open Account
          </Button>
        </div>
      </HairlineCard>
    </div>
  );
}
