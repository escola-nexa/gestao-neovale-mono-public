
CREATE OR REPLACE FUNCTION public.bulk_soft_delete_pre_plannings(p_ids uuid[])
 RETURNS TABLE(deleted_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_user uuid := auth.uid();
  v_deleted int := 0;
  v_skipped int := 0;
  v_allowed uuid[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  v_is_admin := is_admin(v_user);

  -- IDs que o usuário pode realmente excluir
  SELECT COALESCE(array_agg(t.id), ARRAY[]::uuid[])
    INTO v_allowed
    FROM public.pre_plannings t
   WHERE t.id = ANY(p_ids)
     AND (v_is_admin OR is_coordinator(v_user, t.organization_id))
     AND (v_is_admin OR t.status = 'GERADO');

  IF array_length(v_allowed, 1) IS NULL THEN
    RETURN QUERY SELECT 0, COALESCE(array_length(p_ids,1),0);
    RETURN;
  END IF;

  -- 1) Apaga dependências diretas
  DELETE FROM public.pre_planning_materials WHERE pre_planning_id = ANY(v_allowed);
  DELETE FROM public.planning_audit_log     WHERE pre_planning_id = ANY(v_allowed);

  -- 2) Desvincula teacher_plannings (preserva o planejamento do professor)
  UPDATE public.teacher_plannings
     SET pre_planning_id = NULL, updated_at = now()
   WHERE pre_planning_id = ANY(v_allowed);

  -- 3) HARD DELETE do pré-planejamento
  WITH del AS (
    DELETE FROM public.pre_plannings WHERE id = ANY(v_allowed) RETURNING 1
  )
  SELECT count(*)::int INTO v_deleted FROM del;

  v_skipped := COALESCE(array_length(p_ids,1),0) - v_deleted;
  RETURN QUERY SELECT v_deleted, v_skipped;
END;
$function$;
