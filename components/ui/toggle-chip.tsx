'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Multi-select chip — used as a metric selector on the Analytics page.
 * Active state uses the metric's own colour as a 2px left bar; inactive is
 * a regular hairline chip.
 */
export interface ToggleChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  active: boolean;
  color?: string;
  icon?: React.ReactNode;
}

export const ToggleChip = React.forwardRef<HTMLButtonElement, ToggleChipProps>(
  function ToggleChip({ className, active, color, icon, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={active}
        className={cn(
          'group/chip relative inline-flex items-center gap-1.5 h-7 px-2.5',
          'text-sm font-medium rounded-md transition-colors duration-150',
          'border focus-visible:outline-2 focus-visible:outline-accent-brand focus-visible:outline-offset-2',
          active
            ? 'text-fg border-border-hover bg-surface-2'
            : 'text-fg-muted border-border-subtle hover:text-fg hover:border-border-hover',
          className,
        )}
        {...props}
      >
        {active && color && (
          <span
            aria-hidden
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-sm"
            style={{ background: color }}
          />
        )}
        {icon && <span className="flex" style={{ color }}>{icon}</span>}
        <span>{children}</span>
      </button>
    );
  },
);
