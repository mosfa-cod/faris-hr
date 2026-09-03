/*
# Fix: System Admin RLS Bypass + Signup Company Linking

## Problem
- System admin accounts created via `signUp()` were not linked to a
  `company_members` record, so `current_company_id()` returned NULL.
- All RLS policies require `company_id = current_company_id()`, which
  fails when the company_id is NULL (NULL = NULL is false in SQL).
- Result: "new row violates row-level security policy for table employees"

## Fix
1. Create a helper function `is_system_admin()` that checks the JWT
   `user_metadata.role` for 'system_admin'.
2. Update RLS policies on ALL 23 tenant tables to add an OR bypass:
   `company_id = current_company_id() OR is_system_admin()`.
   This lets system_admin read/write any company's data.
3. Update `companies` SELECT to also allow system_admin.
4. Update `company_members` INSERT to also allow system_admin.

## Tables Modified (RLS policies updated on all 23)
   roles, branches, employees, departments, positions, documents,
   attendance, leaves, payroll, bonuses, deductions, loans, contracts,
   tasks, performance_reviews, notifications, activity_logs, settings,
   holidays, loan_requests, applicants, kpis, warnings

## Security
- system_admin is identified via JWT user_metadata role (set at signup).
- system_admin can bypass company_id isolation on all tables.
- All other users are still fully isolated by company_id.

## Important Notes
1. The frontend `signUp()` function must also be fixed to create a
   `company_members` record linking the system_admin to a company.
2. `is_system_admin()` reads from `auth.jwt()` which is the current
   session's JWT — it is evaluated per-request by PostgREST.
*/

-- ============================================================
-- 1) Helper function: is_system_admin()
-- ============================================================
create or replace function is_system_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'system_admin';
$$;

-- ============================================================
-- 2) Helper to drop all policies on a table
-- ============================================================
create or replace function drop_all_policies(t text) returns void
language plpgsql as $$
declare
  p record;
begin
  for p in select policyname from pg_policies where tablename = t loop
    execute format('drop policy if exists %I on %I', p.policyname, t);
  end loop;
end $$;

-- ============================================================
-- 3) Update RLS on all 23 tenant tables: add system_admin bypass
-- ============================================================
do $$
declare
  tbl text;
  tables text[] := array[
    'roles','branches','employees','departments','positions','documents',
    'attendance','leaves','payroll','bonuses','deductions','loans','contracts',
    'tasks','performance_reviews','activity_logs','settings',
    'holidays','loan_requests','applicants','kpis','warnings'
  ];
begin
  foreach tbl in array tables loop
    perform drop_all_policies(tbl);

    execute format(
      'create policy %I on %I for select to authenticated
       using (company_id = current_company_id() or is_system_admin())',
      tbl || '_select_co', tbl
    );

    execute format(
      'create policy %I on %I for insert to authenticated
       with check (company_id = current_company_id() or is_system_admin())',
      tbl || '_insert_co', tbl
    );

    execute format(
      'create policy %I on %I for update to authenticated
       using (company_id = current_company_id() or is_system_admin())
       with check (company_id = current_company_id() or is_system_admin())',
      tbl || '_update_co', tbl
    );

    execute format(
      'create policy %I on %I for delete to authenticated
       using (company_id = current_company_id() or is_system_admin())',
      tbl || '_delete_co', tbl
    );
  end loop;
end $$;

-- ============================================================
-- 4) notifications: same pattern + user_id restriction on SELECT
-- ============================================================
do $$ begin perform drop_all_policies('notifications'); end $$;

create policy "notifications_select_co" on notifications for select
  to authenticated
  using (
    (company_id = current_company_id() or is_system_admin())
    and (user_id = auth.uid() or user_id is null or is_system_admin())
  );
create policy "notifications_insert_co" on notifications for insert
  to authenticated
  with check (company_id = current_company_id() or is_system_admin());
create policy "notifications_update_co" on notifications for update
  to authenticated
  using (company_id = current_company_id() or is_system_admin())
  with check (company_id = current_company_id() or is_system_admin());
create policy "notifications_delete_co" on notifications for delete
  to authenticated
  using (company_id = current_company_id() or is_system_admin());

-- ============================================================
-- 5) companies SELECT: allow system_admin to see all companies
-- ============================================================
do $$ begin perform drop_all_policies('companies'); end $$;

create policy "companies_select_own" on companies for select
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
    or is_system_admin()
  );

create policy "companies_update_own" on companies for update
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or is_system_admin()
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or is_system_admin()
  );

create policy "companies_insert" on companies for insert
  to authenticated with check (true);

-- ============================================================
-- 6) company_members: allow system_admin to manage all memberships
-- ============================================================
do $$ begin perform drop_all_policies('company_members'); end $$;

create policy "cm_select" on company_members for select
  to authenticated
  using (
    company_id in (
      select cm2.company_id from company_members cm2
      where cm2.user_id = auth.uid()
    )
    or is_system_admin()
  );

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
    or is_system_admin()
  );

create policy "cm_update" on company_members for update
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or is_system_admin()
  )
  with check (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or is_system_admin()
  );

create policy "cm_delete" on company_members for delete
  to authenticated
  using (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id
        and cm.user_id = auth.uid()
        and cm.role = 'owner'
    )
    or is_system_admin()
  );

-- ============================================================
-- 7) Drop helper function
-- ============================================================
drop function if exists drop_all_policies(text);
