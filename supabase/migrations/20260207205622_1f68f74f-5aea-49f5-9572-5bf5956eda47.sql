-- Migration 1: Add ANNUAL to semester enum
ALTER TYPE subject_semester ADD VALUE IF NOT EXISTS 'ANNUAL';

-- Migration 2: Fix pre-planning eligibility (filter by CLASS type and add ANNUAL support)
CREATE OR REPLACE FUNCTION public.get_eligible_subjects_for_pre_planning(
  p_org_id uuid,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_bimester_number integer
)
RETURNS TABLE(
  subject_id uuid,
  subject_name text,
  subject_code text,
  semester text,
  weekly_hours integer,
  professors_count integer,
  already_exists boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subject_id,
    s.nome as subject_name,
    s.codigo as subject_code,
    s.semester::text,
    s.carga_horaria_semanal as weekly_hours,
    COUNT(DISTINCT wtm.professor_id)::integer as professors_count,
    EXISTS(
      SELECT 1 FROM public.pre_plannings pp
      WHERE pp.organization_id = p_org_id
        AND pp.class_group_id = p_class_group_id
        AND pp.subject_id = s.id
        AND pp.bimester_number = p_bimester_number
    ) as already_exists
  FROM public.subjects s
  INNER JOIN public.weekly_teaching_models wtm 
    ON wtm.subject_id = s.id 
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
  WHERE s.course_id = p_course_id
    AND s.organization_id = p_org_id
    AND s.deleted_at IS NULL
    AND s.status = 'ativo'
    AND (
      (s.semester = 'FIRST' AND p_bimester_number IN (1, 2))
      OR (s.semester = 'SECOND' AND p_bimester_number IN (3, 4))
      OR (s.semester = 'ANNUAL')
    )
  GROUP BY s.id, s.nome, s.codigo, s.semester, s.carga_horaria_semanal;
END;
$function$;