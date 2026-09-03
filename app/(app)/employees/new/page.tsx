'use client';

import { EmployeeForm } from '@/components/employees/employee-form';
import { PageHeader } from '@/components/page-header';

export default function NewEmployeePage() {
  return (
    <div>
      <PageHeader title="إضافة موظف جديد" description="أدخل بيانات الموظف" />
      <EmployeeForm />
    </div>
  );
}
