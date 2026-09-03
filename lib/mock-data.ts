 import type { Employee, Leave, Contract, ActivityLog, Notification, Department, Attendance } from '@/lib/types';

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Engineering', name_ar: 'الهندسة' },
  { id: 'd2', name: 'Sales', name_ar: 'المبيعات' },
  { id: 'd3', name: 'HR', name_ar: 'الموارد البشرية' },
  { id: 'd4', name: 'Finance', name_ar: 'المالية' },
  { id: 'd5', name: 'Marketing', name_ar: 'التسويق' },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', employee_code: 'EMP-1001', full_name: 'أحمد محمد علي', department_id: 'd1', hire_date: '2024-01-15', basic_salary: 12000, allowances: 2000, status: 'active', email: 'ahmed@faris-hr.com', department: MOCK_DEPARTMENTS[0] },
  { id: 'e2', employee_code: 'EMP-1002', full_name: 'فاطمة الزهراء حسن', department_id: 'd2', hire_date: '2024-03-01', basic_salary: 9000, allowances: 1500, status: 'active', email: 'fatma@faris-hr.com', department: MOCK_DEPARTMENTS[1] },
  { id: 'e3', employee_code: 'EMP-1003', full_name: 'خالد إبراهيم سعد', department_id: 'd1', hire_date: '2023-11-20', basic_salary: 14000, allowances: 2500, status: 'active', email: 'khaled@faris-hr.com', department: MOCK_DEPARTMENTS[0] },
  { id: 'e4', employee_code: 'EMP-1004', full_name: 'نورا عبدالله محمد', department_id: 'd3', hire_date: '2024-05-10', basic_salary: 8000, allowances: 1200, status: 'active', email: 'nora@faris-hr.com', department: MOCK_DEPARTMENTS[2] },
  { id: 'e5', employee_code: 'EMP-1005', full_name: 'عمر سعيد القحطاني', department_id: 'd4', hire_date: '2023-08-01', basic_salary: 11000, allowances: 1800, status: 'active', email: 'omar@faris-hr.com', department: MOCK_DEPARTMENTS[3] },
  { id: 'e6', employee_code: 'EMP-1006', full_name: 'سارة أحمد محمود', department_id: 'd5', hire_date: '2024-02-14', basic_salary: 9500, allowances: 1600, status: 'active', email: 'sara@faris-hr.com', department: MOCK_DEPARTMENTS[4] },
  { id: 'e7', employee_code: 'EMP-1007', full_name: 'محمد عبدالرحمن يوسف', department_id: 'd2', hire_date: '2023-06-15', basic_salary: 10000, allowances: 1700, status: 'on_leave', email: 'mohamed@faris-hr.com', department: MOCK_DEPARTMENTS[1] },
  { id: 'e8', employee_code: 'EMP-1008', full_name: 'ليلى حسن العتيبي', department_id: 'd1', hire_date: '2024-07-01', basic_salary: 13000, allowances: 2200, status: 'active', email: 'laila@faris-hr.com', department: MOCK_DEPARTMENTS[0] },
  { id: 'e9', employee_code: 'EMP-1009', full_name: 'عبدالله ناصر الشهري', department_id: 'd4', hire_date: '2023-09-10', basic_salary: 8500, allowances: 1400, status: 'active', email: 'abdullah@faris-hr.com', department: MOCK_DEPARTMENTS[3] },
  { id: 'e10', employee_code: 'EMP-1010', full_name: 'ريم خالد المطيري', department_id: 'd3', hire_date: '2024-04-05', basic_salary: 7800, allowances: 1100, status: 'resigned', email: 'reem@faris-hr.com', department: MOCK_DEPARTMENTS[2] },
];

export const MOCK_LEAVES: Leave[] = [
  { id: 'l1', employee_id: 'e1', type: 'annual', start_date: '2026-08-10', end_date: '2026-08-14', days: 5, status: 'pending', employee: MOCK_EMPLOYEES[0], created_at: '2026-08-07' },
  { id: 'l2', employee_id: 'e2', type: 'sick', start_date: '2026-08-05', end_date: '2026-08-06', days: 2, status: 'hr_approved', employee: MOCK_EMPLOYEES[1], created_at: '2026-08-04' },
  { id: 'l3', employee_id: 'e3', type: 'emergency', start_date: '2026-08-08', end_date: '2026-08-09', days: 2, status: 'manager_approved', employee: MOCK_EMPLOYEES[2], created_at: '2026-08-07' },
  { id: 'l4', employee_id: 'e5', type: 'annual', start_date: '2026-08-15', end_date: '2026-08-20', days: 6, status: 'pending', employee: MOCK_EMPLOYEES[4], created_at: '2026-08-08' },
  { id: 'l5', employee_id: 'e6', type: 'unpaid', start_date: '2026-08-01', end_date: '2026-08-03', days: 3, status: 'rejected', employee: MOCK_EMPLOYEES[5], created_at: '2026-07-30' },
];

export const MOCK_CONTRACTS: Contract[] = [
  { id: 'c1', employee_id: 'e3', type: 'permanent', start_date: '2023-11-20', end_date: '2026-08-15', salary: 14000, status: 'active', employee: MOCK_EMPLOYEES[2] },
  { id: 'c2', employee_id: 'e5', type: 'temporary', start_date: '2023-08-01', end_date: '2026-08-20', salary: 11000, status: 'active', employee: MOCK_EMPLOYEES[4] },
  { id: 'c3', employee_id: 'e7', type: 'permanent', start_date: '2023-06-15', end_date: '2026-09-01', salary: 10000, status: 'active', employee: MOCK_EMPLOYEES[6] },
  { id: 'c4', employee_id: 'e9', type: 'temporary', start_date: '2023-09-10', end_date: '2026-08-25', salary: 8500, status: 'active', employee: MOCK_EMPLOYEES[8] },
  { id: 'c5', employee_id: 'e1', type: 'permanent', start_date: '2024-01-15', end_date: '2027-01-15', salary: 12000, status: 'active', employee: MOCK_EMPLOYEES[0] },
];

export const MOCK_LOGS: ActivityLog[] = [
  { id: 'log1', action: 'تم إضافة موظف جديد: ليلى حسن العتيبي', created_at: '2026-08-08T10:30:00' },
  { id: 'log2', action: 'تم اعتماد طلب إجازة لـ فاطمة الزهراء حسن', created_at: '2026-08-07T14:15:00' },
  { id: 'log3', action: 'تم تحديث بيانات الموظف: أحمد محمد علي', created_at: '2026-08-07T09:00:00' },
  { id: 'log4', action: 'تم إنشاء عقد جديد لعبدالله ناصر الشهري', created_at: '2026-08-06T16:45:00' },
  { id: 'log5', action: 'تسجيل دخول من قبل مدير الموارد البشرية', created_at: '2026-08-06T08:00:00' },
  { id: 'log6', action: 'تم إضافة قسم جديد: التسويق', created_at: '2026-08-05T11:20:00' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'عقد على وشك الانتهاء', body: 'عقد خالد إبراهيم سعد ينتهي خلال 6 أيام', read: false, created_at: '2026-08-08T08:00:00', link: '/contracts' },
  { id: 'n2', title: 'طلب إجازة جديد', body: 'أحمد محمد علي طلب إجازة سنوية لمدة 5 أيام', read: false, created_at: '2026-08-07T10:00:00', link: '/leaves' },
  { id: 'n3', title: 'موظف جديد انضم', body: 'ليلى حسن العتيبي انضمت لقسم الهندسة', read: true, created_at: '2026-08-01T09:00:00', link: '/employees' },
  { id: 'n4', title: 'تم اعتماد الرواتب', body: 'تم اعتماد رواتب شهر يوليو 2026', read: true, created_at: '2026-08-05T12:00:00', link: '/payroll' },
  { id: 'n5', title: 'تنبيه: غياب بدون إذن', body: 'ريم خالد المطيري غابت بدون إذن أمس', read: false, created_at: '2026-08-07T07:30:00', link: '/attendance' },
];

export const MOCK_STATS = {
  total: 10,
  active: 8,
  newHires: 3,
  resigned: 1,
  presentToday: 7,
  absentToday: 1,
  lateToday: 2,
  onLeave: 1,
  totalPayroll: 104500,
  endingContracts: 4,
};

export const MOCK_ATTENDANCE_TREND: { name: string; حاضر: number; متأخر: number; غائب: number }[] = [
  { name: '3/8', حاضر: 8, متأخر: 1, غائب: 1 },
  { name: '4/8', حاضر: 7, متأخر: 2, غائب: 1 },
  { name: '5/8', حاضر: 9, متأخر: 0, غائب: 1 },
  { name: '6/8', حاضر: 6, متأخر: 3, غائب: 1 },
  { name: '7/8', حاضر: 8, متأخر: 1, غائب: 1 },
  { name: '8/8', حاضر: 7, متأخر: 2, غائب: 1 },
  { name: '9/8', حاضر: 7, متأخر: 2, غائب: 1 },
];

export const MOCK_DEPT_DIST: { name: string; value: number }[] = [
  { name: 'الهندسة', value: 3 },
  { name: 'المبيعات', value: 2 },
  { name: 'الموارد البشرية', value: 2 },
  { name: 'المالية', value: 2 },
  { name: 'التسويق', value: 1 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function makeMockAttendance(): Attendance[] {
  const today = todayStr();
  const recs: Attendance[] = [];
  const statuses: ('present' | 'late' | 'absent')[] = ['present', 'present', 'present', 'present', 'late', 'late', 'absent'];
  MOCK_EMPLOYEES.slice(0, 7).forEach((emp, i) => {
    const s = statuses[i];
    recs.push({
      id: `att-${i}`,
      employee_id: emp.id,
      date: today,
      check_in: s === 'absent' ? undefined : `${today}T0${8 + (s === 'late' ? 1 : 0)}:${String(i % 6).padStart(2, '0')}:00Z`,
      check_out: s === 'absent' ? undefined : `${today}T16:${String((30 + i) % 60).padStart(2, '0')}:00Z`,
      work_hours: s === 'absent' ? 0 : 8,
      overtime_hours: i % 3 === 0 ? 1.5 : 0,
      late_minutes: s === 'late' ? 45 + i * 5 : 0,
      status: s,
      employee: emp,
    });
  });
  for (let d = 1; d <= 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const ds = date.toISOString().slice(0, 10);
    MOCK_EMPLOYEES.slice(0, 6).forEach((emp, i) => {
      const s = i === 2 ? 'late' : i === 5 ? 'absent' : 'present';
      recs.push({
        id: `att-${d}-${i}`,
        employee_id: emp.id,
        date: ds,
        check_in: s === 'absent' ? undefined : `${ds}T08:${String(i * 5).padStart(2, '0')}:00Z`,
        check_out: s === 'absent' ? undefined : `${ds}T16:${String((30 + i) % 60).padStart(2, '0')}:00Z`,
        work_hours: s === 'absent' ? 0 : 8,
        overtime_hours: i % 4 === 0 ? 2 : 0,
        late_minutes: s === 'late' ? 30 + i * 10 : 0,
        status: s,
        employee: emp,
      });
    });
  }
  return recs;
}

export const MOCK_ATTENDANCE: Attendance[] = makeMockAttendance();