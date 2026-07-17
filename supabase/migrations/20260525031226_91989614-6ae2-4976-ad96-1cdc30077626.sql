ALTER TABLE public.teacher_attendance_monthly_sheets
  DROP CONSTRAINT IF EXISTS teacher_attendance_monthly_sheets_reopened_by_fkey;
ALTER TABLE public.teacher_attendance_monthly_sheets
  ADD CONSTRAINT teacher_attendance_monthly_sheets_reopened_by_fkey
  FOREIGN KEY (reopened_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_attendance_monthly_sheets
  DROP CONSTRAINT IF EXISTS teacher_attendance_monthly_sheet_professor_acknowledged_by_fkey;
ALTER TABLE public.teacher_attendance_monthly_sheets
  ADD CONSTRAINT teacher_attendance_monthly_sheet_professor_acknowledged_by_fkey
  FOREIGN KEY (professor_acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;