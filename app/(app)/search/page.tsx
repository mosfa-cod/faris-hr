 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Users, Building2, FileText, CalendarDays, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { formatDateAr, formatCurrency } from '@/lib/format';

interface Result {
  type: string;
  label: string;
  sub: string;
  href: string;
}

export default function SearchPage() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    (async () => {
      setLoading(true);
      const term = `%${q}%`;
      const [empRes, depRes, cRes, lRes, prRes] = await Promise.all([
        supabase.from('employees').select('id, full_name, employee_code').or(`full_name.ilike.${term},employee_code.ilike.${term},email.ilike.${term}`).limit(10),
        supabase.from('departments').select('id, name, name_ar').or(`name.ilike.${term},name_ar.ilike.${term}`).limit(10),
        supabase.from('contracts').select('id, type, end_date, employee:employees(*)').limit(10),
        supabase.from('leaves').select('id, type, start_date, employee:employees!leaves_employee_id_fkey(full_name)').limit(10),
        supabase.from('payroll').select('id, net_salary, month, year, employee:employees(*)').limit(10),
      ]);

      const r: Result[] = [];
      (empRes.data ?? []).forEach((e: any) => r.push({ type: 'موظف', label: e.full_name, sub: e.employee_code, href: `/employees/${e.id}` }));
      (depRes.data ?? []).forEach((d: any) => r.push({ type: 'قسم', label: d.name_ar ?? d.name, sub: 'قسم', href: '/departments' }));
      (cRes.data ?? []).forEach((c: any) => r.push({ type: 'عقد', label: c.employee?.full_name ?? 'عقد', sub: formatDateAr(c.end_date), href: '/contracts' }));
      (lRes.data ?? []).forEach((l: any) => r.push({ type: 'إجازة', label: l.employee?.full_name ?? 'إجازة', sub: formatDateAr(l.start_date), href: '/leaves' }));
      (prRes.data ?? []).forEach((p: any) => r.push({ type: 'راتب', label: p.employee?.full_name ?? 'راتب', sub: formatCurrency(p.net_salary), href: '/payroll' }));
      setResults(r);
      setLoading(false);
    })();
  }, [q]);

  const iconFor = (type: string) => {
    switch (type) {
      case 'موظف': return Users;
      case 'قسم': return Building2;
      case 'عقد': return FileText;
      case 'إجازة': return CalendarDays;
      case 'راتب': return Wallet;
      default: return Search;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="البحث" description={q ? `نتائج البحث عن: ${q}` : 'ابحث في النظام'} />

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث..." className="pr-9" onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/search?q=${encodeURIComponent(query)}`; }} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري البحث...</div> : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Search className="h-8 w-8 opacity-40" /><p className="text-sm">لا توجد نتائج</p></div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((r, i) => {
                const Icon = iconFor(r.type);
                return (
                  <Link href={r.href} key={i} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.sub}</p>
                    </div>
                    <Badge variant="secondary">{r.type}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}