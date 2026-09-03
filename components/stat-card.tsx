'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
}

const colorClasses: Record<NonNullable<StatCardProps['color']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent/10 text-accent',
};

const glowClasses: Record<NonNullable<StatCardProps['color']>, string> = {
  primary: 'hover:shadow-glow-primary',
  success: 'hover:shadow-glow-success',
  warning: 'hover:shadow-glow-warning',
  destructive: '',
  accent: 'hover:shadow-glow-warning',
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'primary' }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden transition-all duration-300 hover:-translate-y-0.5', glowClasses[color])}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 hover:scale-105', colorClasses[color])}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="font-heading text-3xl font-bold tabular-nums">{value}</span>
          {trend && (
            <span className={cn('text-xs font-medium', trendUp ? 'text-success' : 'text-destructive')}>
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
