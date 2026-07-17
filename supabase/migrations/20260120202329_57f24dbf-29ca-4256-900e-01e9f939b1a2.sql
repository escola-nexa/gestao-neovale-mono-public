-- Create enum for schedule types
CREATE TYPE public.schedule_type AS ENUM ('CLASS', 'PLANNING');

-- Add schedule_type column to weekly_teaching_models
ALTER TABLE public.weekly_teaching_models 
ADD COLUMN schedule_type public.schedule_type NOT NULL DEFAULT 'CLASS';

-- Make class_group_id and subject_id nullable (only required for CLASS type)
ALTER TABLE public.weekly_teaching_models 
ALTER COLUMN class_group_id DROP NOT NULL,
ALTER COLUMN subject_id DROP NOT NULL;

-- Add check constraint to ensure CLASS type has required fields
ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT check_class_type_requirements 
CHECK (
  (schedule_type = 'CLASS' AND class_group_id IS NOT NULL AND subject_id IS NOT NULL) OR
  (schedule_type = 'PLANNING' AND class_group_id IS NULL AND subject_id IS NULL)
);

-- Update conflict check function to work across both schedule types
CREATE OR REPLACE FUNCTION public.check_professor_schedule_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.weekly_teaching_models
    WHERE professor_id = NEW.professor_id
    AND weekday = NEW.weekday
    AND status = 'ACTIVE'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de horário: Professor já possui compromisso neste horário (aula ou planejamento)';
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS check_professor_schedule_conflict_trigger ON public.weekly_teaching_models;
CREATE TRIGGER check_professor_schedule_conflict_trigger
BEFORE INSERT OR UPDATE ON public.weekly_teaching_models
FOR EACH ROW
EXECUTE FUNCTION public.check_professor_schedule_conflict();