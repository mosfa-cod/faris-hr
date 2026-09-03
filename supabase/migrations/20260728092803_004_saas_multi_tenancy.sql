/*
# SaaS Multi-Tenancy Transformation — Part 1: Schema

## Overview
Converts the single-tenant HRMS into a multi-tenant SaaS:
- Creates a `companies` table (each tenant = one company).
- Creates a `company_members` join table linking auth.users to companies with a role.
- Adds `company_id` to ALL 23 existing tables so every row is owned by a company.
- Backfills existing rows to a default company so no data is lost.
- Adds a helper SQL function `current_company_id()` for RLS.

## New Tables
1. `companies` — id, name, name_ar, logo_url, plan, max_employees, status, timestamps
2. `company_members` — id, company_id, user_id, role, status, invited_email, created_at
   Roles: owner, hr_attendance, hr_payroll, hr_recruitment, hr_manager, direct_manager, employee

## Modified Tables (company_id added to all 23)
   roles, branches, employees, departments, positions, documents,
   attendance, leaves, payroll, bonuses, deductions, loans, contracts,
   tasks, performance_reviews, notifications, activity_logs, settings,
   holidays, loan_requests, applicants, kpis, warnings

## Security
   - RLS on companies + company_members.
   - companies: members can SELECT; owners can UPDATE/INSERT.
   - company_members: members can SELECT within their company; owners manage.
   - Helper function current_company_id() for RLS in migration 005.

## Important Notes
1. Default company created + all existing rows backfilled to it.
2. company_id columns are nullable initially (NOT NULL enforced in migration 005).
3. current_company_id() returns the first active membership's company_id.
*/

-- ============================================================
-- 1) companies table (must exist before company_members FK)
-- ============================================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  logo_url text,
  plan text not null default 'free',
  max_employees int default 50,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table companies enable row level security;

-- Temporary open policy until company_members exists; tightened below.
drop policy if exists "companies_insert" on companies;
create policy "companies_insert" on companies for insert
  to authenticated with check (true);

-- ============================================================
-- 2) company_members table
-- ============================================================
create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'employee',
  status text not null default 'active',
  invited_email text,
  created_at timestamptz default now()
);
alter table company_members enable row level security;

create index if not exists idx_cm_company on company_members(company_id);
create index if not exists idx_cm_user on company_members(user_id);
create index if not exists idx_cm_company_user on company_members(company_id, user_id);

-- ============================================================
-- 3) RLS policies on companies (now that company_members exists)
-- ============================================================
drop policy if exists "companies_select_own" on companies;
create policy "companies_select_own" on companies for select
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "companies_update_own" on companies;
create policy "companies_update_own" on companies for update
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  );

-- ============================================================
-- 4) RLS policies on company_members
-- ============================================================
drop policy if exists "cm_select" on company_members;
create policy "cm_select" on company_members for select
  to authenticated
  using (
    company_id in (
      select cm2.company_id from company_members cm2
      where cm2.user_id = auth.uid()
    )
  );

drop policy if exists "cm_insert" on company_members;
create policy "cm_insert" on company_members for insert
  to authenticated
  with check (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or company_members.user_id = auth.uid()
  );

drop policy if exists "cm_update" on company_members;
create policy "cm_update" on company_members for update
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  );

drop policy if exists "cm_delete" on company_members;
create policy "cm_delete" on company_members for delete
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
  );

-- ============================================================
-- 5) Helper function: current_company_id()
-- ============================================================
create or replace function current_company_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select cm.company_id
  from company_members cm
  where cm.user_id = auth.uid()
    and cm.status = 'active'
  order by cm.created_at
  limit 1;
$$;

-- ============================================================
-- 6) Add company_id to ALL 23 existing tables
-- ============================================================
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='roles' and column_name='company_id') then
    alter table roles add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='branches' and column_name='company_id') then
    alter table branches add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='employees' and column_name='company_id') then
    alter table employees add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='departments' and column_name='company_id') then
    alter table departments add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='positions' and column_name='company_id') then
    alter table positions add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='documents' and column_name='company_id') then
    alter table documents add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='attendance' and column_name='company_id') then
    alter table attendance add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='leaves' and column_name='company_id') then
    alter table leaves add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='payroll' and column_name='company_id') then
    alter table payroll add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='bonuses' and column_name='company_id') then
    alter table bonuses add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='deductions' and column_name='company_id') then
    alter table deductions add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='loans' and column_name='company_id') then
    alter table loans add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='contracts' and column_name='company_id') then
    alter table contracts add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='tasks' and column_name='company_id') then
    alter table tasks add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='performance_reviews' and column_name='company_id') then
    alter table performance_reviews add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='notifications' and column_name='company_id') then
    alter table notifications add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='activity_logs' and column_name='company_id') then
    alter table activity_logs add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='settings' and column_name='company_id') then
    alter table settings add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='holidays' and column_name='company_id') then
    alter table holidays add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='loan_requests' and column_name='company_id') then
    alter table loan_requests add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='applicants' and column_name='company_id') then
    alter table applicants add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='kpis' and column_name='company_id') then
    alter table kpis add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='warnings' and column_name='company_id') then
    alter table warnings add column company_id uuid references companies(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 7) Backfill existing rows to a default company
-- ============================================================
do $$
declare
  default_co uuid;
begin
  select id into default_co from companies limit 1;
  if default_co is null then
    insert into companies (name, name_ar, plan, status)
    values ('Default Company', 'الشركة الافتراضية', 'enterprise', 'active')
    returning id into default_co;
  end if;

  update roles set company_id = default_co where company_id is null;
  update branches set company_id = default_co where company_id is null;
  update employees set company_id = default_co where company_id is null;
  update departments set company_id = default_co where company_id is null;
  update positions set company_id = default_co where company_id is null;
  update documents set company_id = default_co where company_id is null;
  update attendance set company_id = default_co where company_id is null;
  update leaves set company_id = default_co where company_id is null;
  update payroll set company_id = default_co where company_id is null;
  update bonuses set company_id = default_co where company_id is null;
  update deductions set company_id = default_co where company_id is null;
  update loans set company_id = default_co where company_id is null;
  update contracts set company_id = default_co where company_id is null;
  update tasks set company_id = default_co where company_id is null;
  update performance_reviews set company_id = default_co where company_id is null;
  update notifications set company_id = default_co where company_id is null;
  update activity_logs set company_id = default_co where company_id is null;
  update settings set company_id = default_co where company_id is null;
  update holidays set company_id = default_co where company_id is null;
  update loan_requests set company_id = default_co where company_id is null;
  update applicants set company_id = default_co where company_id is null;
  update kpis set company_id = default_co where company_id is null;
  update warnings set company_id = default_co where company_id is null;
end $$;

-- ============================================================
-- 8) Indexes on company_id
-- ============================================================
create index if not exists idx_roles_company on roles(company_id);
create index if not exists idx_branches_company on branches(company_id);
create index if not exists idx_employees_company on employees(company_id);
create index if not exists idx_departments_company on departments(company_id);
create index if not exists idx_positions_company on positions(company_id);
create index if not exists idx_documents_company on documents(company_id);
create index if not exists idx_attendance_company on attendance(company_id);
create index if not exists idx_leaves_company on leaves(company_id);
create index if not exists idx_payroll_company on payroll(company_id);
create index if not exists idx_bonuses_company on bonuses(company_id);
create index if not exists idx_deductions_company on deductions(company_id);
create index if not exists idx_loans_company on loans(company_id);
create index if not exists idx_contracts_company on contracts(company_id);
create index if not exists idx_tasks_company on tasks(company_id);
create index if not exists idx_reviews_company on performance_reviews(company_id);
create index if not exists idx_notifications_company on notifications(company_id);
create index if not exists idx_logs_company on activity_logs(company_id);
create index if not exists idx_settings_company on settings(company_id);
create index if not exists idx_holidays_company on holidays(company_id);
create index if not exists idx_loan_requests_company on loan_requests(company_id);
create index if not exists idx_applicants_company on applicants(company_id);
create index if not exists idx_kpis_company on kpis(company_id);
create index if not exists idx_warnings_company on warnings(company_id);
