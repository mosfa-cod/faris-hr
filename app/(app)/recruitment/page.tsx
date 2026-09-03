 'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';
import { formatDateAr } from '@/lib/format';
import { APPLICANT_STATUS_LABELS, type Applicant, type ApplicantStatus, type Department } from '@/lib/types';

export default function RecruitmentPage() {
  const { role, company, companyRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission(role ?? undefined, 'recruitment.manage');

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', position_applied: '', department_id: '', notes: '' });
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const [aRes, dRes] = await Promise.all([
        supabase.from('applicants').select('*, department:departments(*)').order('applied_at', { ascending: false }),
        supabase.from('departments').select('*').order('name'),
      ]);
      setApplicants((aRes.data ?? []) as Applicant[]);
      setDepartments((dRes.data ?? []) as Department[]);
      setLoading(false);
    })();
  }, []);

  async function handleSubmit() {
    if (!form.full_name) { toast({ title: 'أدخل الاسم', variant: 'destructive' }); return; }
    let cvPath: string | undefined;
    let cvUrl: string | undefined;
    if (cvFile) {
      setUploading(true);
      const path = `applicants/${Date.now()}-${cvFile.name}`;
      const { error: upErr } = await supabase.storage.from('employee-docs').upload(path, cvFile);
      if (upErr) { toast({ title: 'خطأ رفع الملف', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
      const { data: pub } = supabase.storage.from('employee-docs').getPublicUrl(path);
      cvPath = path; cvUrl = pub.publicUrl;
      setUploading(false);
    }
    const { error } = await supabase.from('applicants').insert({
      full_name: form.full_name, email: form.email, phone: form.phone,
      position_applied: form.position_applied, department_id: form.department_id || null,
      notes: form.notes, cv_path: cvPath, cv_url: cvUrl, status: 'applied', company_id: company?.id,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تم تسجيل المتقدم' });
      setOpen(false);
      setCvFile(null);
      setForm({ full_name: '', email: '', phone: '', position_applied: '', department_id: '', notes: '' });
      const { data } = await supabase.from('applicants').select('*, department:departments(*)').order('applied_at', { ascending: false });
      setApplicants((data ?? []) as Applicant[]);
    }
  }

  async function generateEmployeeCode(): Promise<string> {
    if (!company) return `EMP-${Date.now().toString().slice(-4)}`;
    const { data } = await supabase
      .from('employees')
      .select('employee_code')
      .eq('company_id', company.id)
      .like('employee_code', 'EMP-%');
    const maxNum = (data ?? []).reduce((max, row) => {
      const match = /^EMP-(\d+)$/.exec(row.employee_code ?? '');
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 1000);
    return `EMP-${maxNum + 1}`;
  }

  async function hireApplicant(applicant: Applicant) {
    if (!company) { toast({ title: 'تعذر تحديد الشركة الحالية', variant: 'destructive' }); return; }
    const code = await generateEmployeeCode();
    const { error } = await supabase.from('employees').insert({
      company_id: company.id,
      employee_code: code,
      full_name: applicant.full_name,
      email: applicant.email || undefined,
      phone: applicant.phone || undefined,
      department_id: applicant.department_id || undefined,
      hire_date: new Date().toISOString().slice(0, 10),
      status: 'active',
      notes: applicant.position_applied ? `الوظيفة عند التقديم: ${applicant.position_applied}` : undefined,
    });
    if (error) {
      toast({ title: 'تعذر إنشاء سجل الموظف', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم إنشاء الموظف', description: `${applicant.full_name} أُضيف إلى صفحة الموظفين برقم ${code}. أكمل باقي بياناته (الراتب، الوظيفة، القسم) من هناك.` });
    }
  }

  async function updateStatus(id: string, status: ApplicantStatus) {
    const applicant = applicants.find((a) => a.id === id);
    if (status === 'hired' && applicant) {
      const confirmed = window.confirm(`سيتم إنشاء سجل موظف جديد لـ "${applicant.full_name}" في صفحة الموظفين تلقائياً. هل تريد المتابعة؟`);
      if (!confirmed) return;
    }
    await supabase.from('applicants').update({ status }).eq('id', id);
    setApplicants((a) => a.map((x) => x.id === id ? { ...x, status } : x));
    toast({ title: 'تم تحديث الحالة' });
    if (status === 'hired' && applicant) {
      await hireApplicant(applicant);
    }
  }

  async function deleteApplicant(id: string, cvPath?: string) {
    if (!confirm('حذف هذا المتقدم؟')) return;
    if (cvPath) await supabase.storage.from('employee-docs').remove([cvPath]);
    await supabase.from('applicants').delete().eq('id', id);
    setApplicants((a) => a.filter((x) => x.id !== id));
    toast({ title: 'تم الحذف' });
  }

  const counts = {
    applied: applicants.filter((a) => a.status === 'applied').length,
    interview: applicants.filter((a) => a.status === 'interview').length,
    offered: applicants.filter((a) => a.status === 'offered').length,
    hired: applicants.filter((a) => a.status === 'hired').length,
  };

  const canView = companyRole === 'owner' || hasPermission(role ?? undefined, 'recruitment.view') || hasPermission(role ?? undefined, 'recruitment.manage');
  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-lg font-semibold">لا تملك صلاحية الوصول لهذه الصفحة</p>
        <p className="text-sm">بيانات المتقدمين للوظائف متاحة لمالك الشركة فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التوظيف"
        description={`${applicants.length} متقدم — ${counts.applied} جديد — ${counts.interview} مقابلة — ${counts.hired} تم التعيين`}
        actions={canManage && <Button onClick={() => setOpen(true)}><UserPlus className="ml-2 h-4 w-4" /> إضافة متقدم</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تسجيل متقدم جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>الاسم الكامل *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>الوظيفة المتقدم لها</Label><Input value={form.position_applied} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} /></div>
              <div className="space-y-2"><Label>البريد</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>القسم</Label><Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}><SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger><SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name_ar ?? d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>السيرة الذاتية (PDF/Word)</Label><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>ملاحظات</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={uploading}>{uploading ? 'جاري الرفع...' : 'حفظ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div> : applicants.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><UserPlus className="h-8 w-8 opacity-40" /><p className="text-sm">لا يوجد متقدمون</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الوظيفة</TableHead><TableHead>القسم</TableHead><TableHead>الهاتف</TableHead><TableHead>التاريخ</TableHead><TableHead>السيرة</TableHead><TableHead>الحالة</TableHead>{canManage && <TableHead>إجراءات</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {applicants.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell>{a.position_applied ?? '-'}</TableCell>
                      <TableCell>{a.department?.name_ar ?? a.department?.name ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{a.phone ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateAr(a.applied_at)}</TableCell>
                      <TableCell>{a.cv_url ? <a href={a.cv_url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><FileText className="h-4 w-4" /></Button></a> : '-'}</TableCell>
                      <TableCell>
                        {canManage ? (
                          <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as ApplicantStatus)}>
                            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{(Object.keys(APPLICANT_STATUS_LABELS) as ApplicantStatus[]).map((s) => <SelectItem key={s} value={s}>{APPLICANT_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={a.status === 'hired' ? 'success' : a.status === 'rejected' ? 'destructive' : a.status === 'offered' ? 'default' : 'secondary'}>
                            {APPLICANT_STATUS_LABELS[a.status as keyof typeof APPLICANT_STATUS_LABELS] ?? a.status}
                          </Badge>
                        )}
                      </TableCell>
                      {canManage && <TableCell><Button size="icon" variant="ghost" onClick={() => deleteApplicant(a.id, a.cv_path)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
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