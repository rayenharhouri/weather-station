import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Hairline card — the flight-deck card. Surface is the same colour as the
 * page; separation is carried by a hairline border. No fills, no shadows.
 *
 * Pair with `interactive` when the whole card is clickable; the border will
 * brighten on hover via `--border-hover`.
 */
export interface HairlineCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  as?: React.ElementType;
}

export const HairlineCard = React.forwardRef<HTMLDivElement, HairlineCardProps>(
  function HairlineCard({ className, interactive, as: As = 'div', ...props }, ref) {
    return (
      <As
        ref={ref}
        data-slot="hairline-card"
        className={cn(
          'bg-bg border border-border-subtle rounded-lg transition-colors duration-150',
          interactive && 'hover:border-border-hover cursor-pointer',
          className,
        )}
        {...props}
      />
    );
  },
);
