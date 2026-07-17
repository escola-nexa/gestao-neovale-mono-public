ALTER TABLE public.teacher_attendance_monthly_sheets
  DROP CONSTRAINT IF EXISTS teacher_attendance_monthly_sheets_closed_by_fkey;

ALTER TABLE public.teacher_attendance_monthly_sheets
  ADD CONSTRAINT teacher_attendance_monthly_sheets_closed_by_fkey
  FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;