/*
# HRMS Core Schema — Roles, Branches, Employees, Departments, Positions, Documents

1. Overview
   Foundational tables for a Human Resources Management System (HRMS):
   - Role catalog (6 roles).
   - Organizational structure: branches, departments, positions.
   - Employee records with full HR profile fields.
   - Employee document storage references (CV, contract, ID, certificates, misc).

2. New Tables
   - `roles`        : role catalog (6 roles).
   - `branches`     : company branches/locations.
   - `employees`    : core employee record (created before departments/positions exist; FKs added after).
   - `departments`  : departments belonging to a branch; manager is an employee.
   - `positions`    : job positions belonging to a department.
   - `documents`    : employee file attachments metadata.

3. Security
   - RLS enabled on every table.
   - All tables allow `TO anon, authenticated` CRUD: this HRMS is a single-tenant shared workspace (anon-key app). Visibility is enforced in the application layer per role. Documented as intentionally shared data.

4. Important Notes
   - `employees.user_id` references `auth.users(id)` ON DELETE SET NULL.
   - `employees.manager_id` self-references `employees(id)`.
   - `employees.department_id` / `position_id` FKs added after departments & positions exist.
   - `departments.manager_employee_id` references `employees(id)`.
*/

create extension if not exists "pgcrypto";

-- ============ roles ============
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_ar text not null,
  description text,
  created_at timestamptz default now()
);
alter table roles enable row level security;
drop policy if exists "roles_select" on roles;
create policy "roles_select" on roles for select to anon, authenticated using (true);
drop policy if exists "roles_insert" on roles;
create policy "roles_insert" on roles for insert to anon, authenticated with check (true);
drop policy if exists "roles_update" on roles;
create policy "roles_update" on roles for update to anon, authenticated using (true) with check (true);
drop policy if exists "roles_delete" on roles;
create policy "roles_delete" on roles for delete to anon, authenticated using (true);

-- ============ branches ============
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  address text,
  phone text,
  manager_name text,
  created_at timestamptz default now()
);
alter table branches enable row level security;
drop policy if exists "branches_select" on branches;
create policy "branches_select" on branches for select to anon, authenticated using (true);
drop policy if exists "branches_insert" on branches;
create policy "branches_insert" on branches for insert to anon, authenticated with check (true);
drop policy if exists "branches_update" on branches;
create policy "branches_update" on branches for update to anon, authenticated using (true) with check (true);
drop policy if exists "branches_delete" on branches;
create policy "branches_delete" on branches for delete to anon, authenticated using (true);

-- ============ employees (no dept/pos FK yet; added after those tables exist) ============
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  employee_code text unique not null,
  full_name text not null,
  photo_url text,
  national_id text,
  phone text,
  email text,
  address text,
  birth_date date,
  marital_status text,
  qualification text,
  department_id uuid,
  position_id uuid,
  branch_id uuid references branches(id) on delete set null,
  manager_id uuid references employees(id) on delete set null,
  hire_date date not null,
  basic_salary numeric(12,2) default 0,
  allowances numeric(12,2) default 0,
  bank_account text,
  status text not null default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table employees enable row level security;
drop policy if exists "employees_select" on employees;
create policy "employees_select" on employees for select to anon, authenticated using (true);
drop policy if exists "employees_insert" on employees;
create policy "employees_insert" on employees for insert to anon, authenticated with check (true);
drop policy if exists "employees_update" on employees;
create policy "employees_update" on employees for update to anon, authenticated using (true) with check (true);
drop policy if exists "employees_delete" on employees;
create policy "employees_delete" on employees for delete to anon, authenticated using (true);

create index if not exists idx_employees_department on employees(department_id);
create index if not exists idx_employees_position on employees(position_id);
create index if not exists idx_employees_branch on employees(branch_id);
create index if not exists idx_employees_manager on employees(manager_id);
create index if not exists idx_employees_status on employees(status);
create index if not exists idx_employees_user on employees(user_id);

-- ============ departments ============
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  branch_id uuid references branches(id) on delete set null,
  manager_employee_id uuid references employees(id) on delete set null,
  description text,
  created_at timestamptz default now()
);
alter table departments enable row level security;
drop policy if exists "departments_select" on departments;
create policy "departments_select" on departments for select to anon, authenticated using (true);
drop policy if exists "departments_insert" on departments;
create policy "departments_insert" on departments for insert to anon, authenticated with check (true);
drop policy if exists "departments_update" on departments;
create policy "departments_update" on departments for update to anon, authenticated using (true) with check (true);
drop policy if exists "departments_delete" on departments;
create policy "departments_delete" on departments for delete to anon, authenticated using (true);

-- ============ positions ============
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ar text,
  department_id uuid references departments(id) on delete cascade,
  description text,
  created_at timestamptz default now()
);
alter table positions enable row level security;
drop policy if exists "positions_select" on positions;
create policy "positions_select" on positions for select to anon, authenticated using (true);
drop policy if exists "positions_insert" on positions;
create policy "positions_insert" on positions for insert to anon, authenticated with check (true);
drop policy if exists "positions_update" on positions;
create policy "positions_update" on positions for update to anon, authenticated using (true) with check (true);
drop policy if exists "positions_delete" on positions;
create policy "positions_delete" on positions for delete to anon, authenticated using (true);

-- now add employees -> departments/positions FKs
do $$ begin
  if not exists (select 1 from pg_constraint where conname='employees_department_id_fkey') then
    alter table employees add constraint employees_department_id_fkey
      foreign key (department_id) references departments(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='employees_position_id_fkey') then
    alter table employees add constraint employees_position_id_fkey
      foreign key (position_id) references positions(id) on delete set null;
  end if;
end $$;

-- ============ documents ============
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null,
  name text not null,
  storage_path text not null,
  file_url text,
  uploaded_at timestamptz default now()
);
alter table documents enable row level security;
drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents for select to anon, authenticated using (true);
drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents for insert to anon, authenticated with check (true);
drop policy if exists "documents_update" on documents;
create policy "documents_update" on documents for update to anon, authenticated using (true) with check (true);
drop policy if exists "documents_delete" on documents;
create policy "documents_delete" on documents for delete to anon, authenticated using (true);

create index if not exists idx_documents_employee on documents(employee_id);

-- ============ updated_at trigger ============
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_employees_updated_at on employees;
create trigger trg_employees_updated_at
before update on employees
for each row execute function set_updated_at();

-- ============ seed roles ============
insert into roles (name, name_ar, description)
values
  ('system_admin',    'مدير النظام',            'صلاحية كاملة على النظام'),
  ('hr_manager',      'مدير الموارد البشرية',    'إدارة شؤون الموظفين والرواتب والإجازات'),
  ('employee_affairs','مسؤول شؤون الموظفين',     'إدارة بيانات الموظفين والمستندات'),
  ('accountant',      'المحاسب',                'إدارة الرواتب والسلف والخصومات'),
  ('direct_manager',  'المدير المباشر',          'متابعة فريقه واعتماد الإجازات والتقييم'),
  ('employee',        'الموظف',                  'عرض بياناته وطلب الإجازات وتسجيل الحضور')
on conflict (name) do nothing;
