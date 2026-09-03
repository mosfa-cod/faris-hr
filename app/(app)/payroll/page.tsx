 'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/log-activity';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';
import { formatCurrency, AR_MONTHS } from '@/lib/format';
import { PAYROLL_STATUS_LABELS, type Payroll, type Employee, type PayrollStatus } from '@/lib/types';

export default function PayrollPage() {
  const { role, company, companyRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission(role ?? undefined, 'payroll.manage');
  const canExport = hasPermission(role ?? undefined, 'payroll.export');

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basic_salary: 0, allowances: 0, bonuses: 0, deductions: 0, loans: 0, overtime_pay: 0,
  });

  useEffect(() => {
    if (!company) { setLoading(false); return; }
    (async () => {
      const [prRes, empRes] = await Promise.all([
        supabase.from('payroll').select('*, employee:employees(*)').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('employees').select('id, full_name, employee_code, basic_salary, allowances').eq('company_id', company.id).order('full_name'),
      ]);
      setPayrolls((prRes.data ?? []) as Payroll[]);
      setEmployees((empRes.data ?? []) as Employee[]);
      setLoading(false);
    })();
  }, [company]);

  async function handleSubmit() {
    if (!form.employee_id) { toast({ title: 'اختر موظف', variant: 'destructive' }); return; }
    if (!company) { toast({ title: 'تعذر تحديد الشركة الحالية', variant: 'destructive' }); return; }
    const net = Number(form.basic_salary) + Number(form.allowances) + Number(form.bonuses) + Number(form.overtime_pay) - Number(form.deductions) - Number(form.loans);
    const { error } = await supabase.from('payroll').insert({
      employee_id: form.employee_id, month: form.month, year: form.year, company_id: company.id,
      basic_salary: Number(form.basic_salary), allowances: Number(form.allowances), bonuses: Number(form.bonuses),
      deductions: Number(form.deductions), loans: Number(form.loans), overtime_pay: Number(form.overtime_pay),
      net_salary: net, status: 'draft',
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم إنشاء كشف الرواتب' });
      setOpen(false);
      const { data } = await supabase.from('payroll').select('*, employee:employees(*)').eq('company_id', company.id).order('created_at', { ascending: false });
      setPayrolls((data ?? []) as Payroll[]);
    }
  }

  async function updateStatus(id: string, status: PayrollStatus) {
    const pr = payrolls.find((p) => p.id === id);
    await supabase.from('payroll').update({ status }).eq('id', id);
    setPayrolls((p) => p.map((x) => x.id === id ? { ...x, status } : x));
    toast({ title: 'تم التحديث' });
    const label = status === 'approved' ? 'تم اعتماد' : status === 'paid' ? 'تم دفع' : 'تم تحديث';
    logActivity({ companyId: company?.id, action: `${label} راتب ${pr?.employee?.full_name ?? ''} (${pr?.month}/${pr?.year})`, entity: 'payroll', entityId: id });
  }

  function exportCsv() {
    const rows = [['الموظف', 'الشهر', 'السنة', 'الأساسي', 'البدلات', 'المكافآت', 'الخصومات', 'السلف', 'إضافي', 'الصافي', 'الحالة']];
    payrolls.forEach((p) => rows.push([
      p.employee?.full_name ?? '', String(p.month), String(p.year),
      String(p.basic_salary), String(p.allowances), String(p.bonuses), String(p.deductions), String(p.loans), String(p.overtime_pay), String(p.net_salary),
      PAYROLL_STATUS_LABELS[p.status as keyof typeof PAYROLL_STATUS_LABELS] ?? p.status,
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payroll.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function printPayroll(p: Payroll) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>كشف راتب</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}</style></head><body>
      <h1>كشف راتب - ${p.employee?.full_name ?? ''}</h1>
      <p>الشهر: ${AR_MONTHS[p.month - 1]} ${p.year}</p>
      <table><tr><td>الراتب الأساسي</td><td>${formatCurrency(p.basic_salary)}</td></tr>
      <tr><td>البدلات</td><td>${formatCurrency(p.allowances)}</td></tr>
      <tr><td>المكافآت</td><td>${formatCurrency(p.bonuses)}</td></tr>
      <tr><td>الساعات الإضافية</td><td>${formatCurrency(p.overtime_pay)}</td></tr>
      <tr><td>الخصومات</td><td>- ${formatCurrency(p.deductions)}</td></tr>
      <tr><td>السلف</td><td>- ${formatCurrency(p.loans)}</td></tr>
      <tr><td><b>صافي الراتب</b></td><td><b>${formatCurrency(p.net_salary)}</b></td></tr></table>
      </body></html>`);
    w.document.close(); w.print();
  }

  function printMasir() {
    if (payrolls.length === 0) { toast({ title: 'لا توجد كشوف للطباعة', variant: 'destructive' }); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = payrolls.map((p, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${p.employee?.full_name ?? '-'}</td>
      <td style="text-align:center">${p.employee?.employee_code ?? '-'}</td>
      <td style="text-align:left">${formatCurrency(p.basic_salary)}</td>
      <td style="text-align:left">${formatCurrency(p.allowances)}</td>
      <td style="text-align:left">${formatCurrency(p.bonuses)}</td>
      <td style="text-align:left">${formatCurrency(p.overtime_pay)}</td>
      <td style="text-align:left">- ${formatCurrency(p.deductions)}</td>
      <td style="text-align:left">- ${formatCurrency(p.loans)}</td>
      <td style="text-align:left"><b>${formatCurrency(p.net_salary)}</b></td>
    </tr>`).join('');
    w.document.write(`<html dir="rtl"><head><title>مسير الرواتب</title><style>
      body{font-family:Arial;padding:30px}
      h1{text-align:center;margin-bottom:5px}
      .meta{text-align:center;color:#666;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#2b53a8;color:#fff;padding:8px;border:1px solid #999}
      td{border:1px solid #ccc;padding:6px 8px}
      tfoot td{font-weight:bold;background:#f0f0f0}
      @media print{body{padding:10px}}
    </style></head><body>
      <h1>مسير الرواتب</h1>
      <div class="meta">قائمة صرف رواتب الموظفين</div>
      <table>
        <thead><tr>
          <th style="text-align:center;width:30px">م</th>
          <th>اسم الموظف</th>
          <th style="text-align:center">الرقم الوظيفي</th>
          <th>الأساسي</th>
          <th>البدلات</th>
          <th>المكافآت</th>
          <th>إضافي</th>
          <th>الخصومات</th>
          <th>السلف</th>
          <th>الصافي</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="3" style="text-align:center">الإجمالي</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.basic_salary, 0))}</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.allowances, 0))}</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.bonuses, 0))}</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.overtime_pay, 0))}</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.deductions, 0))}</td>
          <td>${formatCurrency(payrolls.reduce((s, p) => s + p.loans, 0))}</td>
          <td>${formatCurrency(totalNet)}</td>
        </tr></tfoot>
      </table>
    </body></html>`);
    w.document.close(); w.print();
  }

  const totalNet = payrolls.reduce((s, p) => s + Number(p.net_salary || 0), 0);

  const canView = companyRole === 'owner' || hasPermission(role ?? undefined, 'payroll.view') || hasPermission(role ?? undefined, 'payroll.manage');
  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-lg font-semibold">لا تملك صلاحية الوصول لهذه الصفحة</p>
        <p className="text-sm">بيانات الرواتب متاحة لمالك الشركة فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الرواتب"
        description={`إجمالي صافي الرواتب: ${formatCurrency(totalNet)}`}
        actions={
          <>
            {canExport && <Button variant="outline" onClick={printMasir}><Printer className="ml-2 h-4 w-4" /> طباعة المسير</Button>}
            {canExport && <Button variant="outline" onClick={exportCsv}><Download className="ml-2 h-4 w-4" /> تصدير Excel</Button>}
            {canManage && <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4" /> كشف راتب جديد</Button>}
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إنشاء كشف راتب</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>الموظف</Label>
              <Select value={form.employee_id} onValueChange={(v) => {
                const emp = employees.find((e) => e.id === v);
                setForm({ ...form, employee_id: v, basic_salary: emp?.basic_salary ?? 0, allowances: emp?.allowances ?? 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>الشهر</Label><Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AR_MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>السنة</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>الراتب الأساسي</Label><Input type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>البدلات</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>المكافآت</Label><Input type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>الخصومات</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>السلف</Label><Input type="number" value={form.loans} onChange={(e) => setForm({ ...form, loans: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>أجر إضافي</Label><Input type="number" value={form.overtime_pay} onChange={(e) => setForm({ ...form, overtime_pay: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>إنشاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : payrolls.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><Wallet className="h-8 w-8 opacity-40" /><p className="text-sm">لا توجد كشوف رواتب</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>الشهر</TableHead><TableHead>الأساسي</TableHead><TableHead>البدلات</TableHead><TableHead>المكافآت</TableHead><TableHead>الخصومات</TableHead><TableHead>الصافي</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payrolls.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.employee?.full_name ?? '-'}</TableCell>
                      <TableCell>{AR_MONTHS[p.month - 1]} {p.year}</TableCell>
                      <TableCell>{formatCurrency(p.basic_salary)}</TableCell>
                      <TableCell>{formatCurrency(p.allowances)}</TableCell>
                      <TableCell>{formatCurrency(p.bonuses)}</TableCell>
                      <TableCell>{formatCurrency(p.deductions)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.net_salary)}</TableCell>
                      <TableCell><Badge variant={p.status === 'paid' ? 'success' : p.status === 'approved' ? 'default' : 'secondary'}>{PAYROLL_STATUS_LABELS[p.status as keyof typeof PAYROLL_STATUS_LABELS] ?? p.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canExport && <Button size="sm" variant="ghost" onClick={() => printPayroll(p)}><FileSpreadsheet className="h-4 w-4" /></Button>}
                          {canManage && p.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => updateStatus(p.id, 'approved')}>اعتماد</Button>}
                          {canManage && p.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => updateStatus(p.id, 'paid')}>دفع</Button>}
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