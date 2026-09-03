'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, LogIn, LogOut, Calendar, User, Filter, Upload, X, FileSpreadsheet, RefreshCw, Plus, Trash2, Save, CheckCircle2, XCircle, DoorOpen, CalendarClock, CalendarOff } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission, hasCompanyPermission } from '@/lib/permissions';
import { formatDateAr, formatTimeAr, AR_MONTHS } from '@/lib/format';
import { ATTENDANCE_STATUS_LABELS, type Attendance, type AttendanceStatus, type Employee, type WorkSchedule } from '@/lib/types';
import { MOCK_EMPLOYEES, MOCK_ATTENDANCE } from '@/lib/mock-data';

function formatTimeWithSeconds(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function AttendancePage() {
  const { role, user, company, companyRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission(role ?? undefined, 'attendance.manage') || hasCompanyPermission(companyRole ?? undefined, 'attendance.manage') || (companyRole as string) === 'manager';

  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [myEmp, setMyEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selEmp, setSelEmp] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'schedules'>('attendance');
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [officialTime, setOfficialTime] = useState({ start_time: '08:00', grace_minutes: 15 });
  const [officialTimeLoading, setOfficialTimeLoading] = useState(false);
  const [officialTimeSaving, setOfficialTimeSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    start_time: '08:00',
    end_time: '16:00',
    break_minutes: '60',
    work_days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  });

  useEffect(() => {
    (async () => {
      if (!company) {
        setSchedules([
          { id: 'schedule-standard', name: 'الدوام الرسمي', start_time: '08:00', end_time: '16:00', break_minutes: 60, work_days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] },
          { id: 'schedule-flex', name: 'الدوام المرن', start_time: '09:00', end_time: '17:00', break_minutes: 60, work_days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] },
        ]);
        return;
      }
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true });
      if (!error) setSchedules((data ?? []) as WorkSchedule[]);
    })();
  }, [company]);

  // Load official attendance time settings (start time + grace period)
  const officialTimeKey = company ? `attendance_official_time:${company.id}` : null;
  useEffect(() => {
    (async () => {
      if (!officialTimeKey) return;
      setOfficialTimeLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', officialTimeKey)
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed?.start_time && typeof parsed?.grace_minutes === 'number') {
            setOfficialTime({ start_time: parsed.start_time, grace_minutes: parsed.grace_minutes });
          }
        } catch {
          // ignore malformed stored value, keep defaults
        }
      }
      setOfficialTimeLoading(false);
    })();
  }, [officialTimeKey]);

  async function saveOfficialTime() {
    if (officialTimeSaving) return;
    setOfficialTimeSaving(true);
    if (officialTimeKey) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key: officialTimeKey, value: JSON.stringify(officialTime) },
          { onConflict: 'key' }
        );
      if (error) {
        toast({ title: 'تعذر حفظ إعدادات الدوام الرسمية', description: error.message, variant: 'destructive' });
        setOfficialTimeSaving(false);
        return;
      }
    }
    setOfficialTimeSaving(false);
    toast({ title: 'تم حفظ إعدادات الدوام الرسمية', description: 'سيتم استخدامها تلقائياً لتحديد حالة التأخير.' });
  }

  // Compute whether a check-in timestamp counts as late, based on saved official settings
  const computeLateInfo = useCallback((checkInDate: Date) => {
    const [offHour, offMinute] = officialTime.start_time.split(':').map(Number);
    const cutoffMinutes = offHour * 60 + offMinute + (officialTime.grace_minutes || 0);
    const actualMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
    const isLate = actualMinutes > cutoffMinutes;
    const lateMinutes = isLate ? actualMinutes - cutoffMinutes : 0;
    return { isLate, lateMinutes };
  }, [officialTime]);

  // Load employees + my profile
  useEffect(() => {
    (async () => {
      if (authLoading) return;
      if (!company) {
        setEmployees(MOCK_EMPLOYEES);
        setMyEmp(MOCK_EMPLOYEES[0]);
        return;
      }
      try {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, full_name, employee_code, user_id, status, department:departments!employees_department_id_fkey(name_ar, name)')
          .eq('company_id', company.id)
          .in('status', ['active', 'on_leave'])
          .order('full_name');
        const list = (emps ?? []) as unknown as Employee[];
        setEmployees(list);
        if (user) {
          const me = list.find((e) => e.user_id === user.id) ?? null;
          setMyEmp(me);
        }
      } catch {
        setEmployees(MOCK_EMPLOYEES);
        setMyEmp(MOCK_EMPLOYEES[0]);
      }
    })();
  }, [user, company, authLoading]);

  const loadRecords = useCallback(async () => {
    if (authLoading) return;
    if (!company) {
      // No company — use mock data, apply filters locally
      setUsingMock(true);
      setRecords(filterMockAttendance(MOCK_ATTENDANCE, year, month, selEmp));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setUsingMock(true);
        setRecords(filterMockAttendance(MOCK_ATTENDANCE, year, month, selEmp));
        setLoading(false);
      }
    }, 8000);

    setLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      let q = supabase
        .from('attendance')
        .select('*, employee:employees(*)')
        .eq('company_id', company.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false });
      if (selEmp !== 'all') q = q.eq('employee_id', selEmp);
      const { data, error } = await q;
      if (!cancelled) {
        clearTimeout(timeout);
        if (error) throw error;
        setRecords((data ?? []) as Attendance[]);
        setUsingMock(false);
        setLoading(false);
      }
    } catch {
      if (!cancelled) {
        setUsingMock(true);
        setRecords(filterMockAttendance(MOCK_ATTENDANCE, year, month, selEmp));
        setLoading(false);
      }
    }
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [year, month, selEmp, company, authLoading]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  async function addWorkSchedule() {
    if (!scheduleForm.name.trim() || savingSchedule) return;
    setSavingSchedule(true);
    const nextSchedule: WorkSchedule = {
      id: `schedule-${Date.now()}`,
      company_id: company?.id,
      name: scheduleForm.name.trim(),
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
      break_minutes: Number(scheduleForm.break_minutes) || 0,
      work_days: scheduleForm.work_days,
    };

    if (company) {
      const { data, error } = await supabase
        .from('work_schedules')
        .insert({
          company_id: company.id,
          name: nextSchedule.name,
          start_time: nextSchedule.start_time,
          end_time: nextSchedule.end_time,
          break_minutes: nextSchedule.break_minutes,
          work_days: nextSchedule.work_days,
        })
        .select()
        .maybeSingle();
      if (error) {
        toast({ title: 'تعذر حفظ موعد العمل', description: error.message, variant: 'destructive' });
        setSavingSchedule(false);
        return;
      }
      setSchedules((previous) => [...previous, (data ?? nextSchedule) as WorkSchedule]);
    } else {
      setSchedules((previous) => [...previous, nextSchedule]);
    }

    setScheduleForm({ name: '', start_time: '08:00', end_time: '16:00', break_minutes: '60', work_days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] });
    setScheduleOpen(false);
    setSavingSchedule(false);
    toast({ title: 'تمت إضافة موعد العمل' });
  }

  async function deleteWorkSchedule(schedule: WorkSchedule) {
    if (company) {
      const { error } = await supabase.from('work_schedules').delete().eq('id', schedule.id).eq('company_id', company.id);
      if (error) {
        toast({ title: 'تعذر حذف موعد العمل', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setSchedules((previous) => previous.filter((item) => item.id !== schedule.id));
    toast({ title: 'تم حذف موعد العمل' });
  }

  async function importBiometricData() {
    if (importing) return;
    setImporting(true);
    const sourceEmployees = employees.length >= 8 ? employees.slice(0, 8) : MOCK_EMPLOYEES.slice(0, 8);
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const generated = sourceEmployees.map((employee, index): Attendance => {
      const checkIn = new Date(now);
      checkIn.setHours(7 + (index % 2), 45 + index, 3 + index, 0);
      const checkOut = new Date(now);
      checkOut.setHours(16, 5 + index, 12 + index, 0);
      const lateMinutes = Math.max(0, (checkIn.getHours() - 8) * 60 + checkIn.getMinutes() - 30);
      return {
        id: `biometric-${date}-${employee.id}`,
        employee_id: employee.id,
        date,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        work_hours: Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100,
        overtime_hours: 0,
        late_minutes: lateMinutes,
        status: lateMinutes > 0 ? 'late' : 'present',
        employee,
      };
    });

    if (company && employees.length >= 8 && !usingMock) {
      const { error } = await supabase.from('attendance').upsert(
        generated.map((record) => ({
          employee_id: record.employee_id,
          company_id: company.id,
          date: record.date,
          check_in: record.check_in,
          check_out: record.check_out,
          work_hours: record.work_hours,
          overtime_hours: record.overtime_hours,
          late_minutes: record.late_minutes,
          status: record.status,
        })),
        { onConflict: 'employee_id,date' },
      );
      if (error) {
        console.error('biometric import failed', error);
        toast({ title: 'تعذر حفظ بيانات البصمة', description: 'تم عرض الحركات محلياً، ويمكنك المحاولة مرة أخرى.', variant: 'destructive' });
      } else {
        // Saved for real — refresh from the database instead of splicing in fake local objects,
        // and never force mock mode after a successful real save.
        await loadRecords();
        setImporting(false);
        setSelectedFile(null);
        setImportOpen(false);
        toast({ title: 'تم استيراد حركات جهاز البصمة', description: `تمت مزامنة الدخول والانصراف للموظفين الثمانية${selectedFile ? ` من ${selectedFile.name}` : ''}` });
        return;
      }
    }

    setRecords((previous) => {
      const importedIds = new Set(generated.map((record) => record.employee_id));
      const remaining = previous.filter((record) => !(record.date === date && importedIds.has(record.employee_id)));
      return [...generated, ...remaining];
    });
    setUsingMock(true);
    setImporting(false);
    setSelectedFile(null);
    setImportOpen(false);
    toast({ title: 'تم استيراد حركات جهاز البصمة', description: `تمت مزامنة الدخول والانصراف للموظفين الثمانية${selectedFile ? ` من ${selectedFile.name}` : ''}` });
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xlsx', 'xls'].includes(extension) || file.size > 5 * 1024 * 1024) {
      toast({ title: 'ملف غير صالح', description: 'اختر ملف CSV أو Excel بحجم لا يتجاوز 5 ميجابايت.', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
  }

  async function checkIn() {
    if (!myEmp) { toast({ title: 'لا يوجد ملف موظف مرتبط بحسابك', variant: 'destructive' }); return; }
    if (busy) return;

    // Mock mode: insert into local state
    if (!company || usingMock) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const exists = records.some((r) => r.employee_id === myEmp.id && r.date === today);
      if (exists) { toast({ title: 'سبق تسجيل الحضور اليوم', variant: 'destructive' }); return; }
      const { isLate, lateMinutes } = computeLateInfo(now);
      const newRec: Attendance = {
        id: `local-${Date.now()}`,
        employee_id: myEmp.id,
        date: today,
        check_in: now.toISOString(),
        check_out: undefined,
        work_hours: 0,
        overtime_hours: 0,
        late_minutes: lateMinutes,
        status: isLate ? 'late' : 'present',
        employee: myEmp,
      };
      setRecords((prev) => [newRec, ...prev]);
      toast({ title: 'تم تسجيل الحضور بنجاح', description: `الوقت: ${formatTimeAr(now.toISOString())}` });
      return;
    }

    setBusy(true);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', myEmp.id)
      .eq('date', today)
      .eq('company_id', company?.id ?? '')
      .maybeSingle();
    if (existing) {
      toast({ title: 'سبق تسجيل الحضور اليوم', variant: 'destructive' });
      setBusy(false);
      return;
    }
    const { isLate, lateMinutes } = computeLateInfo(now);
    const newRec: Attendance = {
      id: `local-${Date.now()}`,
      employee_id: myEmp.id,
      date: today,
      check_in: now.toISOString(),
      check_out: undefined,
      work_hours: 0,
      overtime_hours: 0,
      late_minutes: lateMinutes,
      status: isLate ? 'late' : 'present',
      employee: myEmp,
    };
    const { error } = await supabase.from('attendance').insert({
      employee_id: myEmp.id,
      date: today,
      check_in: now.toISOString(),
      status: isLate ? 'late' : 'present',
      late_minutes: lateMinutes,
      company_id: company?.id,
    });
    setBusy(false);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); return; }
    setRecords((prev) => {
      const filtered = prev.filter((r) => !(r.employee_id === myEmp.id && r.date === today));
      return [newRec, ...filtered];
    });
    toast({ title: 'تم تسجيل الحضور بنجاح', description: `الوقت: ${formatTimeAr(now.toISOString())}` });
  }

  async function checkOut() {
    if (!myEmp) { toast({ title: 'لا يوجد ملف موظف مرتبط بحسابك', variant: 'destructive' }); return; }
    if (busy) return;

    // Mock mode: update local state
    if (!company || usingMock) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const rec = records.find((r) => r.employee_id === myEmp.id && r.date === today);
      if (!rec) { toast({ title: 'لم تسجل الحضور بعد', variant: 'destructive' }); return; }
      if (rec.check_out) { toast({ title: 'سبق تسجيل الانصراف', variant: 'destructive' }); return; }
      const hours = rec.check_in ? Math.round(((now.getTime() - new Date(rec.check_in).getTime()) / 3600000) * 100) / 100 : 0;
      setRecords((prev) => prev.map((r) =>
        r.id === rec.id ? { ...r, check_out: now.toISOString(), work_hours: hours } : r
      ));
      toast({ title: 'تم تسجيل الانصراف بنجاح', description: `الوقت: ${formatTimeAr(now.toISOString())}` });
      return;
    }

    setBusy(true);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', myEmp.id)
      .eq('date', today)
      .eq('company_id', company?.id ?? '')
      .maybeSingle();
    if (!existing) {
      toast({ title: 'لم تسجل الحضور بعد', variant: 'destructive' });
      setBusy(false);
      return;
    }
    const checkInTime = existing.check_in ? new Date(existing.check_in) : null;
    const hours = checkInTime ? Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100 : 0;
    const { error } = await supabase
      .from('attendance')
      .update({ check_out: now.toISOString(), work_hours: hours })
      .eq('id', existing.id);
    setBusy(false);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); return; }
    setRecords((prev) => prev.map((r) =>
      r.id === existing.id ? { ...r, check_out: now.toISOString(), work_hours: hours } : r
    ));
    toast({ title: 'تم تسجيل الانصراف بنجاح', description: `الوقت: ${formatTimeAr(now.toISOString())}` });
  }

  // Admin/manager: mark attendance for any employee directly from the management table
  async function adminMarkAttendance(employee: Employee, action: 'present' | 'absent' | 'check-out') {
    if (rowBusyId) return;
    setRowBusyId(employee.id);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Mock mode: mutate local state only
    if (!company || usingMock) {
      setRecords((prev) => {
        const existing = prev.find((r) => r.employee_id === employee.id && r.date === today);
        if (action === 'check-out') {
          if (!existing) { toast({ title: 'لم يسجل الموظف حضوره بعد', variant: 'destructive' }); return prev; }
          const hours = existing.check_in ? Math.round(((now.getTime() - new Date(existing.check_in).getTime()) / 3600000) * 100) / 100 : 0;
          return prev.map((r) => (r.id === existing.id ? { ...r, check_out: now.toISOString(), work_hours: hours } : r));
        }
        const { isLate, lateMinutes } = computeLateInfo(now);
        const status: AttendanceStatus = action === 'absent' ? 'absent' : isLate ? 'late' : 'present';
        const updated: Attendance = {
          id: existing?.id ?? `local-${Date.now()}`,
          employee_id: employee.id,
          date: today,
          check_in: action === 'absent' ? undefined : now.toISOString(),
          check_out: existing?.check_out,
          work_hours: existing?.work_hours ?? 0,
          overtime_hours: existing?.overtime_hours ?? 0,
          late_minutes: action === 'absent' ? 0 : lateMinutes,
          status,
          employee,
        };
        const rest = prev.filter((r) => !(r.employee_id === employee.id && r.date === today));
        return [updated, ...rest];
      });
      toast({ title: 'تم تحديث حالة الموظف', description: employee.full_name });
      setRowBusyId(null);
      return;
    }

    // Real mode: check for an existing record today, then insert or update explicitly
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .eq('company_id', company.id)
      .maybeSingle();

    if (action === 'check-out') {
      if (!existing) {
        toast({ title: 'لم يسجل الموظف حضوره بعد', variant: 'destructive' });
        setRowBusyId(null);
        return;
      }
      const checkInTime = existing.check_in ? new Date(existing.check_in) : null;
      const hours = checkInTime ? Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100 : 0;
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: now.toISOString(), work_hours: hours })
        .eq('id', existing.id);
      if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); setRowBusyId(null); return; }
    } else {
      const { isLate, lateMinutes } = computeLateInfo(now);
      const status = action === 'absent' ? 'absent' : isLate ? 'late' : 'present';
      const payload: Record<string, unknown> = {
        status,
        late_minutes: action === 'absent' ? 0 : lateMinutes,
        check_in: action === 'absent' ? null : now.toISOString(),
      };
      if (existing) {
        const { error } = await supabase.from('attendance').update(payload).eq('id', existing.id);
        if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); setRowBusyId(null); return; }
      } else {
        const { error } = await supabase.from('attendance').insert({
          employee_id: employee.id,
          date: today,
          company_id: company.id,
          ...payload,
        });
        if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); setRowBusyId(null); return; }
      }
    }

    await loadRecords();
    toast({ title: 'تم تحديث حالة الموظف', description: employee.full_name });
    const actionLabel = action === 'present' ? 'تسجيل حضور' : action === 'absent' ? 'تسجيل غياب' : 'تسجيل انصراف';
    logActivity({ companyId: company?.id, action: `${actionLabel} للموظف ${employee.full_name}`, entity: 'attendance' });
    setRowBusyId(null);
  }

  // Counters reflect TODAY's attendance (not filtered records)
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === today);
  const present = todayRecords.filter((r) => r.status === 'present').length;
  const late = todayRecords.filter((r) => r.status === 'late').length;
  const absent = todayRecords.filter((r) => r.status === 'absent').length;
  const onLeave = todayRecords.filter((r) => r.status === 'leave').length;
  const biometricMovements = todayRecords.filter((r) => r.check_in || r.check_out);

  // Check if current user has checked in/out today
  const myTodayRec = todayRecords.find((r) => r.employee_id === myEmp?.id);
  const hasCheckedIn = !!myTodayRec;
  const hasCheckedOut = !!myTodayRec?.check_out;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور والانصراف"
        description="تسجيل ومتابعة حضور الموظفين"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {usingMock && <Badge variant="warning" className="text-xs">بيانات تجريبية</Badge>}
            <Button onClick={() => setImportOpen(true)} className="gap-2 bg-teal-600 text-white hover:bg-teal-700">
              <Upload className="h-4 w-4" /> استيراد بيانات جهاز البصمة
            </Button>
          </div>
        }
      />

      <div role="tablist" aria-label="أقسام الحضور والانصراف" className="flex w-full max-w-xl gap-2 rounded-xl border border-border/60 bg-muted/40 p-1">
        <button type="button" role="tab" aria-selected={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          سجل الحضور والغياب
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'schedules'} onClick={() => setActiveTab('schedules')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'schedules' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          مواعيد العمل
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <>
      {/* Official time settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">إعدادات الدوام الرسمية</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">تُستخدم هذه الإعدادات لتحديد حالة التأخير تلقائياً</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[auto_1fr_1fr]">
            <Button
              onClick={saveOfficialTime}
              disabled={officialTimeSaving || officialTimeLoading || !canManage}
              className="gap-2 order-3 sm:order-1"
            >
              <Save className="h-4 w-4" /> {officialTimeSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <div className="order-1 sm:order-2">
              <label className="mb-1 block text-sm text-muted-foreground">وقت الحضور الرسمي</label>
              <Input
                type="time"
                value={officialTime.start_time}
                disabled={!canManage}
                onChange={(event) => setOfficialTime((prev) => ({ ...prev, start_time: event.target.value }))}
              />
            </div>
            <div className="order-2 sm:order-3">
              <label className="mb-1 block text-sm text-muted-foreground">فترة السماح بالدقائق</label>
              <Input
                type="number"
                min="0"
                max="180"
                value={officialTime.grace_minutes}
                disabled={!canManage}
                onChange={(event) => setOfficialTime((prev) => ({ ...prev, grace_minutes: Number(event.target.value) || 0 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Counters (today) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-success/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">حاضر اليوم</p>
              <p className="text-2xl font-bold text-success transition-all duration-300">{present}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">غائب اليوم</p>
              <p className="text-2xl font-bold text-destructive transition-all duration-300">{absent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">متأخر اليوم</p>
              <p className="text-2xl font-bold text-warning transition-all duration-300">{late}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">في إجازة اليوم</p>
              <p className="text-2xl font-bold text-primary transition-all duration-300">{onLeave}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-in / Check-out */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Button
            onClick={checkIn}
            disabled={busy || !myEmp || hasCheckedIn}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" /> تسجيل الحضور
          </Button>
          <Button
            variant="outline"
            onClick={checkOut}
            disabled={busy || !myEmp || !hasCheckedIn || hasCheckedOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" /> تسجيل الانصراف
          </Button>
          {myTodayRec && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>تم الحضور: {formatTimeAr(myTodayRec.check_in)}</span>
              {myTodayRec.check_out && <span> — الانصراف: {formatTimeAr(myTodayRec.check_out)}</span>}
            </div>
          )}
          {!myEmp && (
            <p className="text-sm text-muted-foreground">لا يوجد ملف موظف مرتبط بحسابك — تواصل مع الموارد البشرية.</p>
          )}
        </CardContent>
      </Card>

      {/* Employee management with direct check-in/absent/check-out actions (managers only) */}
      {canManage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">إدارة الموظفين</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{employees.length} موظفين مسجلين في النظام</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">لا يوجد موظفون مسجلون</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الموظف</TableHead>
                      <TableHead>اسم الموظف</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>وقت الحضور</TableHead>
                      <TableHead>الإجراءات المباشرة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => {
                      const rec = todayRecords.find((r) => r.employee_id === emp.id);
                      const isBusy = rowBusyId === emp.id;
                      return (
                        <TableRow key={emp.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-mono text-sm">{emp.employee_code}</TableCell>
                          <TableCell className="font-medium">{emp.full_name}</TableCell>
                          <TableCell>{emp.department?.name_ar ?? emp.department?.name ?? '-'}</TableCell>
                          <TableCell>
                            {rec ? (
                              <Badge variant={rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : rec.status === 'absent' ? 'destructive' : 'secondary'}>
                                {ATTENDANCE_STATUS_LABELS[rec.status]}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">لم يسجل</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{formatTimeAr(rec?.check_in)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {!rec && (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={isBusy}
                                    onClick={() => adminMarkAttendance(emp, 'present')}
                                    className="gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> تسجيل حضور
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isBusy}
                                    onClick={() => adminMarkAttendance(emp, 'absent')}
                                    className="gap-1.5"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> تسجيل غياب
                                  </Button>
                                </>
                              )}
                              {rec && rec.status !== 'absent' && !rec.check_out && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => adminMarkAttendance(emp, 'check-out')}
                                  className="gap-1.5"
                                >
                                  <DoorOpen className="h-3.5 w-3.5" /> تسجيل الانصراف
                                </Button>
                              )}
                              {rec && (rec.status === 'absent' || !!rec.check_out) && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                  {rec.status === 'absent' ? 'تم تسجيل الغياب' : 'تم تسجيل الانصراف'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Log with Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">سجل الحضور</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{AR_MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selEmp} onValueChange={setSelEmp}>
                <SelectTrigger className="w-48"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموظفين</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Calendar className="h-8 w-8 opacity-40" />
              <p className="text-sm">لا توجد سجلات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحضور</TableHead>
                    <TableHead>الانصراف</TableHead>
                    <TableHead>ساعات العمل</TableHead>
                    <TableHead>إضافي</TableHead>
                    <TableHead>التأخير</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">{r.employee?.full_name ?? '-'}</TableCell>
                      <TableCell>{formatDateAr(r.date)}</TableCell>
                      <TableCell>{formatTimeAr(r.check_in)}</TableCell>
                      <TableCell>{formatTimeAr(r.check_out)}</TableCell>
                      <TableCell>{r.work_hours > 0 ? `${r.work_hours} س` : '-'}</TableCell>
                      <TableCell>{r.overtime_hours > 0 ? `${r.overtime_hours} س` : '-'}</TableCell>
                      <TableCell>{r.late_minutes > 0 ? `${r.late_minutes} د` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : r.status === 'absent' ? 'destructive' : 'secondary'}>
                          {ATTENDANCE_STATUS_LABELS[r.status as keyof typeof ATTENDANCE_STATUS_LABELS] ?? r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Biometric daily movement log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">سجل حركات البصمة اليومية</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">يعرض نفس حركات الدخول والانصراف الظاهرة في السجل العلوي</p>
            </div>
            {biometricMovements.length > 0 && (
              <Badge variant="secondary">{biometricMovements.length} موظفين</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {biometricMovements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8 opacity-40" />
              <p className="text-sm">استورد ملف جهاز البصمة لعرض الحركات اليومية</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الرقم الوظيفي</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>دخول جهاز البصمة</TableHead>
                    <TableHead>خروج جهاز البصمة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biometricMovements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">{movement.employee?.full_name ?? '-'}</TableCell>
                      <TableCell>{movement.employee?.employee_code ?? '-'}</TableCell>
                      <TableCell>{formatDateAr(movement.date)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatTimeWithSeconds(movement.check_in)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatTimeWithSeconds(movement.check_out)}</TableCell>
                      <TableCell>
                        <Badge variant={movement.status === 'present' ? 'success' : 'warning'}>
                          {ATTENDANCE_STATUS_LABELS[movement.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">مواعيد العمل</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">حدد ساعات الدوام وأيام العمل المعتمدة للموظفين.</p>
              </div>
              <Button onClick={() => setScheduleOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> إضافة موعد عمل جديد</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">لا توجد مواعيد عمل مضافة</div>
            ) : schedules.map((schedule) => (
              <div key={schedule.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{schedule.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)} · استراحة {schedule.break_minutes} دقيقة</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{schedule.work_days.map((day) => <Badge key={day} variant="secondary">{day}</Badge>)}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteWorkSchedule(schedule)} aria-label={`حذف ${schedule.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div><CardTitle id="schedule-title">إضافة موعد عمل جديد</CardTitle><p className="mt-1 text-sm text-muted-foreground">أدخل ساعات الدوام وأيام العمل.</p></div>
              <Button variant="ghost" size="icon" onClick={() => setScheduleOpen(false)} aria-label="إغلاق"><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="اسم الموعد، مثال: الدوام الرسمي" value={scheduleForm.name} onChange={(event) => setScheduleForm((form) => ({ ...form, name: event.target.value }))} />
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm text-muted-foreground">وقت الحضور</label><Input type="time" value={scheduleForm.start_time} onChange={(event) => setScheduleForm((form) => ({ ...form, start_time: event.target.value }))} /></div><div><label className="mb-1 block text-sm text-muted-foreground">وقت الانصراف</label><Input type="time" value={scheduleForm.end_time} onChange={(event) => setScheduleForm((form) => ({ ...form, end_time: event.target.value }))} /></div></div>
              <div><label className="mb-1 block text-sm text-muted-foreground">مدة الاستراحة بالدقائق</label><Input type="number" min="0" max="480" value={scheduleForm.break_minutes} onChange={(event) => setScheduleForm((form) => ({ ...form, break_minutes: event.target.value }))} /></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setScheduleOpen(false)}>إلغاء</Button><Button onClick={addWorkSchedule} disabled={!scheduleForm.name.trim() || savingSchedule}>{savingSchedule ? 'جاري الحفظ...' : 'حفظ الموعد'}</Button></div>
            </CardContent>
          </Card>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="biometric-import-title">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle id="biometric-import-title">استيراد بيانات جهاز البصمة</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">ارفع ملف Excel أو CSV، أو شغّل المحاكي الذكي لثمانية موظفين.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setImportOpen(false)} aria-label="إغلاق">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 px-6 py-8 text-center transition-colors hover:border-teal-500 hover:bg-teal-50/50">
                <FileSpreadsheet className="h-9 w-9 text-teal-600" />
                <span className="font-medium">اختر ملف الحركات</span>
                <span className="text-xs text-muted-foreground">CSV أو Excel — الحد الأقصى 5 ميجابايت</span>
                <Input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={handleFileSelection} className="sr-only" />
              </label>
              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="truncate">{selectedFile.name}</span>
                  <span className="text-muted-foreground">جاهز للاستيراد</span>
                </div>
              )}
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
                سيولد المحاكي حركة دخول وخروج دقيقة بالثواني لكل موظف من الموظفين الثمانية، ثم يطابق الجدولين فوراً.
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setImportOpen(false)}>إلغاء</Button>
                <Button onClick={importBiometricData} disabled={importing} className="gap-2 bg-teal-600 text-white hover:bg-teal-700">
                  {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? 'جاري الاستيراد...' : 'استيراد ومحاكاة الحركات'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function filterMockAttendance(all: Attendance[], year: number, month: number, selEmp: string): Attendance[] {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  let filtered = all.filter((r) => r.date.startsWith(prefix));
  if (selEmp !== 'all') filtered = filtered.filter((r) => r.employee_id === selEmp);
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}