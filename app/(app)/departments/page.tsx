'use client';

import { useEffect, useState } from 'react';
import { Plus, Building2, Network, GitBranch } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select as UISelect, SelectContent as UISelectContent, SelectItem as UISelectItem, SelectTrigger as UISelectTrigger, SelectValue as UISelectValue,
} from '@/components/ui/select';
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle, DialogFooter as UIDialogFooter } from '@/components/ui/dialog';
import { Tabs as UITabs, TabsList as UITabsList, TabsTrigger as UITabsTrigger, TabsContent as UITabsContent } from '@/components/ui/tabs';
import { Table as UITable, TableBody as UITableBody, TableCell as UITableCell, TableHead as UITableHead, TableHeader as UITableHeader, TableRow as UITableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/permissions';
import type { Department, Position, Branch, Employee } from '@/lib/types';

export default function DepartmentsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission(role ?? undefined, 'departments.manage');

  const [tab, setTab] = useState('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [depOpen, setDepOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [brOpen, setBrOpen] = useState(false);
  const [depForm, setDepForm] = useState({ name: '', name_ar: '', branch_id: '', manager_employee_id: '', description: '' });
  const [posForm, setPosForm] = useState({ title: '', title_ar: '', department_id: '', description: '' });
  const [brForm, setBrForm] = useState({ name: '', name_ar: '', address: '', phone: '', manager_name: '' });

  useEffect(() => {
    (async () => {
      const [dRes, pRes, bRes, eRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('positions').select('*').order('title'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('employees').select('id, full_name').order('full_name'),
      ]);
      setDepartments((dRes.data ?? []) as Department[]);
      setPositions((pRes.data ?? []) as Position[]);
      setBranches((bRes.data ?? []) as Branch[]);
      setEmployees((eRes.data ?? []) as Employee[]);
      setLoading(false);
    })();
  }, []);

  async function addDep() {
    if (!depForm.name) { toast({ title: 'أدخل الاسم', variant: 'destructive' }); return; }
    const { error } = await supabase.from('departments').insert({
      name: depForm.name, name_ar: depForm.name_ar, branch_id: depForm.branch_id || null,
      manager_employee_id: depForm.manager_employee_id || null, description: depForm.description,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تمت الإضافة' });
      setDepOpen(false);
      const { data } = await supabase.from('departments').select('*').order('name');
      setDepartments((data ?? []) as Department[]);
    }
  }

  async function addPos() {
    if (!posForm.title) { toast({ title: 'أدخل المسمى', variant: 'destructive' }); return; }
    const { error } = await supabase.from('positions').insert({
      title: posForm.title, title_ar: posForm.title_ar, department_id: posForm.department_id || null, description: posForm.description,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تمت الإضافة' });
      setPosOpen(false);
      const { data } = await supabase.from('positions').select('*').order('title');
      setPositions((data ?? []) as Position[]);
    }
  }

  async function addBr() {
    if (!brForm.name) { toast({ title: 'أدخل الاسم', variant: 'destructive' }); return; }
    const { error } = await supabase.from('branches').insert(brForm);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'تمت الإضافة' });
      setBrOpen(false);
      const { data } = await supabase.from('branches').select('*').order('name');
      setBranches((data ?? []) as Branch[]);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الأقسام والتنظيم" description="إدارة الأقسام، الوظائف، والفروع" />

      <UITabs value={tab} onValueChange={setTab}>
        <UITabsList>
          <UITabsTrigger value="departments">الأقسام</UITabsTrigger>
          <UITabsTrigger value="positions">الوظائف</UITabsTrigger>
          <UITabsTrigger value="branches">الفروع</UITabsTrigger>
          <UITabsTrigger value="org">الهيكل التنظيمي</UITabsTrigger>
        </UITabsList>

        <UITabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">الأقسام ({departments.length})</CardTitle>
              {canManage && <Button size="sm" onClick={() => setDepOpen(true)}><Plus className="ml-2 h-4 w-4" /> قسم جديد</Button>}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div> : (
                <UITable>
                  <UITableHeader><UITableRow><UITableHead>الاسم</UITableHead><UITableHead>الفرع</UITableHead><UITableHead>المدير</UITableHead><UITableHead>الوصف</UITableHead></UITableRow></UITableHeader>
                  <UITableBody>
                    {departments.map((d) => (
                      <UITableRow key={d.id}>
                        <UITableCell className="font-medium">{d.name_ar ?? d.name}</UITableCell>
                        <UITableCell>{branches.find((b) => b.id === d.branch_id)?.name_ar ?? branches.find((b) => b.id === d.branch_id)?.name ?? '-'}</UITableCell>
                        <UITableCell>{employees.find((e) => e.id === d.manager_employee_id)?.full_name ?? '-'}</UITableCell>
                        <UITableCell className="text-muted-foreground">{d.description ?? '-'}</UITableCell>
                      </UITableRow>
                    ))}
                  </UITableBody>
                </UITable>
              )}
            </CardContent>
          </Card>
        </UITabsContent>

        <UITabsContent value="positions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">الوظائف ({positions.length})</CardTitle>
              {canManage && <Button size="sm" onClick={() => setPosOpen(true)}><Plus className="ml-2 h-4 w-4" /> وظيفة جديدة</Button>}
            </CardHeader>
            <CardContent className="p-0">
              <UITable>
                <UITableHeader><UITableRow><UITableHead>المسمى</UITableHead><UITableHead>القسم</UITableHead><UITableHead>الوصف</UITableHead></UITableRow></UITableHeader>
                <UITableBody>
                  {positions.map((p) => (
                    <UITableRow key={p.id}>
                      <UITableCell className="font-medium">{p.title_ar ?? p.title}</UITableCell>
                      <UITableCell>{departments.find((d) => d.id === p.department_id)?.name_ar ?? '-'}</UITableCell>
                      <UITableCell className="text-muted-foreground">{p.description ?? '-'}</UITableCell>
                    </UITableRow>
                  ))}
                </UITableBody>
              </UITable>
            </CardContent>
          </Card>
        </UITabsContent>

        <UITabsContent value="branches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">الفروع ({branches.length})</CardTitle>
              {canManage && <Button size="sm" onClick={() => setBrOpen(true)}><Plus className="ml-2 h-4 w-4" /> فرع جديد</Button>}
            </CardHeader>
            <CardContent className="p-0">
              <UITable>
                <UITableHeader><UITableRow><UITableHead>الاسم</UITableHead><UITableHead>العنوان</UITableHead><UITableHead>الهاتف</UITableHead><UITableHead>المدير</UITableHead></UITableRow></UITableHeader>
                <UITableBody>
                  {branches.map((b) => (
                    <UITableRow key={b.id}>
                      <UITableCell className="font-medium">{b.name_ar ?? b.name}</UITableCell>
                      <UITableCell className="text-muted-foreground">{b.address ?? '-'}</UITableCell>
                      <UITableCell className="text-muted-foreground">{b.phone ?? '-'}</UITableCell>
                      <UITableCell className="text-muted-foreground">{b.manager_name ?? '-'}</UITableCell>
                    </UITableRow>
                  ))}
                </UITableBody>
              </UITable>
            </CardContent>
          </Card>
        </UITabsContent>

        <UITabsContent value="org">
          <Card>
            <CardHeader><CardTitle className="text-base">الهيكل التنظيمي</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {branches.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{b.name_ar ?? b.name}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {departments.filter((d) => d.branch_id === b.id).map((d) => (
                        <div key={d.id} className="rounded-lg bg-muted/50 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-accent" />
                            <span className="text-sm font-medium">{d.name_ar ?? d.name}</span>
                          </div>
                          <div className="space-y-1">
                            {positions.filter((p) => p.department_id === d.id).map((p) => (
                              <div key={p.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Network className="h-3 w-3" /> {p.title_ar ?? p.title}
                              </div>
                            ))}
                            {positions.filter((p) => p.department_id === d.id).length === 0 && (
                              <span className="text-xs text-muted-foreground">لا توجد وظائف</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {departments.filter((d) => d.branch_id === b.id).length === 0 && (
                        <span className="text-xs text-muted-foreground">لا توجد أقسام</span>
                      )}
                    </div>
                  </div>
                ))}
                {branches.length === 0 && <div className="py-8 text-center text-muted-foreground">لا توجد فروع</div>}
              </div>
            </CardContent>
          </Card>
        </UITabsContent>
      </UITabs>

      {/* Dialogs */}
      <UIDialog open={depOpen} onOpenChange={setDepOpen}>
        <UIDialogContent>
          <UIDialogHeader><UIDialogTitle>قسم جديد</UIDialogTitle></UIDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>الاسم (إنجليزي)</Label><Input value={depForm.name} onChange={(e) => setDepForm({ ...depForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>الاسم (عربي)</Label><Input value={depForm.name_ar} onChange={(e) => setDepForm({ ...depForm, name_ar: e.target.value })} /></div>
            <div className="space-y-2"><Label>الفرع</Label><UISelect value={depForm.branch_id} onValueChange={(v) => setDepForm({ ...depForm, branch_id: v })}><UISelectTrigger><UISelectValue placeholder="اختر" /></UISelectTrigger><UISelectContent>{branches.map((b) => <UISelectItem key={b.id} value={b.id}>{b.name_ar ?? b.name}</UISelectItem>)}</UISelectContent></UISelect></div>
            <div className="space-y-2"><Label>مدير القسم</Label><UISelect value={depForm.manager_employee_id} onValueChange={(v) => setDepForm({ ...depForm, manager_employee_id: v })}><UISelectTrigger><UISelectValue placeholder="اختر" /></UISelectTrigger><UISelectContent>{employees.map((e) => <UISelectItem key={e.id} value={e.id}>{e.full_name}</UISelectItem>)}</UISelectContent></UISelect></div>
            <div className="space-y-2"><Label>الوصف</Label><Textarea rows={2} value={depForm.description} onChange={(e) => setDepForm({ ...depForm, description: e.target.value })} /></div>
          </div>
          <UIDialogFooter><Button onClick={addDep}>إضافة</Button></UIDialogFooter>
        </UIDialogContent>
      </UIDialog>

      <UIDialog open={posOpen} onOpenChange={setPosOpen}>
        <UIDialogContent>
          <UIDialogHeader><UIDialogTitle>وظيفة جديدة</UIDialogTitle></UIDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>المسمى (إنجليزي)</Label><Input value={posForm.title} onChange={(e) => setPosForm({ ...posForm, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>المسمى (عربي)</Label><Input value={posForm.title_ar} onChange={(e) => setPosForm({ ...posForm, title_ar: e.target.value })} /></div>
            <div className="space-y-2"><Label>القسم</Label><UISelect value={posForm.department_id} onValueChange={(v) => setPosForm({ ...posForm, department_id: v })}><UISelectTrigger><UISelectValue placeholder="اختر" /></UISelectTrigger><UISelectContent>{departments.map((d) => <UISelectItem key={d.id} value={d.id}>{d.name_ar ?? d.name}</UISelectItem>)}</UISelectContent></UISelect></div>
            <div className="space-y-2"><Label>الوصف</Label><Textarea rows={2} value={posForm.description} onChange={(e) => setPosForm({ ...posForm, description: e.target.value })} /></div>
          </div>
          <UIDialogFooter><Button onClick={addPos}>إضافة</Button></UIDialogFooter>
        </UIDialogContent>
      </UIDialog>

      <UIDialog open={brOpen} onOpenChange={setBrOpen}>
        <UIDialogContent>
          <UIDialogHeader><UIDialogTitle>فرع جديد</UIDialogTitle></UIDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>الاسم (إنجليزي)</Label><Input value={brForm.name} onChange={(e) => setBrForm({ ...brForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>الاسم (عربي)</Label><Input value={brForm.name_ar} onChange={(e) => setBrForm({ ...brForm, name_ar: e.target.value })} /></div>
            <div className="space-y-2"><Label>العنوان</Label><Input value={brForm.address} onChange={(e) => setBrForm({ ...brForm, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>الهاتف</Label><Input value={brForm.phone} onChange={(e) => setBrForm({ ...brForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>المدير</Label><Input value={brForm.manager_name} onChange={(e) => setBrForm({ ...brForm, manager_name: e.target.value })} /></div>
          </div>
          <UIDialogFooter><Button onClick={addBr}>إضافة</Button></UIDialogFooter>
        </UIDialogContent>
      </UIDialog>
    </div>
  );
}
