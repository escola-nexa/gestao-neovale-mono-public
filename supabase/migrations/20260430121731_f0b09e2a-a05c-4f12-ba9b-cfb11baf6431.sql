CREATE OR REPLACE FUNCTION public.delete_school_indication_link(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indications int := 0;
  v_classes int := 0;
  v_logs int := 0;
  v_alloc_items int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'coordenador'::app_role)
       OR public.has_role(auth.uid(),'rh'::app_role)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  -- 1) Desativa o link primeiro para impedir novas inserções concorrentes via RPC submit_*
  UPDATE public.external_links
     SET is_active = false
   WHERE id = p_link_id;

  -- 2) Conta itens de alocação que ficarão desvinculados (FK ON DELETE SET NULL)
  SELECT count(*) INTO v_alloc_items
    FROM public.hr_allocation_items
   WHERE indicado_por_external_link_id = p_link_id;

  -- 3) Apaga indicações ligadas ao link (precisa ser ANTES das classes para liberar FK indication_class_id se RESTRICT no futuro)
  WITH del AS (
    DELETE FROM public.hr_school_indications
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_indications FROM del;

  -- 4) Apaga TODAS as turmas declaradas pelo link (inclusive órfãs criadas sem indicações)
  WITH del AS (
    DELETE FROM public.hr_indication_classes
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_classes FROM del;

  -- 5) Apaga logs de acesso externo
  WITH del AS (
    DELETE FROM public.external_access_logs
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_logs FROM del;

  -- 6) Apaga o link em si
  DELETE FROM public.external_links WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'indications', v_indications,
    'classes', v_classes,
    'logs', v_logs,
    'allocation_items_unlinked', v_alloc_items
  );
END;
$$;