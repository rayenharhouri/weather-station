import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The single allowed animated indicator per view. State controls the colour
 * and disables the pulse for non-streaming states.
 *
 *   - "live"     pulses green (default)
 *   - "warn"     static yellow (reconnecting / degraded)
 *   - "offline"  static red (disconnected)
 *
 * The animation itself is defined in app/globals.css and respects
 * prefers-reduced-motion.
 */
export type LiveState = 'live' | 'warn' | 'offline';

export interface LiveDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  state?: LiveState;
}

export const LiveDot = React.forwardRef<HTMLSpanElement, LiveDotProps>(
  function LiveDot({ className, state = 'live', ...props }, ref) {
    return (
      <span
        ref={ref}
        data-slot="live-dot"
        data-state={state}
        aria-hidden="true"
        className={cn(
          'live-dot',
          state === 'warn' && 'warn',
          state === 'offline' && 'offline',
          className,
        )}
        {...props}
      />
    );
  },
);
