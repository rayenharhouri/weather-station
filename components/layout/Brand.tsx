'use client';

import React from 'react';
import { CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const sizes = {
  sm: { box: 'w-9 h-9', icon: 'w-5 h-5', title: 'text-sm', subtitle: 'text-[10px]' },
  md: { box: 'w-10 h-10', icon: 'w-6 h-6', title: 'text-base', subtitle: 'text-[11px]' },
  lg: { box: 'w-12 h-12', icon: 'w-7 h-7', title: 'text-lg', subtitle: 'text-[11px]' },
} as const;

export const Brand: React.FC<BrandProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'ENIT Campus',
  className,
}) => {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3 group', className)}>
      <div className="relative shrink-0">
        <div
          className={cn(
            'rounded-xl bg-gradient-to-br from-sky to-sky-deep flex items-center justify-center shadow-lg shadow-sky-deep/30',
            s.box,
          )}
        >
          <CloudSun className={cn('text-white', s.icon)} strokeWidth={2.2} />
        </div>
        <div className="absolute inset-0 rounded-xl bg-sky/40 blur-xl opacity-60 -z-10 group-hover:opacity-100 transition-opacity" />
      </div>

      {showText && (
        <div className="min-w-0">
          <h1
            className={cn(
              'font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight',
              s.title,
            )}
          >
            WeatherHub
          </h1>
          <p className={cn('text-muted-foreground tracking-wide uppercase', s.subtitle)}>
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
};
