'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-end justify-between flex-wrap gap-3 px-1', className)}>
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
};
