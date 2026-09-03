/*
# Add work schedules for attendance management

1. New Tables
- `work_schedules`
- `id` (uuid, primary key)
- `company_id` (uuid, owning company)
- `name` (text, schedule name)
- `start_time` and `end_time` (time, working hours)
- `work_days` (text array, Arabic weekday labels)
- `break_minutes` (integer, unpaid break duration)
- `created_at` (timestamptz)

2. Security
- Row level security is enabled.
- Authenticated users can access schedules only for active company memberships.
- Separate select, insert, update, and delete policies are defined.

3. Important Notes
- Existing tables and user data are unchanged.
- The table supports the Work Schedules tab on the attendance page.
*/

CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  work_days text[] NOT NULL DEFAULT ARRAY['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  break_minutes integer NOT NULL DEFAULT 60 CHECK (break_minutes >= 0 AND break_minutes <= 480),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_schedules_company_id_idx ON public.work_schedules(company_id);

ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view company work schedules" ON public.work_schedules;
CREATE POLICY "Members can view company work schedules"
  ON public.work_schedules FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = work_schedules.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
  ));

DROP POLICY IF EXISTS "Members can add company work schedules" ON public.work_schedules;
CREATE POLICY "Members can add company work schedules"
  ON public.work_schedules FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = work_schedules.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
  ));

DROP POLICY IF EXISTS "Members can update company work schedules" ON public.work_schedules;
CREATE POLICY "Members can update company work schedules"
  ON public.work_schedules FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = work_schedules.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = work_schedules.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
  ));

DROP POLICY IF EXISTS "Members can delete company work schedules" ON public.work_schedules;
CREATE POLICY "Members can delete company work schedules"
  ON public.work_schedules FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_members.company_id = work_schedules.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
  ));