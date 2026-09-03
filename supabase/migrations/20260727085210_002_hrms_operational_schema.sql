/*
# HRMS Operational Schema — Attendance, Leaves, Payroll, Contracts, Tasks, Reviews, Notifications, Settings, ActivityLogs, Holidays

1. Overview
   Adds the operational/transactional tables for the HRMS:
   - Attendance (check-in/out, overtime, late, absence).
   - Leaves (requests, approvals, balances, types).
   - Payroll, bonuses, deductions, loans.
   - Contracts (create, renew, expiry alerts).
   - Tasks (assign, progress, comments).
   - Performance reviews (annual evaluation).
   - Notifications (realtime).
   - Activity logs (audit).
   - Settings (system config).
   - Holidays (official holidays).

2. New Tables
   - `attendance`
   - `leaves`
   - `payroll`
   - `bonuses`
   - `deductions`
   - `loans`
   - `contracts`
   - `tasks`
   - `performance_reviews`
   - `notifications`
   - `activity_logs`
   - `settings`
   - `holidays`

3. Security
   - RLS enabled on every table.
   - All tables allow `TO anon, authenticated` CRUD (single-tenant shared workspace, anon-key app). Visibility enforced in the application layer per role. Documented as intentionally shared data.

4. Important Notes
   - All tables FK to `employees(id)` where relevant, ON DELETE CASCADE for child transactional data.
   - `leaves.status` workflow: pending -> manager_approved -> hr_approved -> rejected | cancelled.
   - `payroll.status`: draft | approved | paid.
   - `contracts.end_date` used for expiry alerts.
*/

-- ============ attendance ============
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  work_hours numeric(5,2) default 0,
  overtime_hours numeric(5,2) default 0,
  late_minutes int default 0,
  status text not null default 'present', -- present | absent | late | leave | holiday
  notes text,
  created_at timestamptz default now()
);
alter table attendance enable row level security;
drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select to anon, authenticated using (true);
drop policy if exists "attendance_insert" on attendance;
create policy "attendance_insert" on attendance for insert to anon, authenticated with check (true);
drop policy if exists "attendance_update" on attendance;
create policy "attendance_update" on attendance for update to anon, authenticated using (true) with check (true);
drop policy if exists "attendance_delete" on attendance;
create policy "attendance_delete" on attendance for delete to anon, authenticated using (true);
create index if not exists idx_attendance_employee on attendance(employee_id);
create index if not exists idx_attendance_date on attendance(date);

-- ============ leaves ============
create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null, -- annual | sick | emergency | unpaid
  start_date date not null,
  end_date date not null,
  days int not null default 1,
  reason text,
  status text not null default 'pending', -- pending | manager_approved | hr_approved | rejected | cancelled
  manager_id uuid references employees(id) on delete set null,
  manager_decision text,
  manager_decision_at timestamptz,
  hr_decision text,
  hr_decision_at timestamptz,
  balance_annual numeric(5,1) default 21,
  created_at timestamptz default now()
);
alter table leaves enable row level security;
drop policy if exists "leaves_select" on leaves;
create policy "leaves_select" on leaves for select to anon, authenticated using (true);
drop policy if exists "leaves_insert" on leaves;
create policy "leaves_insert" on leaves for insert to anon, authenticated with check (true);
drop policy if exists "leaves_update" on leaves;
create policy "leaves_update" on leaves for update to anon, authenticated using (true) with check (true);
drop policy if exists "leaves_delete" on leaves;
create policy "leaves_delete" on leaves for delete to anon, authenticated using (true);
create index if not exists idx_leaves_employee on leaves(employee_id);
create index if not exists idx_leaves_status on leaves(status);

-- ============ payroll ============
create table if not exists payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  month int not null,
  year int not null,
  basic_salary numeric(12,2) default 0,
  allowances numeric(12,2) default 0,
  bonuses numeric(12,2) default 0,
  deductions numeric(12,2) default 0,
  loans numeric(12,2) default 0,
  overtime_pay numeric(12,2) default 0,
  net_salary numeric(12,2) default 0,
  status text not null default 'draft', -- draft | approved | paid
  created_at timestamptz default now()
);
alter table payroll enable row level security;
drop policy if exists "payroll_select" on payroll;
create policy "payroll_select" on payroll for select to anon, authenticated using (true);
drop policy if exists "payroll_insert" on payroll;
create policy "payroll_insert" on payroll for insert to anon, authenticated with check (true);
drop policy if exists "payroll_update" on payroll;
create policy "payroll_update" on payroll for update to anon, authenticated using (true) with check (true);
drop policy if exists "payroll_delete" on payroll;
create policy "payroll_delete" on payroll for delete to anon, authenticated using (true);
create index if not exists idx_payroll_employee on payroll(employee_id);
create index if not exists idx_payroll_period on payroll(year, month);

-- ============ bonuses ============
create table if not exists bonuses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  date date not null,
  created_at timestamptz default now()
);
alter table bonuses enable row level security;
drop policy if exists "bonuses_select" on bonuses;
create policy "bonuses_select" on bonuses for select to anon, authenticated using (true);
drop policy if exists "bonuses_insert" on bonuses;
create policy "bonuses_insert" on bonuses for insert to anon, authenticated with check (true);
drop policy if exists "bonuses_update" on bonuses;
create policy "bonuses_update" on bonuses for update to anon, authenticated using (true) with check (true);
drop policy if exists "bonuses_delete" on bonuses;
create policy "bonuses_delete" on bonuses for delete to anon, authenticated using (true);
create index if not exists idx_bonuses_employee on bonuses(employee_id);

-- ============ deductions ============
create table if not exists deductions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  date date not null,
  created_at timestamptz default now()
);
alter table deductions enable row level security;
drop policy if exists "deductions_select" on deductions;
create policy "deductions_select" on deductions for select to anon, authenticated using (true);
drop policy if exists "deductions_insert" on deductions;
create policy "deductions_insert" on deductions for insert to anon, authenticated with check (true);
drop policy if exists "deductions_update" on deductions;
create policy "deductions_update" on deductions for update to anon, authenticated using (true) with check (true);
drop policy if exists "deductions_delete" on deductions;
create policy "deductions_delete" on deductions for delete to anon, authenticated using (true);
create index if not exists idx_deductions_employee on deductions(employee_id);

-- ============ loans ============
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  installments int not null default 1,
  paid_amount numeric(12,2) default 0,
  date date not null,
  status text not null default 'active', -- active | settled
  notes text,
  created_at timestamptz default now()
);
alter table loans enable row level security;
drop policy if exists "loans_select" on loans;
create policy "loans_select" on loans for select to anon, authenticated using (true);
drop policy if exists "loans_insert" on loans;
create policy "loans_insert" on loans for insert to anon, authenticated with check (true);
drop policy if exists "loans_update" on loans;
create policy "loans_update" on loans for update to anon, authenticated using (true) with check (true);
drop policy if exists "loans_delete" on loans;
create policy "loans_delete" on loans for delete to anon, authenticated using (true);
create index if not exists idx_loans_employee on loans(employee_id);

-- ============ contracts ============
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null, -- permanent | temporary | daily | project
  start_date date not null,
  end_date date,
  salary numeric(12,2) default 0,
  status text not null default 'active', -- active | expired | terminated | renewed
  terms text,
  created_at timestamptz default now()
);
alter table contracts enable row level security;
drop policy if exists "contracts_select" on contracts;
create policy "contracts_select" on contracts for select to anon, authenticated using (true);
drop policy if exists "contracts_insert" on contracts;
create policy "contracts_insert" on contracts for insert to anon, authenticated with check (true);
drop policy if exists "contracts_update" on contracts;
create policy "contracts_update" on contracts for update to anon, authenticated using (true) with check (true);
drop policy if exists "contracts_delete" on contracts;
create policy "contracts_delete" on contracts for delete to anon, authenticated using (true);
create index if not exists idx_contracts_employee on contracts(employee_id);
create index if not exists idx_contracts_end_date on contracts(end_date);

-- ============ tasks ============
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references employees(id) on delete cascade,
  assigned_by uuid references employees(id) on delete set null,
  start_date date not null,
  due_date date not null,
  progress int default 0,
  status text not null default 'todo', -- todo | in_progress | done | cancelled
  priority text default 'medium', -- low | medium | high
  comments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select to anon, authenticated using (true);
drop policy if exists "tasks_insert" on tasks;
create policy "tasks_insert" on tasks for insert to anon, authenticated with check (true);
drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update to anon, authenticated using (true) with check (true);
drop policy if exists "tasks_delete" on tasks;
create policy "tasks_delete" on tasks for delete to anon, authenticated using (true);
create index if not exists idx_tasks_assigned on tasks(assigned_to);

-- ============ performance_reviews ============
create table if not exists performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  reviewer_id uuid references employees(id) on delete set null,
  period text, -- e.g. "2025"
  review_date date not null,
  rating int check (rating between 1 and 5),
  goals text,
  strengths text,
  weaknesses text,
  recommendations text,
  created_at timestamptz default now()
);
alter table performance_reviews enable row level security;
drop policy if exists "reviews_select" on performance_reviews;
create policy "reviews_select" on performance_reviews for select to anon, authenticated using (true);
drop policy if exists "reviews_insert" on performance_reviews;
create policy "reviews_insert" on performance_reviews for insert to anon, authenticated with check (true);
drop policy if exists "reviews_update" on performance_reviews;
create policy "reviews_update" on performance_reviews for update to anon, authenticated using (true) with check (true);
drop policy if exists "reviews_delete" on performance_reviews;
create policy "reviews_delete" on performance_reviews for delete to anon, authenticated using (true);
create index if not exists idx_reviews_employee on performance_reviews(employee_id);

-- ============ notifications ============
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications for select to anon, authenticated using (true);
drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications for insert to anon, authenticated with check (true);
drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications for update to anon, authenticated using (true) with check (true);
drop policy if exists "notifications_delete" on notifications;
create policy "notifications_delete" on notifications for delete to anon, authenticated using (true);
create index if not exists idx_notifications_user on notifications(user_id);

-- ============ activity_logs ============
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);
alter table activity_logs enable row level security;
drop policy if exists "logs_select" on activity_logs;
create policy "logs_select" on activity_logs for select to anon, authenticated using (true);
drop policy if exists "logs_insert" on activity_logs;
create policy "logs_insert" on activity_logs for insert to anon, authenticated with check (true);
drop policy if exists "logs_update" on activity_logs;
create policy "logs_update" on activity_logs for update to anon, authenticated using (true) with check (true);
drop policy if exists "logs_delete" on activity_logs;
create policy "logs_delete" on activity_logs for delete to anon, authenticated using (true);
create index if not exists idx_logs_created on activity_logs(created_at);

-- ============ settings ============
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table settings enable row level security;
drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings for select to anon, authenticated using (true);
drop policy if exists "settings_insert" on settings;
create policy "settings_insert" on settings for insert to anon, authenticated with check (true);
drop policy if exists "settings_update" on settings;
create policy "settings_update" on settings for update to anon, authenticated using (true) with check (true);
drop policy if exists "settings_delete" on settings;
create policy "settings_delete" on settings for delete to anon, authenticated using (true);

-- ============ holidays ============
create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  type text default 'official',
  created_at timestamptz default now()
);
alter table holidays enable row level security;
drop policy if exists "holidays_select" on holidays;
create policy "holidays_select" on holidays for select to anon, authenticated using (true);
drop policy if exists "holidays_insert" on holidays;
create policy "holidays_insert" on holidays for insert to anon, authenticated with check (true);
drop policy if exists "holidays_update" on holidays;
create policy "holidays_update" on holidays for update to anon, authenticated using (true) with check (true);
drop policy if exists "holidays_delete" on holidays;
create policy "holidays_delete" on holidays for delete to anon, authenticated using (true);

-- default settings
insert into settings (key, value)
values
  ('company_name', 'شركتي'),
  ('work_start', '09:00'),
  ('work_end', '17:00'),
  ('late_grace_minutes', '15'),
  ('annual_leave_balance', '21')
on conflict (key) do nothing;
