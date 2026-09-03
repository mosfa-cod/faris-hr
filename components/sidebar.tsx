'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { useAuth } from '@/lib/auth-context';
import { hasCompanyPermission, hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { COMPANY_ROLE_LABELS } from '@/lib/types';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { companyRole, role, company } = useAuth();

  const items = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (companyRole) return hasCompanyPermission(companyRole, item.permission);
    if (role) return hasPermission(role, item.permission);
    return true;
  });

  return (
    <aside className="flex h-full w-64 flex-col border-l border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-primary">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-sm font-bold leading-tight">نظام فارس دحروج</span>
          <span className="text-[11px] text-muted-foreground">Faris HR — SaaS</span>
        </div>
      </div>

      {company && (
        <div className="border-b border-border/50 bg-primary/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">الشركة الحالية</p>
          <p className="truncate font-heading text-sm font-semibold">{company.name_ar ?? company.name}</p>
          <p className="text-[11px] text-accent">
            {companyRole ? COMPANY_ROLE_LABELS[companyRole] : ''}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-primary text-white shadow-glow-primary'
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:translate-x-0.5'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-200', active ? 'scale-110' : 'group-hover:scale-105')} />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border/50 p-4 text-center text-[11px] text-muted-foreground">
        نظام فارس دحروج لإدارة الموارد البشرية - Faris HR © 2025
      </div>
    </aside>
  );
}
