
-- Add week columns to pre_plannings
ALTER TABLE public.pre_plannings
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS week_start_date date,
  ADD COLUMN IF NOT EXISTS week_end_date date;

-- Add same columns to teacher_plannings
ALTER TABLE public.teacher_plannings
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS week_start_date date,
  ADD COLUMN IF NOT EXISTS week_end_date date;

-- Drop old unique index and create new one including week_number
DROP INDEX IF EXISTS idx_pre_plannings_unique_professor_context;

CREATE UNIQUE INDEX idx_pre_plannings_unique_professor_context
  ON public.pre_plannings (organization_id, professor_id, school_id, course_id, class_group_id, subject_id, bimester_number, week_number)
  WHERE deleted_at IS NULL;

-- Update the eligible professors function to also return schedule days
CREATE OR REPLACE FUNCTION public.get_professor_weekly_schedule_for_subject(
  p_org_id uuid,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_professor_id uuid,
  p_subject_id uuid
)
RETURNS TABLE(weekday text, start_time time, end_time time)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT wtm.weekday::text, wtm.start_time, wtm.end_time
  FROM public.weekly_teaching_models wtm
  WHERE wtm.organization_id = p_org_id
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.professor_id = p_professor_id
    AND wtm.subject_id = p_subject_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
  ORDER BY
    CASE wtm.weekday
      WHEN 'SEGUNDA' THEN 1
      WHEN 'TERCA' THEN 2
      WHEN 'QUARTA' THEN 3
      WHEN 'QUINTA' THEN 4
      WHEN 'SEXTA' THEN 5
    END;
END;
$function$;
