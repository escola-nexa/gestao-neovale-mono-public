-- ==========================================================================
-- CORREÇÃO: Filtro de elegibilidade para pré-planejamento e suporte ANUAL
-- ==========================================================================

-- Atualiza a função get_eligible_subjects_for_pre_planning para:
-- 1. Filtrar apenas horários do tipo 'CLASS' (já existia, mas reforçando)
-- 2. Corrigir a lógica de compatibilidade de semestre para incluir disciplinas 'ANNUAL'

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
    AND wtm.schedule_type = 'CLASS' -- Garante apenas aulas, não planejamentos
    AND wtm.status = 'ACTIVE'
  WHERE s.course_id = p_course_id
    AND s.organization_id = p_org_id
    AND s.deleted_at IS NULL
    AND s.status = 'ativo'
    -- Filter by semester compatibility with bimester
    -- Agora inclui explicitamente ANNUAL, que é compatível com todos os bimestres (1, 2, 3, 4)
    AND (
      (s.semester = 'FIRST' AND p_bimester_number IN (1, 2))
      OR (s.semester = 'SECOND' AND p_bimester_number IN (3, 4))
      OR (s.semester = 'ANNUAL') -- ANUAL aceita qualquer bimestre válido
    )
  GROUP BY s.id, s.nome, s.codigo, s.semester, s.carga_horaria_semanal;
END;
$function$;
