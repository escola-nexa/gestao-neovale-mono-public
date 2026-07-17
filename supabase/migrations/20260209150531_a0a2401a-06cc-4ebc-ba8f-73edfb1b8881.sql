
-- Add professor_id column to pre_plannings
ALTER TABLE public.pre_plannings
ADD COLUMN IF NOT EXISTS professor_id uuid REFERENCES public.professors(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pre_plannings_professor_id ON public.pre_plannings(professor_id);

-- Uniqueness: one pre-planning per professor+context+bimester
CREATE UNIQUE INDEX idx_pre_plannings_unique_professor_context 
ON public.pre_plannings(organization_id, professor_id, school_id, course_id, class_group_id, subject_id, bimester_number)
WHERE deleted_at IS NULL AND professor_id IS NOT NULL;

-- New DB function: get eligible professors+subjects for bulk generation
CREATE OR REPLACE FUNCTION public.get_eligible_professors_subjects_for_pre_planning(
  p_org_id uuid, 
  p_school_id uuid, 
  p_course_id uuid, 
  p_class_group_id uuid, 
  p_bimester_number integer
)
RETURNS TABLE(
  professor_id uuid, 
  professor_name text, 
  subject_id uuid, 
  subject_name text, 
  subject_code text, 
  semester text, 
  weekly_hours integer, 
  already_exists boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
  ORDER BY p.full_name, s.nome;
END;
$$;

-- Update RLS policies for pre_plannings to support professor_id
DROP POLICY IF EXISTS "Professors can view assigned pre-plannings" ON public.pre_plannings;
CREATE POLICY "Professors can view assigned pre-plannings"
ON public.pre_plannings
FOR SELECT
USING (
  deleted_at IS NULL 
  AND has_organization_access(auth.uid(), organization_id)
  AND (
    (professor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professors p
      WHERE p.id = pre_plannings.professor_id AND p.user_id = auth.uid()
    ))
    OR
    (professor_id IS NULL AND EXISTS (
      SELECT 1 FROM public.weekly_teaching_models wtm
      JOIN public.professors p ON p.id = wtm.professor_id
      WHERE wtm.school_id = pre_plannings.school_id
        AND wtm.course_id = pre_plannings.course_id
        AND wtm.class_group_id = pre_plannings.class_group_id
        AND wtm.subject_id = pre_plannings.subject_id
        AND wtm.status = 'ACTIVE'
        AND p.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Professors can update assigned pre-plannings" ON public.pre_plannings;
CREATE POLICY "Professors can update assigned pre-plannings"
ON public.pre_plannings
FOR UPDATE
USING (
  deleted_at IS NULL 
  AND has_organization_access(auth.uid(), organization_id)
  AND status <> 'APROVADO'
  AND (
    (professor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.professors p
      WHERE p.id = pre_plannings.professor_id AND p.user_id = auth.uid()
    ))
    OR
    (professor_id IS NULL AND EXISTS (
      SELECT 1 FROM public.weekly_teaching_models wtm
      JOIN public.professors p ON p.id = wtm.professor_id
      WHERE wtm.school_id = pre_plannings.school_id
        AND wtm.course_id = pre_plannings.course_id
        AND wtm.class_group_id = pre_plannings.class_group_id
        AND wtm.subject_id = pre_plannings.subject_id
        AND wtm.status = 'ACTIVE'
        AND p.user_id = auth.uid()
    ))
  )
);
