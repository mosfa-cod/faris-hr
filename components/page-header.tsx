'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient-primary">{title}</h1>
        {description && <p className="mt-1.5 text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
