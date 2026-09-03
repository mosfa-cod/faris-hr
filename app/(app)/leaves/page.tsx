 'use client';

import { useEffect, useState } from 'react';
import { Plus, CalendarDays, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
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
import { hasPermission } from '@/lib/permissions';
import { formatDateAr, daysBetween } from '@/lib/format';
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, type Leave, type LeaveType, type Employee } from '@/lib/types';

export default function LeavesPage() {
  const { role, company, companyRole } = useAuth();
  const canManage = hasPermission(role ?? undefined, 'leaves.approve_manager') || hasPermission(role ?? undefined, 'leaves.approve_hr') || companyRole === 'owner' || (companyRole as string) === 'manager';
  const { toast } = useToast();
  const canRequest = hasPermission(role ?? undefined, 'leaves.request');
  const canApproveManager = hasPermission(role ?? undefined, 'leaves.approve_manager') || companyRole === 'owner' || (companyRole as string) === 'manager';
  const canApproveHr = hasPermission(role ?? undefined, 'leaves.approve_hr') || companyRole === 'owner' || (companyRole as string) === 'manager';

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '', type: 'annual' as LeaveType, start_date: '', end_date: '', reason: '',
  });

  useEffect(() => {
    (async () => {
      const [lvRes, empRes] = await Promise.all([
        supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(*)').order('created_at', { ascending: false }),
        supabase.from('employees').select('id, full_name').order('full_name'),
      ]);
      setLeaves((lvRes.data ?? []) as Leave[]);
      setEmployees((empRes.data ?? []) as Employee[]);
      setLoading(false);
    })();
  }, []);

  async function handleSubmit() {
    if (!form.employee_id || !form.start_date || !form.end_date) {
      toast({ title: 'أكمل البيانات', variant: 'destructive' }); return;
    }
    const days = daysBetween(form.start_date, form.end_date);
    const { error } = await supabase.from('leaves').insert({
      employee_id: form.employee_id, type: form.type, start_date: form.start_date, end_date: form.end_date, days, reason: form.reason, status: 'pending', company_id: company?.id,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم إرسال الطلب' });
      setOpen(false);
      const { data } = await supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(*)').order('created_at', { ascending: false });
      setLeaves((data ?? []) as Leave[]);
    }
  }

  async function updateStatus(id: string, status: Leave['status'], decisionField: 'manager_decision' | 'hr_decision') {
    const lv = leaves.find((l) => l.id === id);
    const { error } = await supabase.from('leaves').update({ status, [decisionField]: 'تم', [decisionField + '_at']: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم التحديث' });
      const label = status === 'rejected' ? 'تم رفض' : 'تم تحديث حالة';
      logActivity({ companyId: company?.id, action: `${label} طلب إجازة ${lv?.employee?.full_name ?? ''}`, entity: 'leaves', entityId: id });
      const { data } = await supabase.from('leaves').select('*, employee:employees!leaves_employee_id_fkey(*)').order('created_at', { ascending: false });
      setLeaves((data ?? []) as Leave[]);
    }
  }

  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'hr_approved').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإجازات"
        description={`${leaves.length} طلب — ${pending} قيد الانتظار — ${approved} معتمد`}
        actions={canRequest && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> طلب إجازة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>طلب إجازة جديد</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع الإجازة</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LeaveType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => <SelectItem key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>من تاريخ</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>إلى تاريخ</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>السبب</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={handleSubmit}>إرسال الطلب</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : leaves.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><CalendarDays className="h-8 w-8 opacity-40" /><p className="text-sm">لا توجد طلبات إجازات</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead><TableHead>الأيام</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {leaves.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.employee?.full_name ?? '-'}</TableCell>
                      <TableCell>{LEAVE_TYPE_LABELS[l.type as keyof typeof LEAVE_TYPE_LABELS] ?? l.type}</TableCell>
                      <TableCell>{formatDateAr(l.start_date)}</TableCell>
                      <TableCell>{formatDateAr(l.end_date)}</TableCell>
                      <TableCell>{l.days}</TableCell>
                      <TableCell><Badge variant={l.status === 'hr_approved' ? 'success' : l.status === 'rejected' ? 'destructive' : l.status === 'pending' ? 'warning' : 'secondary'}>{LEAVE_STATUS_LABELS[l.status as keyof typeof LEAVE_STATUS_LABELS] ?? l.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canApproveManager && l.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(l.id, 'manager_approved', 'manager_decision')}><Check className="h-4 w-4 text-success" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(l.id, 'rejected', 'manager_decision')}><X className="h-4 w-4 text-destructive" /></Button>
                            </>
                          )}
                          {canApproveHr && l.status === 'manager_approved' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(l.id, 'hr_approved', 'hr_decision')}><Check className="h-4 w-4 text-success" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(l.id, 'rejected', 'hr_decision')}><X className="h-4 w-4 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
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