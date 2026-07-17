-- Add start_time and end_time to pre_plannings
ALTER TABLE public.pre_plannings
  ADD COLUMN start_time time without time zone,
  ADD COLUMN end_time time without time zone;

-- Add start_time and end_time to teacher_plannings too
ALTER TABLE public.teacher_plannings
  ADD COLUMN class_date date,
  ADD COLUMN start_time time without time zone,
  ADD COLUMN end_time time without time zone;