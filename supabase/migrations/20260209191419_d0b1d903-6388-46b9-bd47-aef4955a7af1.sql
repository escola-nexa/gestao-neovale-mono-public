
CREATE OR REPLACE FUNCTION public.get_eligible_professors_subjects_for_pre_planning(p_org_id uuid, p_school_id uuid, p_course_id uuid, p_class_group_id uuid, p_bimester_number integer)
 RETURNS TABLE(professor_id uuid, professor_name text, subject_id uuid, subject_name text, subject_code text, semester text, weekly_hours integer, already_exists boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id, s.id)
    p.id as professor_id,
    p.full_name::text as professor_name,
    s.id as subject_id,
    s.nome as subject_name,
    s.codigo as subject_code,
    s.semester::text,
    s.carga_horaria_semanal as weekly_hours,
    EXISTS(
      SELECT 1 FROM public.pre_plannings pp
      WHERE pp.organization_id = p_org_id
        AND pp.professor_id = p.id
        AND pp.class_group_id = p_class_group_id
        AND pp.subject_id = s.id
        AND pp.bimester_number = p_bimester_number
        AND pp.deleted_at IS NULL
    ) as already_exists
  FROM public.weekly_teaching_models wtm
  INNER JOIN public.professors p ON p.id = wtm.professor_id
  INNER JOIN public.subjects s ON s.id = wtm.subject_id
  WHERE wtm.organization_id = p_org_id
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND s.deleted_at IS NULL
    AND s.status = 'ativo'
    AND p.deleted_at IS NULL
    AND p.status = 'ACTIVE'
    AND (
      (s.semester = 'FIRST' AND p_bimester_number IN (1, 2))
      OR (s.semester = 'SECOND' AND p_bimester_number IN (3, 4))
      OR (s.semester = 'ANNUAL')
    )
  ORDER BY p.id, s.id, p.full_name, s.nome;
END;
$function$;
