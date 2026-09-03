 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  Bell,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { formatDateAr, formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/use-employees';
import type { Leave, Contract, ActivityLog, Notification } from '@/lib/types';
import {
  MOCK_STATS,
  MOCK_ATTENDANCE_TREND,
  MOCK_DEPT_DIST,
  MOCK_LEAVES,
  MOCK_CONTRACTS,
  MOCK_LOGS,
  MOCK_NOTIFICATIONS,
} from '@/lib/mock-data';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { company } = useAuth();
  const { employees, usingMock: empMock } = useEmployees();
  const [stats, setStats] = useState(MOCK_STATS);
  const [attendanceTrend, setAttendanceTrend] = useState<typeof MOCK_ATTENDANCE_TREND>(MOCK_ATTENDANCE_TREND);
  const [deptDist, setDeptDist] = useState<typeof MOCK_DEPT_DIST>(MOCK_DEPT_DIST);
  const [recentLeaves, setRecentLeaves] = useState<Leave[]>(MOCK_LEAVES);
  const [endingContracts, setEndingContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [logs, setLogs] = useState<ActivityLog[]>(MOCK_LOGS);
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  // When in mock mode, compute stats from the live employee list so adding
  // an employee immediately updates the dashboard counters.
  useEffect(() => {
    if (!empMock) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyStr = thirtyDaysAgo.toISOString().slice(0, 10);
    setStats((prev) => ({
      ...prev,
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      newHires: employees.filter((e) => e.hire_date >= thirtyStr).length,
      resigned: employees.filter((e) => e.status === 'resigned').length,
      totalPayroll: employees.reduce((s, e) => s + (e.basic_salary || 0) + (e.allowances || 0), 0),
    }));
    const dist: { name: string; value: number }[] = [];
    const depMap = new Map<string, number>();
    employees.forEach((e) => {
      const depName = e.department?.name_ar ?? e.department?.name ?? 'غير محدد';
      depMap.set(depName, (depMap.get(depName) ?? 0) + 1);
    });
    depMap.forEach((value, name) => dist.push({ name, value }));
    setDeptDist(dist);
  }, [employees, empMock]);

  useEffect(() => {
    if (!company) {
      // No company context — show mock data immediately instead of hanging
      setUsingMock(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setUsingMock(true);
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const co = company.id;

        const [
          empRes, activeRes, newRes, resignedRes, attTodayRes, leaveRes,
          payrollRes, contractsRes, leavesRes, logsRes, notifsRes, deptsRes,
        ] = await Promise.all([
          supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', co),
          supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', co).eq('status', 'active'),
          supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', co).gte('hire_date', thirtyDaysAgo.toISOString().slice(0, 10)),
          supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', co).eq('status', 'resigned'),
          supabase.from('attendance').select('status').eq('company_id', co).eq('date', today),
          supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('company_id', co).in('status', ['pending', 'manager_approved', 'hr_approved']),
          supabase.from('payroll').select('net_salary').eq('company_id', co).eq('status', 'paid'),
          supabase.from('contracts').select('*, employee:employees(*)').eq('company_id', co).order('end_date', { ascending: true }).limit(5),
          supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(*)').eq('company_id', co).order('created_at', { ascending: false }).limit(5),
          supabase.from('activity_logs').select('*').eq('company_id', co).order('created_at', { ascending: false }).limit(6),
          supabase.from('notifications').select('*').eq('company_id', co).order('created_at', { ascending: false }).limit(5),
          supabase.from('departments').select('id, name, name_ar').eq('company_id', co),
        ]);

        if (cancelled) return;

        const present = (attTodayRes.data ?? []).filter((a: any) => a.status === 'present').length;
        const late = (attTodayRes.data ?? []).filter((a: any) => a.status === 'late').length;
        const absent = (attTodayRes.data ?? []).filter((a: any) => a.status === 'absent').length;

        setStats({
          total: empRes.count ?? 0,
          active: activeRes.count ?? 0,
          newHires: newRes.count ?? 0,
          resigned: resignedRes.count ?? 0,
          presentToday: present,
          absentToday: absent,
          lateToday: late,
          onLeave: leaveRes.count ?? 0,
          totalPayroll: (payrollRes.data ?? []).reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0),
          endingContracts: contractsRes.data?.filter((c: any) => {
            if (!c.end_date) return false;
            const days = (new Date(c.end_date).getTime() - Date.now()) / 86400000;
            return days >= 0 && days <= 30;
          }).length ?? 0,
        });

        setEndingContracts((contractsRes.data ?? []) as Contract[]);
        setRecentLeaves((leavesRes.data ?? []) as Leave[]);
        setLogs((logsRes.data ?? []) as ActivityLog[]);
        setNotifs((notifsRes.data ?? []) as Notification[]);

        const trend: { name: string; حاضر: number; متأخر: number; غائب: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().slice(0, 10);
          const { data } = await supabase.from('attendance').select('status').eq('company_id', co).eq('date', ds);
          if (cancelled) return;
          trend.push({
            name: `${d.getDate()}/${d.getMonth() + 1}`,
            حاضر: (data ?? []).filter((a: any) => a.status === 'present').length,
            متأخر: (data ?? []).filter((a: any) => a.status === 'late').length,
            غائب: (data ?? []).filter((a: any) => a.status === 'absent').length,
          });
        }
        setAttendanceTrend(trend);

        const depts = (deptsRes.data ?? []) as any[];
        const dist: { name: string; value: number }[] = [];
        for (const d of depts) {
          const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', co).eq('department_id', d.id);
          if (cancelled) return;
          dist.push({ name: d.name_ar || d.name, value: count ?? 0 });
        }
        setDeptDist(dist);

        if (!cancelled) {
          clearTimeout(timeout);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUsingMock(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [company]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">جاري تحميل البيانات...</div>;
  }

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة على حالة الموارد البشرية"
        actions={
          <div className="flex items-center gap-2">
            {usingMock && (
              <Badge variant="warning" className="text-xs">بيانات تجريبية</Badge>
            )}
            <Button asChild><Link href="/reports">عرض التقارير</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard title="إجمالي الموظفين" value={stats.total} icon={Users} color="primary" />
        <StatCard title="الموظفون النشطون" value={stats.active} icon={UserCheck} color="success" />
        <StatCard title="موظفون جدد" value={stats.newHires} icon={UserPlus} color="accent" trend="آخر 30 يوم" trendUp />
        <StatCard title="المستقيلون" value={stats.resigned} icon={UserMinus} color="destructive" />
        <StatCard title="الحضور اليوم" value={stats.presentToday} icon={Clock} color="success" />
        <StatCard title="الغياب اليوم" value={stats.absentToday} icon={UserMinus} color="destructive" />
        <StatCard title="التأخير اليوم" value={stats.lateToday} icon={AlertTriangle} color="warning" />
        <StatCard title="الإجازات الجارية" value={stats.onLeave} icon={CalendarDays} color="accent" />
        <StatCard title="إجمالي الرواتب" value={formatCurrency(stats.totalPayroll)} icon={Wallet} color="primary" />
        <StatCard title="عقود تنتهي قريباً" value={stats.endingContracts} icon={FileText} color="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-base">حالة الحضور — آخر 7 أيام</CardTitle>
            <CardDescription>تتبع الحضور والتأخير والغياب اليومي</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="حاضر" stroke="hsl(var(--chart-1))" fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="متأخر" stroke="hsl(var(--chart-3))" fill="url(#gL)" strokeWidth={2} />
                <Area type="monotone" dataKey="غائب" stroke="hsl(var(--chart-5))" fill="url(#gA)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">توزيع الموظفين حسب القسم</CardTitle>
            <CardDescription>عدد الموظفين في كل قسم</CardDescription>
          </CardHeader>
          <CardContent>
            {deptDist.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={deptDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                    {deptDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-base">آخر طلبات الإجازات</CardTitle>
              <CardDescription>أحدث طلبات الإجازات المُسجّلة</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm"><Link href="/leaves">عرض الكل</Link></Button>
          </CardHeader>
          <CardContent>
            {recentLeaves.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">لا توجد طلبات إجازات</div>
            ) : (
              <div className="space-y-3">
                {recentLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{l.employee?.full_name ?? 'موظف'}</p>
                        <p className="text-xs text-muted-foreground">{formatDateAr(l.start_date)} — {l.days} يوم</p>
                      </div>
                    </div>
                    <Badge variant={l.status === 'hr_approved' ? 'success' : l.status === 'rejected' ? 'destructive' : l.status === 'pending' ? 'warning' : 'secondary'}>
                      {l.status === 'pending' ? 'قيد الانتظار' : l.status === 'manager_approved' ? 'معتمد من المدير' : l.status === 'hr_approved' ? 'معتمد' : l.status === 'rejected' ? 'مرفوض' : 'ملغي'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-heading text-base">الإشعارات</CardTitle></CardHeader>
          <CardContent>
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
            ) : (
              <div className="space-y-3">
                {notifs.map((n) => (
                  <div key={n.id} className="flex gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">آخر العمليات</CardTitle>
            <CardDescription>سجل النشاطات الأخيرة</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">لا توجد عمليات مسجلة</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{formatDateAr(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">عقود قاربت على الانتهاء</CardTitle>
            <CardDescription>عقود تنتهي خلال 30 يوماً</CardDescription>
          </CardHeader>
          <CardContent>
            {endingContracts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">لا توجد عقود قاربت على الانتهاء</div>
            ) : (
              <div className="space-y-3">
                {endingContracts.map((c) => {
                  const days = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000) : 0;
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.employee?.full_name ?? 'موظف'}</p>
                          <p className="text-xs text-muted-foreground">ينتهي: {formatDateAr(c.end_date)}</p>
                        </div>
                      </div>
                      <Badge variant={days <= 7 ? 'destructive' : 'warning'}>{days} يوم</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}