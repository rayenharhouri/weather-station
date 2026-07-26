import * as React from 'react';
import { cn } from '@/lib/utils';

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
