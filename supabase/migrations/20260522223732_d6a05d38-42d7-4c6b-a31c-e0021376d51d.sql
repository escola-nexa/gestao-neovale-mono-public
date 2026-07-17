ALTER TABLE public.teacher_attendance_audit_logs
  DROP CONSTRAINT IF EXISTS teacher_attendance_audit_logs_actor_user_id_fkey;

ALTER TABLE public.teacher_attendance_audit_logs
  ADD CONSTRAINT teacher_attendance_audit_logs_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;