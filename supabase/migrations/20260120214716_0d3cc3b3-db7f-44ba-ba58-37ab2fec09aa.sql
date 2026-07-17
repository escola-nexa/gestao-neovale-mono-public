-- First drop policies that depend on status column
DROP POLICY IF EXISTS "Professors can update assigned pre-plannings" ON public.pre_plannings;

-- Add soft delete column
ALTER TABLE public.pre_plannings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_pre_plannings_deleted ON public.pre_plannings(deleted_at) WHERE deleted_at IS NULL;

-- Create function to check if pre-planning can be edited by coordinator
CREATE OR REPLACE FUNCTION public.can_edit_pre_planning(p_pre_planning_id uuid)
RETURNS TABLE(can_edit boolean, reason text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_deleted_at timestamptz;
BEGIN
  -- Get current status
  SELECT status, deleted_at INTO v_status, v_deleted_at
  FROM public.pre_plannings
  WHERE id = p_pre_planning_id;
  
  IF v_deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Pré-planejamento foi excluído'::text;
    RETURN;
  END IF;
  
  IF v_status IS NULL THEN
    RETURN QUERY SELECT false, 'Pré-planejamento não encontrado'::text;
    RETURN;
  END IF;
  
  -- Only allow editing if status is 'GERADO' (not started by professor)
  IF v_status = 'GERADO' THEN
    RETURN QUERY SELECT true, NULL::text;
  ELSE
    RETURN QUERY SELECT false, 'Este planejamento já está em edição pelo professor'::text;
  END IF;
END;
$$;

-- Create function to soft delete pre-planning (only if not started)
CREATE OR REPLACE FUNCTION public.soft_delete_pre_planning(p_pre_planning_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_deleted_at timestamptz;
  v_org_id uuid;
BEGIN
  -- Get current status and org
  SELECT status, deleted_at, organization_id 
  INTO v_status, v_deleted_at, v_org_id
  FROM public.pre_plannings
  WHERE id = p_pre_planning_id;
  
  -- Check if already deleted
  IF v_deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Pré-planejamento já foi excluído'::text;
    RETURN;
  END IF;
  
  -- Check user is coordinator
  IF NOT is_coordinator(auth.uid(), v_org_id) THEN
    RETURN QUERY SELECT false, 'Apenas coordenadores podem excluir pré-planejamentos'::text;
    RETURN;
  END IF;
  
  -- Only allow if status is 'GERADO'
  IF v_status != 'GERADO' THEN
    RETURN QUERY SELECT false, 'Este planejamento já está em edição pelo professor. Não é possível excluir.'::text;
    RETURN;
  END IF;
  
  -- Perform soft delete
  UPDATE public.pre_plannings
  SET deleted_at = now()
  WHERE id = p_pre_planning_id;
  
  RETURN QUERY SELECT true, 'Pré-planejamento excluído com sucesso'::text;
END;
$$;

-- Update RLS policy for pre_plannings to exclude soft-deleted records
DROP POLICY IF EXISTS "Coordinators can manage pre-plannings" ON public.pre_plannings;
CREATE POLICY "Coordinators can manage pre-plannings" ON public.pre_plannings
  FOR ALL
  USING (is_coordinator(auth.uid(), organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Professors can view assigned pre-plannings" ON public.pre_plannings;
CREATE POLICY "Professors can view assigned pre-plannings" ON public.pre_plannings
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    has_organization_access(auth.uid(), organization_id) AND 
    EXISTS (
      SELECT 1 FROM weekly_teaching_models wtm
      JOIN professors p ON p.id = wtm.professor_id
      WHERE wtm.school_id = pre_plannings.school_id
        AND wtm.course_id = pre_plannings.course_id
        AND wtm.class_group_id = pre_plannings.class_group_id
        AND wtm.subject_id = pre_plannings.subject_id
        AND wtm.status = 'ACTIVE'
        AND p.user_id = auth.uid()
    )
  );

-- Recreate update policy with status check
CREATE POLICY "Professors can update assigned pre-plannings" ON public.pre_plannings
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    has_organization_access(auth.uid(), organization_id) AND
    status != 'APROVADO' AND
    EXISTS (
      SELECT 1 FROM weekly_teaching_models wtm
      JOIN professors p ON p.id = wtm.professor_id
      WHERE wtm.school_id = pre_plannings.school_id
        AND wtm.course_id = pre_plannings.course_id
        AND wtm.class_group_id = pre_plannings.class_group_id
        AND wtm.subject_id = pre_plannings.subject_id
        AND wtm.status = 'ACTIVE'
        AND p.user_id = auth.uid()
    )
  );

-- Add trigger to set status to 'EM_EDICAO' when professor starts editing
CREATE OR REPLACE FUNCTION public.mark_pre_planning_in_editing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If status is 'GERADO' and content is being changed, mark as 'EM_EDICAO'
  IF OLD.status = 'GERADO' AND (
    NEW.objective IS DISTINCT FROM OLD.objective OR
    NEW.competencies IS DISTINCT FROM OLD.competencies OR
    NEW.contents IS DISTINCT FROM OLD.contents OR
    NEW.methodology IS DISTINCT FROM OLD.methodology OR
    NEW.resources IS DISTINCT FROM OLD.resources OR
    NEW.evaluation IS DISTINCT FROM OLD.evaluation OR
    NEW.product IS DISTINCT FROM OLD.product OR
    NEW.next_steps IS DISTINCT FROM OLD.next_steps
  ) THEN
    -- Check if editor is professor (not coordinator)
    IF NOT is_coordinator(auth.uid(), NEW.organization_id) THEN
      NEW.status := 'EM_EDICAO';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_pre_planning_in_editing ON public.pre_plannings;
CREATE TRIGGER trg_mark_pre_planning_in_editing
  BEFORE UPDATE ON public.pre_plannings
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_pre_planning_in_editing();