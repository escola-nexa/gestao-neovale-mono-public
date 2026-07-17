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
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'coordenador'::app_role)
       OR public.has_role(auth.uid(),'rh'::app_role)) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  WITH del AS (DELETE FROM public.hr_indication_classes
    WHERE indication_id IN (SELECT id FROM public.hr_school_indications WHERE external_link_id = p_link_id)
    RETURNING 1)
  SELECT count(*) INTO v_classes FROM del;

  WITH del AS (DELETE FROM public.hr_school_indications WHERE external_link_id = p_link_id RETURNING 1)
  SELECT count(*) INTO v_indications FROM del;

  WITH del AS (DELETE FROM public.external_access_logs WHERE external_link_id = p_link_id RETURNING 1)
  SELECT count(*) INTO v_logs FROM del;

  DELETE FROM public.external_links WHERE id = p_link_id;

  RETURN jsonb_build_object('indications', v_indications, 'classes', v_classes, 'logs', v_logs);
END;
$$;