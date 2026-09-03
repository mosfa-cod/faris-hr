import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  CheckSquare,
  Star,
  Building2,
  BarChart3,
  Bell,
  Settings,
  Sparkles,
  UserCog,
  UserPlus,
  Target,
  ShieldAlert,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';

export interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { title: 'لوحة التحكم', href: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
  { title: 'الموظفون', href: '/employees', icon: Users, permission: 'employees.view' },
  { title: 'الحضور والانصراف', href: '/attendance', icon: Clock, permission: 'attendance.view' },
  { title: 'الإجازات', href: '/leaves', icon: CalendarDays, permission: 'leaves.view' },
  { title: 'الرواتب', href: '/payroll', icon: Wallet, permission: 'payroll.view' },
  { title: 'العقود', href: '/contracts', icon: FileText, permission: 'contracts.view' },
  { title: 'المهام', href: '/tasks', icon: CheckSquare, permission: 'tasks.view' },
  { title: 'التقييم السنوي', href: '/reviews', icon: Star, permission: 'reviews.view' },
  { title: 'الخدمة الذاتية', href: '/self-service', icon: UserCog, permission: 'self_service.view' },
  { title: 'التوظيف', href: '/recruitment', icon: UserPlus, permission: 'recruitment.view' },
  { title: 'تقييم الأداء و KPIs', href: '/kpis', icon: Target, permission: 'kpis.view' },
  { title: 'التنبيهات والجزاءات', href: '/warnings', icon: ShieldAlert, permission: 'warnings.view' },
  { title: 'الأقسام', href: '/departments', icon: Building2, permission: 'departments.view' },
  { title: 'التقارير', href: '/reports', icon: BarChart3, permission: 'reports.view' },
  { title: 'الإشعارات', href: '/notifications', icon: Bell, permission: 'notifications.view' },
  { title: 'المساعد الذكي', href: '/ai', icon: Sparkles, permission: 'ai.use' },
  { title: 'الإعدادات', href: '/settings', icon: Settings, permission: 'settings.manage' },
];
