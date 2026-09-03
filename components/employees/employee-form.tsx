'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import type { Employee, EmployeeStatus } from '@/lib/types';

interface Props {
  employee?: Employee;
}

export function EmployeeForm({ employee }: Props) {
  const router = useRouter();
  const { departments, positions, branches, employees, reload, usingMock, addEmployeeLocal, updateEmployeeLocal } = useEmployees();
  const { company } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: employee?.employee_code ?? '',
    full_name: employee?.full_name ?? '',
    national_id: employee?.national_id ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    address: employee?.address ?? '',
    birth_date: employee?.birth_date ?? '',
    marital_status: employee?.marital_status ?? '',
    qualification: employee?.qualification ?? '',
    department_id: employee?.department_id ?? '',
    position_id: employee?.position_id ?? '',
    branch_id: employee?.branch_id ?? '',
    manager_id: employee?.manager_id ?? '',
    hire_date: employee?.hire_date ?? new Date().toISOString().slice(0, 10),
    basic_salary: employee?.basic_salary ?? 0,
    allowances: employee?.allowances ?? 0,
    bank_account: employee?.bank_account ?? '',
    status: (employee?.status ?? 'active') as EmployeeStatus,
    notes: employee?.notes ?? '',
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const companyId = company?.id ?? null;

    const payload = {
      ...form,
      basic_salary: Number(form.basic_salary) || 0,
      allowances: Number(form.allowances) || 0,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      branch_id: form.branch_id || null,
      manager_id: form.manager_id || null,
      birth_date: form.birth_date || null,
      company_id: companyId,
    };

    // Mock mode: add/update local state directly
    if (!company || usingMock) {
      const dept = departments.find((d) => d.id === form.department_id);
      const localPayload = {
        ...payload,
        birth_date: form.birth_date || undefined,
        department_id: form.department_id || undefined,
        position_id: form.position_id || undefined,
        branch_id: form.branch_id || undefined,
        manager_id: form.manager_id || undefined,
        company_id: companyId || undefined,
      };
      if (employee) {
        updateEmployeeLocal(employee.id, { ...localPayload, department: dept });
        toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الموظف' });
        router.push(`/employees/${employee.id}`);
      } else {
        const newEmp = { id: `local-${Date.now()}`, ...localPayload, department: dept } as Employee;
        addEmployeeLocal(newEmp);
        toast({ title: 'تمت الإضافة', description: 'تم إضافة الموظف بنجاح' });
        router.push(`/employees/${newEmp.id}`);
      }
      setSaving(false);
      return;
    }

    if (employee) {
      const { error } = await supabase.from('employees').update(payload).eq('id', employee.id);
      if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      else { toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الموظف' }); reload(); router.push(`/employees/${employee.id}`); }
    } else {
      const { data, error } = await supabase.from('employees').insert(payload).select().single();
      if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      else { toast({ title: 'تمت الإضافة', description: 'تم إضافة الموظف بنجاح' }); reload(); router.push(`/employees/${data.id}`); }
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          <ArrowRight className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="ml-2 h-4 w-4" /> {saving ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">البيانات الأساسية</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>الرقم الوظيفي *</Label>
            <Input value={form.employee_code} onChange={(e) => set('employee_code', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>الرقم القومي</Label>
            <Input value={form.national_id} onChange={(e) => set('national_id', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>الهاتف</Label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>تاريخ الميلاد</Label>
            <Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>الحالة الاجتماعية</Label>
            <Select value={form.marital_status} onValueChange={(v) => set('marital_status', v)}>
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
            <Input value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="بكالوريوس / ماجستير..." />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label>العنوان</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">البيانات الوظيفية</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>الفرع</Label>
            <Select value={form.branch_id} onValueChange={(v) => set('branch_id', v)}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name_ar ?? b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>القسم</Label>
            <Select value={form.department_id} onValueChange={(v) => set('department_id', v)}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name_ar ?? d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الوظيفة</Label>
            <Select value={form.position_id} onValueChange={(v) => set('position_id', v)}>
              <SelectTrigger><SelectValue placeholder="اختر الوظيفة" /></SelectTrigger>
              <SelectContent>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title_ar ?? p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المدير المباشر</Label>
            <Select value={form.manager_id} onValueChange={(v) => set('manager_id', v)}>
              <SelectTrigger><SelectValue placeholder="اختر المدير" /></SelectTrigger>
              <SelectContent>
                {employees.filter((e) => e.id !== employee?.id).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>تاريخ التعيين *</Label>
            <Input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>الحالة الوظيفية</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v as EmployeeStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
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
        <CardHeader><CardTitle className="text-base">البيانات المالية</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>الراتب الأساسي</Label>
            <Input type="number" value={form.basic_salary} onChange={(e) => set('basic_salary', Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>البدلات</Label>
            <Input type="number" value={form.allowances} onChange={(e) => set('allowances', Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>رقم الحساب البنكي</Label>
            <Input value={form.bank_account} onChange={(e) => set('bank_account', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ملاحظات</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات إضافية..." />
        </CardContent>
      </Card>
    </form>
  );
}
