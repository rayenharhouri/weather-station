'use client';

import * as React from 'react';

export interface SegmentedTabsOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

export interface SegmentedTabsProps<T extends string> {
  value: T;
  options: SegmentedTabsOption<T>[];
  onChange: (value: T) => void;
  size?: 'xs' | 'sm';
  className?: string;
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  size = 'sm',
  className,
}: SegmentedTabsProps<T>) {
  const h = size === 'xs' ? 'h-6' : 'h-7';
  const text = size === 'xs' ? 'text-xs' : 'text-sm';
  return (
    <div
      role="tablist"
      className={[
        'inline-flex border border-border-subtle rounded-md p-0.5 gap-0.5',
        className ?? '',
      ].join(' ')}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              h,
              text,
              'inline-flex items-center gap-1.5 px-2.5 rounded-sm font-medium transition-colors duration-150',
              active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            ].join(' ')}
          >
            {opt.label}
            {opt.badge != null && (
              <span
                className={[
                  'inline-flex items-center justify-center font-mono text-[10px] tabular-nums',
                  'min-w-[1.25rem] h-4 px-1 rounded-sm',
                  active
                    ? 'bg-bg text-fg-muted border border-border-subtle'
                    : 'bg-surface-2 text-fg-muted border border-border-subtle',
                ].join(' ')}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
