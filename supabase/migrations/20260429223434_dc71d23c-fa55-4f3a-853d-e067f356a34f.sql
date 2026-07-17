CREATE OR REPLACE FUNCTION public.generate_school_indication_links(p_school_ids uuid[], p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(out_school_id uuid, out_link_id uuid, out_token text, out_keyword text, out_created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_org UUID; v_school UUID; v_existing RECORD; v_token TEXT; v_link_id UUID;
BEGIN
  SELECT organization_id INTO v_org FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN
    SELECT organization_id INTO v_org FROM profiles WHERE id = auth.uid() LIMIT 1;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Organização não encontrada'; END IF;
  FOREACH v_school IN ARRAY p_school_ids LOOP
    SELECT id, token INTO v_existing
    FROM external_links
    WHERE organization_id = v_org AND school_id = v_school AND content_type = 'hr_school_indication'
    LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
      out_school_id := v_school; out_link_id := v_existing.id; out_token := v_existing.token;
      out_keyword := NULL; out_created := false; RETURN NEXT;
    ELSE
      v_token := encode(extensions.gen_random_bytes(16), 'hex');
      INSERT INTO external_links(
        organization_id, school_id, content_type, token,
        is_active, starts_at, expires_at, scope_json, created_by
      ) VALUES (
        v_org, v_school, 'hr_school_indication', v_token,
        true, now(), p_expires_at, '{}'::jsonb, auth.uid()
      ) RETURNING id INTO v_link_id;
      out_school_id := v_school; out_link_id := v_link_id; out_token := v_token;
      out_keyword := NULL; out_created := true; RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;