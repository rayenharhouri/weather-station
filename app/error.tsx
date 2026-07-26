'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HairlineCard } from '@/components/ui/hairline-card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error] caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <HairlineCard className="max-w-md w-full p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-fg">
          <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--sev-critical)' }} />
          <span className="text-sm font-medium">Something broke</span>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">
          The page hit an unexpected error. The failure has been logged on the server. Try
          reloading; if it keeps happening, share the reference below with support.
        </p>
        {error.digest && (
          <div className="font-mono text-[11px] text-fg-subtle bg-surface-2 border border-border-subtle rounded-sm px-2 py-1.5">
            ref: {error.digest}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            <RotateCw size={13} strokeWidth={1.5} />
            Try again
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
          >
            Back to dashboard
          </Button>
        </div>
      </HairlineCard>
    </div>
  );
}
