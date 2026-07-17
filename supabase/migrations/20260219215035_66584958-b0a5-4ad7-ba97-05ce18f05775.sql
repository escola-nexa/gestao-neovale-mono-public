
-- Add start_time column to attendance_records for per-slot tracking
ALTER TABLE public.attendance_records 
ADD COLUMN start_time time without time zone;

-- Drop old unique constraint
ALTER TABLE public.attendance_records 
DROP CONSTRAINT attendance_records_class_group_id_subject_id_student_id_occ_key;

-- Create new unique constraint including start_time
ALTER TABLE public.attendance_records 
ADD CONSTRAINT attendance_records_unique_per_slot 
UNIQUE (class_group_id, subject_id, student_id, occurrence_date, start_time);
