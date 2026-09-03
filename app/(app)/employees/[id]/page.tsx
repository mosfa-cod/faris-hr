 'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Pencil, Phone, Mail, MapPin, Calendar, User, Briefcase,
  Wallet, FileText, Upload, Trash2, Star, Clock, CalendarDays,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  formatDateAr, formatCurrency, initials,
} from '@/lib/format';
import {
  EMPLOYEE_STATUS_LABELS, ATTENDANCE_STATUS_LABELS, LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS, PAYROLL_STATUS_LABELS, TASK_STATUS_LABELS,
  type Employee, type Attendance, type Leave, type Payroll,
  type EmployeeDocument, type Task, type PerformanceReview,
  type EmployeeStatus,
} from '@/lib/types';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role, companyRole } = useAuth();
  const { toast } = useToast();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canEdit = hasPermission(role ?? undefined, 'employees.edit');
  const canManageDocs = hasPermission(role ?? undefined, 'documents.manage');

  useEffect(() => {
    (async () => {
      const id = params.id as string;
      if (!id || id === 'undefined') {
        setEmp(null);
        setLoading(false);
        return;
      }
      const [empRes, docRes, attRes, lvRes, prRes, tkRes, rvRes] = await Promise.all([
        supabase.from('employees').select('*, department:departments!employees_department_id_fkey(*), position:positions(*), branch:branches(*), manager:employees!manager_id(*)').eq('id', id).maybeSingle(),
        supabase.from('documents').select('*').eq('employee_id', id).order('uploaded_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('employee_id', id).order('date', { ascending: false }).limit(20),
        supabase.from('leaves').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('payroll').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(12),
        supabase.from('tasks').select('*').eq('assigned_to', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('performance_reviews').select('*').eq('employee_id', id).order('review_date', { ascending: false }).limit(10),
      ]);
      setEmp(empRes.data as Employee | null);
      setDocs((docRes.data ?? []) as EmployeeDocument[]);
      setAttendance((attRes.data ?? []) as Attendance[]);
      setLeaves((lvRes.data ?? []) as Leave[]);
      setPayrolls((prRes.data ?? []) as Payroll[]);
      setTasks((tkRes.data ?? []) as Task[]);
      setReviews((rvRes.data ?? []) as PerformanceReview[]);
      setLoading(false);
    })();
  }, [params.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file || !emp) return;
    setUploading(true);
    const path = `employees/${emp.id}/${type}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('employee-docs').upload(path, file);
    if (upErr) {
      toast({ title: 'خطأ', description: upErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('employee-docs').getPublicUrl(path);
    await supabase.from('documents').insert({
      employee_id: emp.id, type, name: file.name, storage_path: path, file_url: pub.publicUrl,
    });
    toast({ title: 'تم الرفع', description: 'تم رفع الملف بنجاح' });
    const { data } = await supabase.from('documents').select('*').eq('employee_id', emp.id).order('uploaded_at', { ascending: false });
    setDocs((data ?? []) as EmployeeDocument[]);
    setUploading(false);
  }

  async function handleDeleteDoc(id: string, path: string) {
    if (!confirm('حذف هذا الملف؟')) return;
    await supabase.storage.from('employee-docs').remove([path]);
    await supabase.from('documents').delete().eq('id', id);
    setDocs((d) => d.filter((x) => x.id !== id));
    toast({ title: 'تم الحذف' });
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground">جاري التحميل...</div>;
  if (!emp) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <p className="text-muted-foreground">لم يتم العثور على الموظف</p>
      <Button asChild variant="outline"><Link href="/employees"><ArrowRight className="ml-2 h-4 w-4" /> العودة لقائمة الموظفين</Link></Button>
    </div>
  );

  const docTypes = [
    { key: 'cv', label: 'السيرة الذاتية' },
    { key: 'contract', label: 'العقد' },
    { key: 'id', label: 'الهوية' },
    { key: 'certificate', label: 'الشهادات' },
    { key: 'other', label: 'مستندات أخرى' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/employees')}><ArrowRight className="ml-2 h-4 w-4" /> رجوع للقائمة</Button>
        {canEdit && <Button asChild><Link href={`/employees/${emp.id}/edit`}><Pencil className="ml-2 h-4 w-4" /> تعديل</Link></Button>}
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials(emp.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{emp.full_name}</h2>
            <p className="text-sm text-muted-foreground">{emp.position?.title_ar ?? emp.position?.title ?? '-'} — {emp.department?.name_ar ?? emp.department?.name ?? '-'}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {emp.employee_code}</span>
              {emp.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {emp.phone}</span>}
              {emp.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {emp.email}</span>}
            </div>
          </div>
          <Badge variant={emp.status === 'active' ? 'success' : 'destructive'} className="text-sm">
            {EMPLOYEE_STATUS_LABELS[emp.status as EmployeeStatus] ?? emp.status}
          </Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="documents">المستندات</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="reviews">التقييم</TabsTrigger>
        </TabsList>

        {/* Info */}
        <TabsContent value="info">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow icon={User} label="الرقم القومي" value={emp.national_id} />
              <InfoRow icon={Calendar} label="تاريخ الميلاد" value={formatDateAr(emp.birth_date)} />
              <InfoRow icon={User} label="الحالة الاجتماعية" value={emp.marital_status === 'single' ? 'أعزب' : emp.marital_status === 'married' ? 'متزوج' : emp.marital_status ?? '-'} />
              <InfoRow icon={Briefcase} label="المؤهل" value={emp.qualification} />
              <InfoRow icon={MapPin} label="العنوان" value={emp.address} />
              <InfoRow icon={Calendar} label="تاريخ التعيين" value={formatDateAr(emp.hire_date)} />
              <InfoRow icon={Briefcase} label="القسم" value={emp.department?.name_ar ?? emp.department?.name} />
              <InfoRow icon={Briefcase} label="الوظيفة" value={emp.position?.title_ar ?? emp.position?.title} />
              <InfoRow icon={User} label="المدير المباشر" value={emp.manager?.full_name} />
              {(companyRole === 'owner' || (companyRole as string) === 'manager') ? (
                <>
                  <InfoRow icon={Wallet} label="الراتب الأساسي" value={formatCurrency(emp.basic_salary)} />
                  <InfoRow icon={Wallet} label="البدلات" value={formatCurrency(emp.allowances)} />
                  <InfoRow icon={Wallet} label="الحساب البنكي" value={emp.bank_account} />
                </>
              ) : (
                <div className="col-span-2 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  البيانات المالية (الراتب، البدلات، الحساب البنكي) متاحة لمالك الشركة فقط
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الحضور والانصراف</CardTitle></CardHeader>
            <CardContent className="p-0">
              {attendance.length === 0 ? <EmptyState icon={Clock} text="لا يوجد سجل حضور" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الحضور</TableHead><TableHead>الانصراف</TableHead><TableHead>ساعات العمل</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {attendance.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDateAr(a.date)}</TableCell>
                        <TableCell>{a.check_in ? new Date(a.check_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                        <TableCell>{a.check_out ? new Date(a.check_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                        <TableCell>{a.work_hours}</TableCell>
                        <TableCell><Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : a.status === 'absent' ? 'destructive' : 'secondary'}>{ATTENDANCE_STATUS_LABELS[a.status as keyof typeof ATTENDANCE_STATUS_LABELS] ?? a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الإجازات</CardTitle></CardHeader>
            <CardContent className="p-0">
              {leaves.length === 0 ? <EmptyState icon={CalendarDays} text="لا توجد إجازات" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead><TableHead>الأيام</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{LEAVE_TYPE_LABELS[l.type as keyof typeof LEAVE_TYPE_LABELS] ?? l.type}</TableCell>
                        <TableCell>{formatDateAr(l.start_date)}</TableCell>
                        <TableCell>{formatDateAr(l.end_date)}</TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell><Badge variant={l.status === 'hr_approved' ? 'success' : l.status === 'rejected' ? 'destructive' : 'warning'}>{LEAVE_STATUS_LABELS[l.status as keyof typeof LEAVE_STATUS_LABELS] ?? l.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الرواتب</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payrolls.length === 0 ? <EmptyState icon={Wallet} text="لا توجد سجلات رواتب" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الشهر</TableHead><TableHead>الأساسي</TableHead><TableHead>البدلات</TableHead><TableHead>المكافآت</TableHead><TableHead>الخصومات</TableHead><TableHead>الصافي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payrolls.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.month}/{p.year}</TableCell>
                        <TableCell>{formatCurrency(p.basic_salary)}</TableCell>
                        <TableCell>{formatCurrency(p.allowances)}</TableCell>
                        <TableCell>{formatCurrency(p.bonuses)}</TableCell>
                        <TableCell>{formatCurrency(p.deductions)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(p.net_salary)}</TableCell>
                        <TableCell><Badge variant={p.status === 'paid' ? 'success' : p.status === 'approved' ? 'default' : 'secondary'}>{PAYROLL_STATUS_LABELS[p.status as keyof typeof PAYROLL_STATUS_LABELS] ?? p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <div className="space-y-4">
            {docTypes.map((dt) => (
              <Card key={dt.key}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm">{dt.label}</CardTitle>
                  {canManageDocs && (
                    <div>
                      <input type="file" id={`upload-${dt.key}`} className="hidden" onChange={(e) => handleUpload(e, dt.key)} />
                      <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById(`upload-${dt.key}`)?.click()}>
                        <Upload className="ml-2 h-4 w-4" /> رفع ملف
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {docs.filter((d) => d.type === dt.key).length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد ملفات</p>
                  ) : (
                    <div className="space-y-2">
                      {docs.filter((d) => d.type === dt.key).map((d) => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{d.name}</span>
                            <span className="text-xs text-muted-foreground">{formatDateAr(d.uploaded_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer"><Button variant="ghost" size="sm">عرض</Button></a>}
                            {canManageDocs && <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(d.id, d.storage_path)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-base">المهام المسندة</CardTitle></CardHeader>
            <CardContent className="p-0">
              {tasks.length === 0 ? <EmptyState icon={Clock} text="لا توجد مهام" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>المهمة</TableHead><TableHead>تاريخ الاستحقاق</TableHead><TableHead>النسبة</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{formatDateAr(t.due_date)}</TableCell>
                        <TableCell>{t.progress}%</TableCell>
                        <TableCell><Badge>{TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS] ?? t.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader><CardTitle className="text-base">تقييمات الأداء</CardTitle></CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? <EmptyState icon={Star} text="لا توجد تقييمات" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>السنة</TableHead><TableHead>التاريخ</TableHead><TableHead>التقييم</TableHead><TableHead>الأهداف</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.period}</TableCell>
                        <TableCell>{formatDateAr(r.review_date)}</TableCell>
                        <TableCell><Badge variant={r.rating && r.rating >= 4 ? 'success' : r.rating && r.rating >= 3 ? 'warning' : 'destructive'}>{r.rating ?? '-'}/5</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{r.goals ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof User; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}