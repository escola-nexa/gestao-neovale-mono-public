
ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_call_created_by_fkey;
ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_call_created_by_fkey
  FOREIGN KEY (call_created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
