
-- 1) RPC: elegíveis a substituição
CREATE OR REPLACE FUNCTION public.list_eligible_substituted_professors(p_organization_id uuid)
RETURNS TABLE(id uuid, full_name text, cpf text, registration_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.cpf, p.registration_code
  FROM public.professors p
  WHERE p.organization_id = p_organization_id
    AND p.deleted_at IS NULL
    AND p.status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM public.professor_school_courses psc
      WHERE psc.professor_id = p.id AND psc.status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM public.weekly_teaching_models wtm
      WHERE wtm.professor_id = p.id AND wtm.status = 'ACTIVE'
    )
  ORDER BY p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.list_eligible_substituted_professors(uuid) TO authenticated;

-- 2) RLS: coordenador só vê próprias solicitações
DROP POLICY IF EXISTS "tsr_select" ON public.teacher_substitution_requests;

CREATE POLICY "tsr_select"
ON public.teacher_substitution_requests
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
    OR (has_role(auth.uid(), 'coordenador'::app_role) AND requested_by = auth.uid())
    OR substituted_professor_id = get_professor_id_for_user(auth.uid())
    OR substitute_professor_id = get_professor_id_for_user(auth.uid())
  )
);
