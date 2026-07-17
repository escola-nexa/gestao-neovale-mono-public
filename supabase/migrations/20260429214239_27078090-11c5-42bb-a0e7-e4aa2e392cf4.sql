
CREATE OR REPLACE FUNCTION public.delete_school_indication_link(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID; v_link RECORD;
  v_indications INT := 0; v_classes INT := 0; v_logs INT := 0;
BEGIN
  SELECT ur.organization_id INTO v_org FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
  LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT * INTO v_link FROM public.external_links
  WHERE id = p_link_id AND organization_id = v_org
    AND content_type = 'hr_school_indication';
  IF v_link IS NULL THEN RAISE EXCEPTION 'Link não encontrado'; END IF;

  WITH del AS (DELETE FROM public.hr_school_indications WHERE external_link_id = p_link_id RETURNING 1)
  SELECT count(*) INTO v_indications FROM del;

  WITH del AS (DELETE FROM public.hr_indication_classes WHERE external_link_id = p_link_id RETURNING 1)
  SELECT count(*) INTO v_classes FROM del;

  WITH del AS (DELETE FROM public.external_link_access_logs WHERE external_link_id = p_link_id RETURNING 1)
  SELECT count(*) INTO v_logs FROM del;

  DELETE FROM public.external_links WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'ok', true, 'indications', v_indications, 'classes', v_classes, 'logs', v_logs
  );
END;
$function$;
