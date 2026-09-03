  'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Eye, Pencil, Trash2, Download, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useEmployees } from '@/hooks/use-employees';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatus, type Employee } from '@/lib/types';
import { initials } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';

export default function EmployeesPage() {
  const { employees, departments, positions, branches, loading, reload, usingMock, addEmployeeLocal, deleteEmployeeLocal } = useEmployees();
  const { role, company } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const canCreate = hasPermission(role ?? undefined, 'employees.create');
  const canEdit = hasPermission(role ?? undefined, 'employees.edit');
  const canDelete = hasPermission(role ?? undefined, 'employees.delete');

  // Add-employee modal state
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    national_id: '',
    phone: '',
    email: '',
    address: '',
    birth_date: '',
    marital_status: '',
    qualification: '',
    department_id: '',
    position_id: '',
    branch_id: '',
    hire_date: new Date().toISOString().slice(0, 10),
    basic_salary: 0,
    allowances: 0,
    bank_account: '',
    status: 'active' as EmployeeStatus,
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAddModal() {
    const nextCode = `EMP-${1000 + employees.length + Math.floor(Math.random() * 100)}`;
    setForm({
      employee_code: nextCode,
      full_name: '',
      national_id: '',
      phone: '',
      email: '',
      address: '',
      birth_date: '',
      marital_status: '',
      qualification: '',
      department_id: '',
      position_id: '',
      branch_id: '',
      hire_date: new Date().toISOString().slice(0, 10),
      basic_salary: 0,
      allowances: 0,
      bank_account: '',
      status: 'active',
    });
    setAddOpen(true);
  }

  async function handleAddSubmit() {
    if (!form.employee_code || !form.full_name) {
      toast({ title: 'أكمل البيانات المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      basic_salary: Number(form.basic_salary) || 0,
      allowances: Number(form.allowances) || 0,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      branch_id: form.branch_id || null,
      birth_date: form.birth_date || null,
      company_id: company?.id ?? null,
    };

    // Mock mode: add to local state directly
    if (!company || usingMock) {
      const dept = departments.find((d) => d.id === form.department_id);
      const newEmp: Employee = {
        id: `local-${Date.now()}`,
        ...payload,
        department: dept,
      } as Employee;
      addEmployeeLocal(newEmp);
      toast({ title: 'تمت الإضافة', description: 'تم إضافة الموظف بنجاح' });
      setAddOpen(false);
      setSaving(false);
      return;
    }

    const { data, error } = await supabase.from('employees').insert(payload).select('*, department:departments!employees_department_id_fkey(*), position:positions(*), branch:branches(*)').single();
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      addEmployeeLocal(data as Employee);
      toast({ title: 'تمت الإضافة', description: 'تم إضافة الموظف بنجاح' });
      setAddOpen(false);
      logActivity({ companyId: company?.id, action: `تمت إضافة الموظف ${(data as Employee).full_name}`, entity: 'employees', entityId: (data as Employee).id });
    }
    setSaving(false);
  }

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchQ = !q || e.full_name.includes(q) || e.employee_code.includes(q) || (e.email ?? '').includes(q) || (e.phone ?? '').includes(q);
      const matchDept = deptFilter === 'all' || e.department_id === deptFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchQ && matchDept && matchStatus;
    });
  }, [employees, q, deptFilter, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    const emp = employees.find((e) => e.id === id);
    if (!company || usingMock) {
      deleteEmployeeLocal(id);
      toast({ title: 'تم الحذف', description: 'تم حذف الموظف' });
      return;
    }
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم الحذف', description: 'تم حذف الموظف' });
      logActivity({ companyId: company.id, action: `تم حذف الموظف ${emp?.full_name ?? ''}`, entity: 'employees', entityId: id });
      reload();
    }
  }

  function exportCsv() {
    const rows = [['الرقم الوظيفي', 'الاسم', 'البريد', 'الهاتف', 'القسم', 'الوظيفة', 'الحالة']];
    filtered.forEach((e) => rows.push([
      e.employee_code, e.full_name, e.email ?? '', e.phone ?? '',
      e.department?.name_ar ?? e.department?.name ?? '',
      e.position?.title_ar ?? e.position?.title ?? '',
      EMPLOYEE_STATUS_LABELS[e.status as EmployeeStatus] ?? e.status,
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الموظفين"
        description={`${filtered.length} موظف`}
        actions={
          <>
            {usingMock && <Badge variant="warning" className="text-xs">بيانات تجريبية</Badge>}
            <Button variant="outline" onClick={exportCsv}><Download className="ml-2 h-4 w-4" /> تصدير CSV</Button>
            {canCreate && (
              <Button onClick={openAddModal}><Plus className="ml-2 h-4 w-4" /> إضافة موظف</Button>
            )}
          </>
        }
      />

      {/* Add Employee Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>الرقم الوظيفي *</Label>
              <Input value={form.employee_code} onChange={(e) => setField('employee_code', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>الرقم القومي</Label>
              <Input value={form.national_id} onChange={(e) => setField('national_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الميلاد</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => setField('birth_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الحالة الاجتماعية</Label>
              <Select value={form.marital_status} onValueChange={(v) => setField('marital_status', v)}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">أعزب</SelectItem>
                  <SelectItem value="married">متزوج</SelectItem>
                  <SelectItem value="divorced">مطلق</SelectItem>
                  <SelectItem value="widowed">أرمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المؤهل</Label>
              <Input value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} placeholder="بكالوريوس / ماجستير..." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الفرع</Label>
              <Select value={form.branch_id} onValueChange={(v) => setField('branch_id', v)}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar ?? b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Select value={form.department_id} onValueChange={(v) => setField('department_id', v)}>
                <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name_ar ?? d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الوظيفة</Label>
              <Select value={form.position_id} onValueChange={(v) => setField('position_id', v)}>
                <SelectTrigger><SelectValue placeholder="اختر الوظيفة" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title_ar ?? p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين *</Label>
              <Input type="date" value={form.hire_date} onChange={(e) => setField('hire_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>الراتب الأساسي</Label>
              <Input type="number" value={form.basic_salary} onChange={(e) => setField('basic_salary', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>البدلات</Label>
              <Input type="number" value={form.allowances} onChange={(e) => setField('allowances', Number(e.target.value))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>رقم الحساب البنكي</Label>
              <Input value={form.bank_account} onChange={(e) => setField('bank_account', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddSubmit} disabled={saving}>
              {saving ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ...</> : <><Save className="ml-2 h-4 w-4" /> حفظ</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الرقم الوظيفي أو البريد..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="كل الأقسام" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name_ar ?? d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="on_leave">في إجازة</SelectItem>
                <SelectItem value="resigned">مستقيل</SelectItem>
                <SelectItem value="terminated">منتهي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Users className="h-10 w-10 opacity-40" />
              <p>لا يوجد موظفون مطابقون</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الرقم الوظيفي</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>الوظيفة</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {e.photo_url ? null : <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(e.full_name)}</AvatarFallback>}
                          </Avatar>
                          <span className="font-medium">{e.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.employee_code}</TableCell>
                      <TableCell>{e.department?.name_ar ?? e.department?.name ?? '-'}</TableCell>
                      <TableCell>{e.position?.title_ar ?? e.position?.title ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{e.phone ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === 'active' ? 'success' : e.status === 'resigned' || e.status === 'terminated' ? 'destructive' : 'warning'}>
                          {EMPLOYEE_STATUS_LABELS[e.status as EmployeeStatus] ?? e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {e.id && <Button asChild variant="ghost" size="icon"><Link href={`/employees/${e.id}`}><Eye className="h-4 w-4" /></Link></Button>}
                          {canEdit && e.id && <Button asChild variant="ghost" size="icon"><Link href={`/employees/${e.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>}
                          {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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