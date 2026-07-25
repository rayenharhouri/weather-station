import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Inline mono pill — small status / delta badge used inside cards and rows.
 * Variants colour-code direction:
 *   - up      = success green (delta increased)
 *   - down    = danger red (delta decreased)
 *   - flat    = subtle grey (no change)
 *   - default = muted (neutral content)
 */
type ChipTone = 'default' | 'up' | 'down' | 'flat';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

const toneClass: Record<ChipTone, string> = {
  default: 'text-fg-muted',
  up: 'text-sev-success',
  down: 'text-sev-critical',
  flat: 'text-fg-subtle',
};

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  function Chip({ className, tone = 'default', ...props }, ref) {
    return (
      <span
        ref={ref}
        data-slot="chip"
        className={cn(
          'inline-flex items-center gap-1 font-mono text-xs tabular-nums',
          'px-1.5 py-px bg-surface-2 border border-border-subtle rounded-sm',
          'tracking-[0.01em]',
          toneClass[tone],
          className,
        )}
        {...props}
      />
    );
  },
);
