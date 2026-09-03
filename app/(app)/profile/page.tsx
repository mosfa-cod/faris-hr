 'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Phone, Calendar, Briefcase, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { formatDateAr, formatCurrency, initials } from '@/lib/format';
import { EMPLOYEE_STATUS_LABELS, ROLE_LABELS, type Employee } from '@/lib/types';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('employees').select('*, department:departments!employees_department_id_fkey(*), position:positions(*)').eq('user_id', user.id).maybeSingle();
      setEmployee(data as Employee | null);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="الملف الشخصي" description="بياناتك في النظام" />

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {employee ? initials(employee.full_name) : user?.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{employee?.full_name ?? user?.email}</h2>
            <p className="text-sm text-muted-foreground">{employee?.position?.title_ar ?? employee?.position?.title ?? 'موظف'}</p>
            {role && <Badge variant="default" className="mt-2">{ROLE_LABELS[role]}</Badge>}
          </div>
        </CardContent>
      </Card>

      {employee && (
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={User} label="الرقم الوظيفي" value={employee.employee_code} />
            <InfoRow icon={Mail} label="البريد" value={employee.email} />
            <InfoRow icon={Phone} label="الهاتف" value={employee.phone} />
            <InfoRow icon={Calendar} label="تاريخ التعيين" value={formatDateAr(employee.hire_date)} />
            <InfoRow icon={Briefcase} label="القسم" value={employee.department?.name_ar ?? employee.department?.name} />
            <InfoRow icon={Briefcase} label="الوظيفة" value={employee.position?.title_ar ?? employee.position?.title} />
            <InfoRow icon={Wallet} label="الراتب الأساسي" value={formatCurrency(employee.basic_salary)} />
            <InfoRow icon={Wallet} label="البدلات" value={formatCurrency(employee.allowances)} />
            <InfoRow icon={User} label="الحالة" value={EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || '-'}</p></div>
    </div>
  );
}