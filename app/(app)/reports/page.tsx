 'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Clock, CalendarDays, Wallet, FileText, Star, Download } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateAr, AR_MONTHS } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { Employee, Attendance, Leave, Payroll, Contract, PerformanceReview } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

type ReportType = 'employees' | 'attendance' | 'leaves' | 'payroll' | 'contracts' | 'reviews';

const ALL_REPORTS: { key: ReportType; label: string; icon: typeof Users; sensitive?: boolean }[] = [
  { key: 'employees', label: 'تقرير الموظفين', icon: Users },
  { key: 'attendance', label: 'تقرير الحضور', icon: Clock },
  { key: 'leaves', label: 'تقرير الإجازات', icon: CalendarDays },
  { key: 'payroll', label: 'تقرير الرواتب', icon: Wallet, sensitive: true },
  { key: 'contracts', label: 'تقرير العقود', icon: FileText, sensitive: true },
  { key: 'reviews', label: 'تقرير التقييم', icon: Star, sensitive: true },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const { companyRole } = useAuth();
  const isOwner = companyRole === 'owner';
  const REPORTS = ALL_REPORTS.filter((r) => !r.sensitive || isOwner);
  const [active, setActive] = useState<ReportType>('employees');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let rows: any[] = [];
      let chart: { name: string; value: number }[] = [];
      if ((active === 'payroll' || active === 'contracts' || active === 'reviews') && !isOwner) {
        setData([]);
        setChartData([]);
        setLoading(false);
        return;
      }
      if (active === 'employees') {
        const { data: d } = await supabase.from('employees').select('*, department:departments!employees_department_id_fkey(*), position:positions(*)');
        rows = d ?? [];
        const byStatus: Record<string, number> = {};
        rows.forEach((e) => { byStatus[e.status] = (byStatus[e.status] ?? 0) + 1; });
        chart = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
      } else if (active === 'attendance') {
        const { data: d } = await supabase.from('attendance').select('*, employee:employees(*)').order('date', { ascending: false }).limit(100);
        rows = d ?? [];
        const byStatus: Record<string, number> = {};
        rows.forEach((a) => { byStatus[a.status] = (byStatus[a.status] ?? 0) + 1; });
        chart = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
      } else if (active === 'leaves') {
        const { data: d } = await supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(*)').order('created_at', { ascending: false });
        rows = d ?? [];
        const byType: Record<string, number> = {};
        rows.forEach((l) => { byType[l.type] = (byType[l.type] ?? 0) + 1; });
        chart = Object.entries(byType).map(([name, value]) => ({ name, value }));
      } else if (active === 'payroll') {
        const { data: d } = await supabase.from('payroll').select('*, employee:employees(*)').order('created_at', { ascending: false });
        rows = d ?? [];
        const byMonth: Record<string, number> = {};
        rows.forEach((p) => { const k = `${AR_MONTHS[p.month - 1]}`; byMonth[k] = (byMonth[k] ?? 0) + Number(p.net_salary); });
        chart = Object.entries(byMonth).map(([name, value]) => ({ name, value }));
      } else if (active === 'contracts') {
        const { data: d } = await supabase.from('contracts').select('*, employee:employees(*)');
        rows = d ?? [];
        const byStatus: Record<string, number> = {};
        rows.forEach((c) => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });
        chart = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
      } else if (active === 'reviews') {
        const { data: d } = await supabase.from('performance_reviews').select('*, employee:employees!performance_reviews_employee_id_fkey(*)');
        rows = d ?? [];
        const byRating: Record<string, number> = {};
        rows.forEach((r) => { const k = `${r.rating} نجوم`; byRating[k] = (byRating[k] ?? 0) + 1; });
        chart = Object.entries(byRating).map(([name, value]) => ({ name, value }));
      }
      setData(rows);
      setChartData(chart);
      setLoading(false);
    })();
  }, [active]);

  function exportCsv() {
    if (data.length === 0) { toast({ title: 'لا توجد بيانات', variant: 'destructive' }); return; }
    const headers = Object.keys(data[0]).filter((k) => k !== 'employee' && k !== 'department' && k !== 'position');
    const rows = data.map((r) => headers.map((h) => `"${r[h] ?? ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${active}_report.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'تم التصدير' });
  }

  const current = REPORTS.find((r) => r.key === active)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        description="تقارير شاملة قابلة للتصدير"
        actions={<Button variant="outline" onClick={exportCsv}><Download className="ml-2 h-4 w-4" /> تصدير CSV</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${active === r.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted/50'}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{r.label}</span>
            </button>
          );
        })}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">رسم بياني — {current.label}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">{current.label}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد بيانات</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {active === 'employees' && <><TableHead>الاسم</TableHead><TableHead>الرقم</TableHead><TableHead>القسم</TableHead><TableHead>الحالة</TableHead></>}
                    {active === 'attendance' && <><TableHead>الموظف</TableHead><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead><TableHead>ساعات</TableHead></>}
                    {active === 'leaves' && <><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead>الأيام</TableHead><TableHead>الحالة</TableHead></>}
                    {active === 'payroll' && <><TableHead>الموظف</TableHead><TableHead>الشهر</TableHead><TableHead>الصافي</TableHead><TableHead>الحالة</TableHead></>}
                    {active === 'contracts' && <><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead>النهاية</TableHead><TableHead>الحالة</TableHead></>}
                    {active === 'reviews' && <><TableHead>الموظف</TableHead><TableHead>السنة</TableHead><TableHead>التقييم</TableHead></>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r) => (
                    <TableRow key={r.id}>
                      {active === 'employees' && <><TableCell>{r.full_name}</TableCell><TableCell>{r.employee_code}</TableCell><TableCell>{r.department?.name_ar ?? '-'}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell></>}
                      {active === 'attendance' && <><TableCell>{r.employee?.full_name}</TableCell><TableCell>{formatDateAr(r.date)}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell><TableCell>{r.work_hours}</TableCell></>}
                      {active === 'leaves' && <><TableCell>{r.employee?.full_name}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.days}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell></>}
                      {active === 'payroll' && <><TableCell>{r.employee?.full_name}</TableCell><TableCell>{AR_MONTHS[r.month - 1]} {r.year}</TableCell><TableCell>{formatCurrency(r.net_salary)}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell></>}
                      {active === 'contracts' && <><TableCell>{r.employee?.full_name}</TableCell><TableCell>{r.type}</TableCell><TableCell>{formatDateAr(r.end_date)}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell></>}
                      {active === 'reviews' && <><TableCell>{r.employee?.full_name}</TableCell><TableCell>{r.period}</TableCell><TableCell>{r.rating}/5</TableCell></>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}