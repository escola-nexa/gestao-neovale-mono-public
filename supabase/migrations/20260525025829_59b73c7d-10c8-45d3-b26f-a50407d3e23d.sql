ALTER TABLE public.teacher_attendance_closure_signatures
  DROP CONSTRAINT IF EXISTS teacher_attendance_closure_signatures_signed_by_fkey;

ALTER TABLE public.teacher_attendance_closure_signatures
  ADD CONSTRAINT teacher_attendance_closure_signatures_signed_by_fkey
  FOREIGN KEY (signed_by) REFERENCES auth.users(id) ON DELETE SET NULL;