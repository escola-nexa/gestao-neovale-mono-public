
DROP FUNCTION IF EXISTS public.generate_school_indication_links(uuid[], timestamp with time zone);

CREATE OR REPLACE FUNCTION public.generate_school_indication_links(
  p_school_ids uuid[],
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(school_id uuid, link_id uuid, token text, keyword text, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID; v_sid UUID; v_token TEXT; v_keyword TEXT; v_link_id UUID; v_existing UUID;
BEGIN
  SELECT organization_id INTO v_org FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
  LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  FOREACH v_sid IN ARRAY p_school_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = v_sid AND s.organization_id = v_org AND s.status = 'ativo'
    ) THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_existing FROM public.external_links
    WHERE organization_id = v_org AND school_id = v_sid
      AND content_type = 'hr_school_indication' AND is_active = true
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      school_id := v_sid; link_id := v_existing;
      SELECT el.token INTO token FROM public.external_links el WHERE el.id = v_existing;
      keyword := NULL; created := false;
      RETURN NEXT;
    ELSE
      v_token := encode(gen_random_bytes(18), 'hex');
      v_keyword := upper(substring(encode(gen_random_bytes(4),'hex'),1,8));
      INSERT INTO public.external_links(
        organization_id, school_id, created_by, content_type, scope_json,
        token, is_active, starts_at, expires_at
      ) VALUES (
        v_org, v_sid, auth.uid(), 'hr_school_indication',
        jsonb_build_object('keyword', v_keyword),
        v_token, true, now(), p_expires_at
      ) RETURNING id INTO v_link_id;
      school_id := v_sid; link_id := v_link_id;
      token := v_token; keyword := v_keyword; created := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

DROP FUNCTION IF EXISTS public.submit_school_indication_full(text, text, jsonb, jsonb);
