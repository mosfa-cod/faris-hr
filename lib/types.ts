export type RoleName =
  | 'system_admin'
  | 'hr_manager'
  | 'employee_affairs'
  | 'accountant'
  | 'direct_manager'
  | 'employee';

export const ROLE_LABELS: Record<RoleName, string> = {
  system_admin: 'مدير النظام',
  hr_manager: 'مدير الموارد البشرية',
  employee_affairs: 'مسؤول شؤون الموظفين',
  accountant: 'المحاسب',
  direct_manager: 'المدير المباشر',
  employee: 'الموظف',
};

// ===== SaaS Multi-Tenancy: Company + Membership =====

export interface Company {
  id: string;
  name: string;
  name_ar?: string;
  logo_url?: string;
  plan: 'free' | 'pro' | 'enterprise';
  max_employees: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export type CompanyRole =
  | 'owner'
  | 'hr_attendance'
  | 'hr_payroll'
  | 'hr_recruitment'
  | 'hr_manager'
  | 'direct_manager'
  | 'employee';

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'مالك الشركة',
  hr_attendance: 'مسؤول الحضور والانصراف',
  hr_payroll: 'مسؤول الرواتب والحسابات',
  hr_recruitment: 'مسؤول التوظيف',
  hr_manager: 'مدير الموارد البشرية',
  direct_manager: 'المدير المباشر',
  employee: 'موظف',
};

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id?: string;
  role: CompanyRole;
  status: 'active' | 'invited' | 'disabled';
  invited_email?: string;
  created_at?: string;
  company?: Company;
}

export interface Role {
  id: string;
  name: RoleName;
  name_ar: string;
  description?: string;
}

export interface Branch {
  id: string;
  name: string;
  name_ar?: string;
  address?: string;
  phone?: string;
  manager_name?: string;
}

export interface Department {
  id: string;
  name: string;
  name_ar?: string;
  branch_id?: string;
  manager_employee_id?: string;
  description?: string;
}

export interface Position {
  id: string;
  title: string;
  title_ar?: string;
  department_id?: string;
  description?: string;
}

export type EmployeeStatus = 'active' | 'on_leave' | 'resigned' | 'terminated';

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'نشط',
  on_leave: 'في إجازة',
  resigned: 'مستقيل',
  terminated: 'منتهي',
};

export interface Employee {
  id: string;
  user_id?: string;
  employee_code: string;
  full_name: string;
  photo_url?: string;
  national_id?: string;
  phone?: string;
  email?: string;
  address?: string;
  birth_date?: string;
  marital_status?: string;
  qualification?: string;
  department_id?: string;
  position_id?: string;
  branch_id?: string;
  manager_id?: string;
  company_id?: string;
  hire_date: string;
  basic_salary: number;
  allowances: number;
  bank_account?: string;
  status: EmployeeStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // joined relations
  department?: Department;
  position?: Position;
  branch?: Branch;
  manager?: Employee;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  type: string;
  name: string;
  storage_path: string;
  file_url?: string;
  uploaded_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  leave: 'إجازة',
  holiday: 'عطلة',
};

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  work_hours: number;
  overtime_hours: number;
  late_minutes: number;
  status: AttendanceStatus;
  notes?: string;
  employee?: Employee;
}

export interface WorkSchedule {
  id: string;
  company_id?: string;
  name: string;
  start_time: string;
  end_time: string;
  work_days: string[];
  break_minutes: number;
  created_at?: string;
}

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'سنوية',
  sick: 'مرضية',
  emergency: 'اضطرارية',
  unpaid: 'بدون راتب',
};

export type LeaveStatus =
  | 'pending'
  | 'manager_approved'
  | 'hr_approved'
  | 'rejected'
  | 'cancelled';

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'قيد الانتظار',
  manager_approved: 'معتمد من المدير',
  hr_approved: 'معتمد من الموارد البشرية',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export interface Leave {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  manager_id?: string;
  manager_decision?: string;
  manager_decision_at?: string;
  hr_decision?: string;
  hr_decision_at?: string;
  balance_annual?: number;
  created_at?: string;
  employee?: Employee;
}

export type PayrollStatus = 'draft' | 'approved' | 'paid';

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  paid: 'مدفوع',
};

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  loans: number;
  overtime_pay: number;
  net_salary: number;
  status: PayrollStatus;
  created_at?: string;
  employee?: Employee;
}

export interface Bonus {
  id: string;
  employee_id: string;
  amount: number;
  reason?: string;
  date: string;
}

export interface Deduction {
  id: string;
  employee_id: string;
  amount: number;
  reason?: string;
  date: string;
}

export interface Loan {
  id: string;
  employee_id: string;
  amount: number;
  installments: number;
  paid_amount: number;
  date: string;
  status: 'active' | 'settled';
  notes?: string;
}

export type ContractType = 'permanent' | 'temporary' | 'daily' | 'project';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: 'دائم',
  temporary: 'مؤقت',
  daily: 'يومي',
  project: 'مشروع',
};

export type ContractStatus = 'active' | 'expired' | 'terminated' | 'renewed';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'ساري',
  expired: 'منتهي',
  terminated: 'ملغي',
  renewed: 'مجدد',
};

export interface Contract {
  id: string;
  employee_id: string;
  type: ContractType;
  start_date: string;
  end_date?: string;
  salary: number;
  status: ContractStatus;
  terms?: string;
  created_at?: string;
  employee?: Employee;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'غير مبدوء',
  in_progress: 'قيد التنفيذ',
  done: 'مكتمل',
  cancelled: 'ملغي',
};

export interface TaskComment {
  author: string;
  text: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by?: string;
  start_date: string;
  due_date: string;
  progress: number;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  comments: TaskComment[];
  created_at?: string;
  employee?: Employee;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id?: string;
  period?: string;
  review_date: string;
  rating?: number;
  goals?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  employee?: Employee;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type?: string;
}

// ===== Advanced modules =====

export type LoanRequestStatus = 'pending' | 'approved' | 'rejected';
export const LOAN_REQUEST_STATUS_LABELS: Record<LoanRequestStatus, string> = {
  pending: 'قيد الانتظار',
  approved: 'موافق',
  rejected: 'مرفوض',
};

export interface LoanRequest {
  id: string;
  employee_id: string;
  amount: number;
  reason?: string;
  installments: number;
  status: LoanRequestStatus;
  hr_decision?: string;
  decided_at?: string;
  created_at?: string;
  employee?: Employee;
}

export type ApplicantStatus = 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  applied: 'تم التقديم',
  screening: 'فرز',
  interview: 'مقابلة',
  offered: 'تم عرض العمل',
  hired: 'تم التعيين',
  rejected: 'مرفوض',
};

export interface Applicant {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  position_applied?: string;
  department_id?: string;
  status: ApplicantStatus;
  cv_path?: string;
  cv_url?: string;
  notes?: string;
  applied_at?: string;
  department?: Department;
}

export interface Kpi {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  target: number;
  actual: number;
  weight: number;
  period?: string;
  score: number;
  created_at?: string;
  updated_at?: string;
  employee?: Employee;
}

export type WarningType = 'verbal' | 'written' | 'suspension' | 'termination';
export const WARNING_TYPE_LABELS: Record<WarningType, string> = {
  verbal: 'إنذار شفوي',
  written: 'إنذار كتابي',
  suspension: 'إيقاف عن العمل',
  termination: 'إنهاء خدمة',
};

export type WarningStatus = 'active' | 'revoked';
export const WARNING_STATUS_LABELS: Record<WarningStatus, string> = {
  active: 'ساري',
  revoked: 'ملغي',
};

export interface Warning {
  id: string;
  employee_id: string;
  type: WarningType;
  reason: string;
  date: string;
  issued_by?: string;
  labor_law_ref?: string;
  status: WarningStatus;
  notes?: string;
  created_at?: string;
  employee?: Employee;
}
