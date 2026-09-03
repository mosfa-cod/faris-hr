/*
# HRMS Advanced Modules — Self-Service, Recruitment, KPIs, Warnings & Sanctions

1. Overview
   Adds four advanced HR modules:
   - Self-service: employees request loans (in addition to leaves already in place).
   - Recruitment: track job applicants and their CVs.
   - KPIs: per-employee key performance indicators with targets and progress.
   - Warnings & Sanctions: document disciplinary actions and contract-expiry alerts for HR.

2. New Tables
   - `loan_requests`     : employee-initiated loan requests with approval workflow.
   - `applicants`        : job applicants with status pipeline and CV storage reference.
   - `kpis`              : KPI definitions per employee with target, actual, weight, score.
   - `warnings`          : disciplinary warnings/sanctions tied to employees and labor-law notes.

3. Security
   - RLS enabled on every table.
   - All tables allow `TO anon, authenticated` CRUD (single-tenant shared workspace, anon-key app). Visibility enforced in the application layer per role. Documented as intentionally shared data.

4. Important Notes
   - `loan_requests` has a workflow: pending -> approved | rejected.
   - `applicants.status` pipeline: applied -> screening -> interview -> offered -> hired | rejected.
   - `kpis` has a `period` (e.g. "2025-Q3") and computes score from actual/target.
   - `warnings.type`: verbal | written | suspension | termination.
*/

-- ============ loan_requests ============
create table if not exists loan_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  installments int not null default 1,
  status text not null default 'pending', -- pending | approved | rejected
  hr_decision text,
  decided_at timestamptz,
  created_at timestamptz default now()
);
alter table loan_requests enable row level security;
drop policy if exists "loan_requests_select" on loan_requests;
create policy "loan_requests_select" on loan_requests for select to anon, authenticated using (true);
drop policy if exists "loan_requests_insert" on loan_requests;
create policy "loan_requests_insert" on loan_requests for insert to anon, authenticated with check (true);
drop policy if exists "loan_requests_update" on loan_requests;
create policy "loan_requests_update" on loan_requests for update to anon, authenticated using (true) with check (true);
drop policy if exists "loan_requests_delete" on loan_requests;
create policy "loan_requests_delete" on loan_requests for delete to anon, authenticated using (true);
create index if not exists idx_loan_requests_employee on loan_requests(employee_id);

-- ============ applicants ============
create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  position_applied text,
  department_id uuid references departments(id) on delete set null,
  status text not null default 'applied', -- applied | screening | interview | offered | hired | rejected
  cv_path text,
  cv_url text,
  notes text,
  applied_at timestamptz default now()
);
alter table applicants enable row level security;
drop policy if exists "applicants_select" on applicants;
create policy "applicants_select" on applicants for select to anon, authenticated using (true);
drop policy if exists "applicants_insert" on applicants;
create policy "applicants_insert" on applicants for insert to anon, authenticated with check (true);
drop policy if exists "applicants_update" on applicants;
create policy "applicants_update" on applicants for update to anon, authenticated using (true) with check (true);
drop policy if exists "applicants_delete" on applicants;
create policy "applicants_delete" on applicants for delete to anon, authenticated using (true);
create index if not exists idx_applicants_status on applicants(status);

-- ============ kpis ============
create table if not exists kpis (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  target numeric(12,2) not null default 100,
  actual numeric(12,2) not null default 0,
  weight int not null default 1, -- 1-5 importance
  period text, -- e.g. "2025-Q3"
  score numeric(5,2) default 0, -- computed percentage
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table kpis enable row level security;
drop policy if exists "kpis_select" on kpis;
create policy "kpis_select" on kpis for select to anon, authenticated using (true);
drop policy if exists "kpis_insert" on kpis;
create policy "kpis_insert" on kpis for insert to anon, authenticated with check (true);
drop policy if exists "kpis_update" on kpis;
create policy "kpis_update" on kpis for update to anon, authenticated using (true) with check (true);
drop policy if exists "kpis_delete" on kpis;
create policy "kpis_delete" on kpis for delete to anon, authenticated using (true);
create index if not exists idx_kpis_employee on kpis(employee_id);

-- ============ warnings ============
create table if not exists warnings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null, -- verbal | written | suspension | termination
  reason text not null,
  date date not null,
  issued_by text,
  labor_law_ref text, -- مرجع قانون العمل
  status text not null default 'active', -- active | revoked
  notes text,
  created_at timestamptz default now()
);
alter table warnings enable row level security;
drop policy if exists "warnings_select" on warnings;
create policy "warnings_select" on warnings for select to anon, authenticated using (true);
drop policy if exists "warnings_insert" on warnings;
create policy "warnings_insert" on warnings for insert to anon, authenticated with check (true);
drop policy if exists "warnings_update" on warnings;
create policy "warnings_update" on warnings for update to anon, authenticated using (true) with check (true);
drop policy if exists "warnings_delete" on warnings;
create policy "warnings_delete" on warnings for delete to anon, authenticated using (true);
create index if not exists idx_warnings_employee on warnings(employee_id);
create index if not exists idx_warnings_status on warnings(status);

-- updated_at trigger for kpis
drop trigger if exists trg_kpis_updated_at on kpis;
create trigger trg_kpis_updated_at
before update on kpis
for each row execute function set_updated_at();
