
DROP FUNCTION IF EXISTS public.generate_school_indication_links(uuid[], timestamp with time zone);

CREATE OR REPLACE FUNCTION public.generate_school_indication_links(
  p_school_ids uuid[],
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(out_school_id uuid, out_link_id uuid, out_token text, out_keyword text, out_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID; v_sid UUID; v_token TEXT; v_keyword TEXT; v_link_id UUID; v_existing UUID;
BEGIN
  SELECT ur.organization_id INTO v_org FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
  LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  FOREACH v_sid IN ARRAY p_school_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = v_sid AND s.organization_id = v_org AND s.status = 'ativo'
    ) THEN
      CONTINUE;
    END IF;

    SELECT el.id INTO v_existing FROM public.external_links el
    WHERE el.organization_id = v_org
      AND el.school_id = v_sid
      AND el.content_type = 'hr_school_indication'
      AND el.is_active = true
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      out_school_id := v_sid;
      out_link_id := v_existing;
      SELECT el.token INTO out_token FROM public.external_links el WHERE el.id = v_existing;
      out_keyword := NULL;
      out_created := false;
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
      out_school_id := v_sid;
      out_link_id := v_link_id;
      out_token := v_token;
      out_keyword := v_keyword;
      out_created := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;
