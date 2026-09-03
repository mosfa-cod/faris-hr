/*
# SaaS Multi-Tenancy — Part 2: Company-Scoped RLS Policies

## Overview
Replaces the open (`using (true)`) RLS policies on all 23 existing tables
with company-scoped policies that enforce tenant isolation:
- Users can only access rows belonging to their current company
  (resolved via `current_company_id()`).
- INSERT/UPDATE must set `company_id` to the user's current company.
- DELETE must target rows in the user's current company.

## Tables Modified (RLS policies replaced on all 23)
   roles, branches, employees, departments, positions, documents,
   attendance, leaves, payroll, bonuses, deductions, loans, contracts,
   tasks, performance_reviews, notifications, activity_logs, settings,
   holidays, loan_requests, applicants, kpis, warnings

## Security Model
- SELECT: row visible if `row.company_id = current_company_id()`.
- INSERT: allowed if `new.company_id = current_company_id()`.
- UPDATE: allowed if `row.company_id = current_company_id()` AND
          `new.company_id = current_company_id()`.
- DELETE: allowed if `row.company_id = current_company_id()`.
- notifications: SELECT also restricted to user's own rows (user_id match).

## Important Notes
1. All policies are `TO authenticated` — anon key can no longer access tables.
2. Policies are idempotent: each DROP + CREATE pair.
3. `current_company_id()` was created in migration 004.
*/

-- ============================================================
-- Helper function to drop all policies on a table
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
-- Apply company-scoped policies to each table (except notifications)
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
       using (company_id = current_company_id())',
      tbl || '_select_co', tbl
    );

    execute format(
      'create policy %I on %I for insert to authenticated
       with check (company_id = current_company_id())',
      tbl || '_insert_co', tbl
    );

    execute format(
      'create policy %I on %I for update to authenticated
       using (company_id = current_company_id())
       with check (company_id = current_company_id())',
      tbl || '_update_co', tbl
    );

    execute format(
      'create policy %I on %I for delete to authenticated
       using (company_id = current_company_id())',
      tbl || '_delete_co', tbl
    );
  end loop;
end $$;

-- ============================================================
-- Special: notifications — SELECT restricted to user's own rows
-- ============================================================
do $$
begin
  perform drop_all_policies('notifications');
end $$;

create policy "notifications_select_co" on notifications for select
  to authenticated
  using (
    company_id = current_company_id()
    and (user_id = auth.uid() or user_id is null)
  );
create policy "notifications_insert_co" on notifications for insert
  to authenticated
  with check (company_id = current_company_id());
create policy "notifications_update_co" on notifications for update
  to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());
create policy "notifications_delete_co" on notifications for delete
  to authenticated
  using (company_id = current_company_id());

-- ============================================================
-- Drop the helper function
-- ============================================================
drop function if exists drop_all_policies(text);
