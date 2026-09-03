
'use client';

import { useEffect, useState } from 'react';
import { Plus, FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
import { formatDateAr } from '@/lib/format';
import { CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS, type Contract, type ContractType, type ContractStatus, type Employee } from '@/lib/types';

export default function ContractsPage() {
  const { role, company, companyRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission(role ?? undefined, 'contracts.manage');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '', type: 'permanent' as ContractType, start_date: new Date().toISOString().slice(0, 10),
    end_date: '', salary: 0, terms: '',
  });

  useEffect(() => {
    if (!company) { setLoading(false); return; }
    (async () => {
      const [cRes, empRes] = await Promise.all([
        supabase.from('contracts').select('*, employee:employees(*)').eq('company_id', company.id).order('created_at', { ascending: false }),
        supabase.from('employees').select('id, full_name').eq('company_id', company.id).order('full_name'),
      ]);
      setContracts((cRes.data ?? []) as Contract[]);
      setEmployees((empRes.data ?? []) as Employee[]);
      setLoading(false);
    })();
  }, [company]);

  async function handleSubmit() {
    if (!form.employee_id) { toast({ title: 'اختر موظف', variant: 'destructive' }); return; }
    if (!company) { toast({ title: 'تعذر تحديد الشركة الحالية', variant: 'destructive' }); return; }
    const { error } = await supabase.from('contracts').insert({
      employee_id: form.employee_id, type: form.type, start_date: form.start_date,
      end_date: form.end_date || null, salary: Number(form.salary), status: 'active', terms: form.terms, company_id: company.id,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم إنشاء العقد' });
      setOpen(false);
      const { data } = await supabase.from('contracts').select('*, employee:employees(*)').eq('company_id', company.id).order('created_at', { ascending: false });
      setContracts((data ?? []) as Contract[]);
    }
  }

  async function renew(id: string) {
    const c = contracts.find((x) => x.id === id);
    if (!c?.end_date) { toast({ title: 'حدد تاريخ انتهاء أولاً', variant: 'destructive' }); return; }
    const newEnd = new Date(c.end_date); newEnd.setFullYear(newEnd.getFullYear() + 1);
    const { error } = await supabase.from('contracts').update({ end_date: newEnd.toISOString().slice(0, 10), status: 'renewed' }).eq('id', id);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم تجديد العقد' });
      logActivity({ companyId: company?.id, action: `تم تجديد عقد ${c?.employee?.full_name ?? ''}`, entity: 'contracts', entityId: id });
      const { data } = await supabase.from('contracts').select('*, employee:employees(*)').eq('company_id', company?.id).order('created_at', { ascending: false });
      setContracts((data ?? []) as Contract[]);
    }
  }

  async function terminate(id: string) {
    if (!confirm('إنهاء هذا العقد؟')) return;
    const c = contracts.find((x) => x.id === id);
    await supabase.from('contracts').update({ status: 'terminated' }).eq('id', id);
    setContracts((c2) => c2.map((x) => x.id === id ? { ...x, status: 'terminated' as ContractStatus } : x));
    toast({ title: 'تم إنهاء العقد' });
    logActivity({ companyId: company?.id, action: `تم إنهاء عقد ${c?.employee?.full_name ?? ''}`, entity: 'contracts', entityId: id });
  }

  const canView = companyRole === 'owner' || hasPermission(role ?? undefined, 'contracts.view') || hasPermission(role ?? undefined, 'contracts.manage');
  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-lg font-semibold">لا تملك صلاحية الوصول لهذه الصفحة</p>
        <p className="text-sm">بيانات العقود متاحة لمالك الشركة فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="العقود"
        description={`${contracts.length} عقد`}
        actions={canManage && <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4" /> عقد جديد</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>إنشاء عقد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>الموظف</Label><Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>نوع العقد</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ContractType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((t) => <SelectItem key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>الراتب</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>الشروط</Label><Textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>إنشاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : contracts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><FileText className="h-8 w-8 opacity-40" /><p className="text-sm">لا توجد عقود</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>النوع</TableHead><TableHead>البداية</TableHead><TableHead>النهاية</TableHead><TableHead>الراتب</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {contracts.map((c) => {
                    const days = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000) : null;
                    const endingSoon = days !== null && days >= 0 && days <= 30;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.employee?.full_name ?? '-'}</TableCell>
                        <TableCell>{CONTRACT_TYPE_LABELS[c.type as keyof typeof CONTRACT_TYPE_LABELS] ?? c.type}</TableCell>
                        <TableCell>{formatDateAr(c.start_date)}</TableCell>
                        <TableCell>{c.end_date ? formatDateAr(c.end_date) : '-'}{endingSoon && <Badge variant="warning" className="mr-2">{days} يوم</Badge>}</TableCell>
                        <TableCell>{new Intl.NumberFormat('ar-EG').format(c.salary)}</TableCell>
                        <TableCell><Badge variant={c.status === 'active' ? 'success' : c.status === 'terminated' || c.status === 'expired' ? 'destructive' : 'warning'}>{CONTRACT_STATUS_LABELS[c.status as keyof typeof CONTRACT_STATUS_LABELS] ?? c.status}</Badge></TableCell>
                        <TableCell>
                          {canManage && c.status !== 'terminated' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => renew(c.id)}><RefreshCw className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => terminate(c.id)}>إنهاء</Button>
                            </div>
                          )}
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
    </div>
  );
}