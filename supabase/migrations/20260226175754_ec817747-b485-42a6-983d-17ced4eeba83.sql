
-- Update soft_delete function to allow admins to delete any pre-planning regardless of status
CREATE OR REPLACE FUNCTION public.soft_delete_pre_planning(p_pre_planning_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_deleted_at timestamptz;
  v_org_id uuid;
  v_is_admin boolean;
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
  
  -- Check if user is admin
  v_is_admin := is_admin(auth.uid());
  
  -- Check user is coordinator (or admin)
  IF NOT v_is_admin AND NOT is_coordinator(auth.uid(), v_org_id) THEN
    RETURN QUERY SELECT false, 'Apenas coordenadores podem excluir pré-planejamentos'::text;
    RETURN;
  END IF;
  
  -- Only allow non-admins to delete if status is 'GERADO'
  IF NOT v_is_admin AND v_status != 'GERADO' THEN
    RETURN QUERY SELECT false, 'Este planejamento já está em edição pelo professor. Não é possível excluir.'::text;
    RETURN;
  END IF;
  
  -- Perform soft delete
  UPDATE public.pre_plannings
  SET deleted_at = now()
  WHERE id = p_pre_planning_id;
  
  RETURN QUERY SELECT true, 'Pré-planejamento excluído com sucesso'::text;
END;
$function$;
