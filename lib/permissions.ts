 import type { RoleName, CompanyRole } from './types';

export type Permission =
  | 'dashboard.view'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'documents.manage'
  | 'attendance.view'
  | 'attendance.manage'
  | 'leaves.view'
  | 'leaves.request'
  | 'leaves.approve_manager'
  | 'leaves.approve_hr'
  | 'payroll.view'
  | 'payroll.manage'
  | 'payroll.export'
  | 'contracts.view'
  | 'contracts.manage'
  | 'tasks.view'
  | 'tasks.manage'
  | 'reviews.view'
  | 'reviews.manage'
  | 'departments.view'
  | 'departments.manage'
  | 'reports.view'
  | 'notifications.view'
  | 'settings.manage'
  | 'ai.use'
  | 'activity_logs.view'
  | 'self_service.view'
  | 'recruitment.view'
  | 'recruitment.manage'
  | 'kpis.view'
  | 'kpis.manage'
  | 'warnings.view'
  | 'warnings.manage'
  | 'company.manage';

const ALL: Permission[] = [
  'dashboard.view',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'documents.manage',
  'attendance.view', 'attendance.manage',
  'leaves.view', 'leaves.request', 'leaves.approve_manager', 'leaves.approve_hr',
  'payroll.view', 'payroll.manage', 'payroll.export',
  'contracts.view', 'contracts.manage',
  'tasks.view', 'tasks.manage',
  'reviews.view', 'reviews.manage',
  'departments.view', 'departments.manage',
  'reports.view',
  'notifications.view',
  'settings.manage',
  'ai.use',
  'activity_logs.view',
  'self_service.view',
  'recruitment.view', 'recruitment.manage',
  'kpis.view', 'kpis.manage',
  'warnings.view', 'warnings.manage',
];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  system_admin: ALL,
  hr_manager: [
    'dashboard.view',
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'documents.manage',
    'attendance.view', 'attendance.manage',
    'leaves.view', 'leaves.approve_hr',
    'payroll.view', 'payroll.manage', 'payroll.export',
    'contracts.view', 'contracts.manage',
    'tasks.view', 'tasks.manage',
    'reviews.view', 'reviews.manage',
    'departments.view', 'departments.manage',
    'reports.view', 'notifications.view',
    'ai.use', 'activity_logs.view',
    'self_service.view',
    'recruitment.view', 'recruitment.manage',
    'kpis.view', 'kpis.manage',
    'warnings.view', 'warnings.manage',
  ],
  employee_affairs: [
    'dashboard.view',
    'employees.view', 'employees.create', 'employees.edit',
    'documents.manage',
    'attendance.view',
    'leaves.view',
    'contracts.view',
    'tasks.view',
    'departments.view',
    'reports.view', 'notifications.view',
    'ai.use',
    'self_service.view',
    'recruitment.view', 'recruitment.manage',
    'kpis.view',
    'warnings.view', 'warnings.manage',
  ],
  accountant: [
    'dashboard.view',
    'employees.view',
    'attendance.view',
    'payroll.view', 'payroll.manage', 'payroll.export',
    'reports.view', 'notifications.view',
  ],
  direct_manager: [
    'dashboard.view',
    'employees.view',
    'attendance.view',
    'leaves.view', 'leaves.approve_manager',
    'tasks.view', 'tasks.manage',
    'reviews.view', 'reviews.manage',
    'reports.view', 'notifications.view',
    'kpis.view', 'kpis.manage',
  ],
  employee: [
    'dashboard.view',
    'leaves.view', 'leaves.request',
    'attendance.view',
    'tasks.view',
    'notifications.view',
    'self_service.view',
    'kpis.view',
  ],
};

export function hasPermission(role: RoleName | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

// ===== SaaS: Company-role-based permissions =====

const COMPANY_OWNER_PERMS: Permission[] = [
  ...ALL,
  'company.manage',
];

const COMPANY_HR_ATTENDANCE_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view',
  'attendance.view', 'attendance.manage',
  'leaves.view',
  'reports.view', 'notifications.view',
  'self_service.view',
];

const COMPANY_HR_PAYROLL_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view',
  'attendance.view',
  'payroll.view', 'payroll.manage', 'payroll.export',
  'reports.view', 'notifications.view',
];

const COMPANY_HR_RECRUITMENT_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view', 'employees.create',
  'recruitment.view', 'recruitment.manage',
  'documents.manage',
  'notifications.view',
  'self_service.view',
];

const COMPANY_HR_MANAGER_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'documents.manage',
  'attendance.view', 'attendance.manage',
  'leaves.view', 'leaves.approve_hr',
  'payroll.view', 'payroll.manage', 'payroll.export',
  'contracts.view', 'contracts.manage',
  'tasks.view', 'tasks.manage',
  'reviews.view', 'reviews.manage',
  'departments.view', 'departments.manage',
  'reports.view', 'notifications.view',
  'ai.use', 'activity_logs.view',
  'self_service.view',
  'recruitment.view', 'recruitment.manage',
  'kpis.view', 'kpis.manage',
  'warnings.view', 'warnings.manage',
];

const COMPANY_DIRECT_MANAGER_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view',
  'attendance.view',
  'leaves.view', 'leaves.approve_manager',
  'tasks.view', 'tasks.manage',
  'reviews.view', 'reviews.manage',
  'reports.view', 'notifications.view',
  'kpis.view', 'kpis.manage',
];

const COMPANY_EMPLOYEE_PERMS: Permission[] = [
  'dashboard.view',
  'leaves.view', 'leaves.request',
  'attendance.view',
  'tasks.view',
  'notifications.view',
  'self_service.view',
  'kpis.view',
];

export const COMPANY_ROLE_PERMISSIONS: Record<CompanyRole, Permission[]> = {
  owner: COMPANY_OWNER_PERMS,
  hr_attendance: COMPANY_HR_ATTENDANCE_PERMS,
  hr_payroll: COMPANY_HR_PAYROLL_PERMS,
  hr_recruitment: COMPANY_HR_RECRUITMENT_PERMS,
  hr_manager: COMPANY_HR_MANAGER_PERMS,
  direct_manager: COMPANY_DIRECT_MANAGER_PERMS,
  employee: COMPANY_EMPLOYEE_PERMS,
};

const COMPANY_CUSTOM_MANAGER_PERMS: Permission[] = [
  'dashboard.view',
  'employees.view',
  'attendance.view', 'attendance.manage',
  'leaves.view', 'leaves.approve_manager', 'leaves.approve_hr',
  'tasks.view', 'tasks.manage',
  'reports.view', 'notifications.view',
  'self_service.view',
];

export function hasCompanyPermission(role: CompanyRole | undefined, perm: Permission): boolean {
  if (!role) return false;
  if ((role as string) === 'manager') return COMPANY_CUSTOM_MANAGER_PERMS.includes(perm);
  return COMPANY_ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function canAccessRoute(role: RoleName | undefined, route: string): boolean {
  const map: Record<string, Permission> = {
    '/': 'dashboard.view',
    '/employees': 'employees.view',
    '/attendance': 'attendance.view',
    '/leaves': 'leaves.view',
    '/payroll': 'payroll.view',
    '/contracts': 'contracts.view',
    '/tasks': 'tasks.view',
    '/reviews': 'reviews.view',
    '/departments': 'departments.view',
    '/reports': 'reports.view',
    '/settings': 'settings.manage',
    '/notifications': 'notifications.view',
    '/ai': 'ai.use',
    '/self-service': 'self_service.view',
    '/recruitment': 'recruitment.view',
    '/kpis': 'kpis.view',
    '/warnings': 'warnings.view',
  };
  const perm = map[route];
  if (!perm) return true;
  return hasPermission(role, perm);
}

export function canAccessRouteCompany(role: CompanyRole | undefined, route: string): boolean {
  const map: Record<string, Permission> = {
    '/': 'dashboard.view',
    '/employees': 'employees.view',
    '/attendance': 'attendance.view',
    '/leaves': 'leaves.view',
    '/payroll': 'payroll.view',
    '/contracts': 'contracts.view',
    '/tasks': 'tasks.view',
    '/reviews': 'reviews.view',
    '/departments': 'departments.view',
    '/reports': 'reports.view',
    '/settings': 'company.manage',
    '/notifications': 'notifications.view',
    '/ai': 'ai.use',
    '/self-service': 'self_service.view',
    '/recruitment': 'recruitment.view',
    '/kpis': 'kpis.view',
    '/warnings': 'warnings.view',
  };
  const perm = map[route];
  if (!perm) return true;
  return hasCompanyPermission(role, perm);
}