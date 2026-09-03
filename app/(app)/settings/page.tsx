'use client';

import { useEffect, useState, useCallback } from 'react';
import { Save, Building2, Clock, Users, UserPlus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { hasPermission, hasCompanyPermission } from '@/lib/permissions';
import { COMPANY_ROLE_LABELS, type Setting, type CompanyMember, type CompanyRole } from '@/lib/types';

const COMPANY_ROLES: CompanyRole[] = ['owner', 'hr_manager', 'hr_attendance', 'hr_payroll', 'hr_recruitment', 'direct_manager', 'employee'];

export default function SettingsPage() {
  const { role, company, companyRole, user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<CompanyRole>('employee');

  const canManageSettings = hasPermission(role ?? undefined, 'settings.manage') || hasCompanyPermission(companyRole ?? undefined, 'company.manage');
  const canManageCompany = hasCompanyPermission(companyRole ?? undefined, 'company.manage');

  const loadMembers = useCallback(async () => {
    if (!company) return;
    const { data } = await supabase
      .from('company_members')
      .select('*, company:companies(*)')
      .eq('company_id', company.id)
      .order('created_at');
    setMembers((data ?? []) as CompanyMember[]);
  }, [company]);

  useEffect(() => {
    (async () => {
      if (!company) { setLoading(false); return; }
      const { data } = await supabase.from('settings').select('*').eq('company_id', company.id);
      const map: Record<string, string> = {};
      (data ?? []).forEach((s: Setting) => { map[s.key] = s.value ?? ''; });
      setSettings(map);
      await loadMembers();
      setLoading(false);
    })();
  }, [company, loadMembers]);

  if (!canManageSettings) {
    return <div className="py-12 text-center text-muted-foreground">لا تملك صلاحية الوصول لهذه الصفحة</div>;
  }

  async function save() {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('settings').upsert(
        { key, value, updated_at: new Date().toISOString(), company_id: company?.id },
        { onConflict: 'key' }
      );
    }
    setSaving(false);
    toast({ title: 'تم حفظ الإعدادات' });
  }

  async function inviteMember() {
    if (!newEmail || !company) return;
    const { error } = await supabase.from('company_members').insert({
      company_id: company.id,
      role: newRole,
      status: 'invited',
      invited_email: newEmail,
    });
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'تم إرسال الدعوة' });
    setNewEmail('');
    await loadMembers();
  }

  async function updateMemberRole(id: string, r: CompanyRole) {
    const { error } = await supabase.from('company_members').update({ role: r }).eq('id', id);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); return; }
    await loadMembers();
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from('company_members').delete().eq('id', id);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); return; }
    await loadMembers();
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" description="إعدادات النظام والشركة" actions={
        <Button onClick={save} disabled={saving}><Save className="ml-2 h-4 w-4" /> {saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
      } />

      {canManageCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5" /> بيانات الشركة</CardTitle>
            <CardDescription>المعلومات الأساسية لشركتك</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input value={company?.name_ar ?? company?.name ?? ''} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>الخطة</Label>
              <Input value={company?.plan ?? 'free'} readOnly className="bg-muted/50" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" /> ساعات العمل</CardTitle>
          <CardDescription>إعدادات دوام العمل</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>بداية الدوام</Label><Input type="time" value={settings.work_start ?? ''} onChange={(e) => setSettings({ ...settings, work_start: e.target.value })} /></div>
          <div className="space-y-2"><Label>نهاية الدوام</Label><Input type="time" value={settings.work_end ?? ''} onChange={(e) => setSettings({ ...settings, work_end: e.target.value })} /></div>
          <div className="space-y-2"><Label>سماح التأخير (دقائق)</Label><Input type="number" value={settings.late_grace_minutes ?? ''} onChange={(e) => setSettings({ ...settings, late_grace_minutes: e.target.value })} /></div>
          <div className="space-y-2"><Label>رصيد الإجازة السنوية</Label><Input type="number" value={settings.annual_leave_balance ?? ''} onChange={(e) => setSettings({ ...settings, annual_leave_balance: e.target.value })} /></div>
        </CardContent>
      </Card>

      {canManageCompany && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" /> أعضاء الشركة والصلاحيات</CardTitle>
            <CardDescription>إدارة أعضاء شركتك وتحديد صلاحياتهم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input type="email" placeholder="بريد العضو للدعوة" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1 min-w-[200px]" />
              <Select value={newRole} onValueChange={(v) => setNewRole(v as CompanyRole)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_ROLES.map((r) => <SelectItem key={r} value={r}>{COMPANY_ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={inviteMember}><UserPlus className="ml-2 h-4 w-4" /> دعوة</Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البريد / المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.invited_email ?? m.user_id ?? '-'}</TableCell>
                      <TableCell>
                        <Select value={m.role} onValueChange={(v) => updateMemberRole(m.id, v as CompanyRole)} disabled={m.user_id === user?.id}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_ROLES.map((r) => <SelectItem key={r} value={r}>{COMPANY_ROLE_LABELS[r]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Badge variant={m.status === 'active' ? 'success' : 'secondary'}>{m.status === 'active' ? 'نشط' : 'مدعو'}</Badge></TableCell>
                      <TableCell>
                        {m.user_id !== user?.id && (
                          <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
