CREATE OR REPLACE FUNCTION public.get_school_indication_link_info(p_token text, p_keyword text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_link RECORD; v_school RECORD; v_courses JSONB; v_teto INT;
BEGIN
  SELECT * INTO v_link FROM external_links
  WHERE token = p_token AND content_type='hr_school_indication' AND is_active=true LIMIT 1;
  IF v_link IS NULL THEN RETURN jsonb_build_object('error','Link inválido ou expirado'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error','Link expirado');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('error','Palavra-chave inválida ou expirada');
  END IF;
  SELECT id, nome, codigo, cidade INTO v_school FROM schools WHERE id = v_link.school_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'codigo', c.codigo,
    'subjects', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'carga_horaria_semanal', s.carga_horaria_semanal
      ) ORDER BY s.nome), '[]'::jsonb)
      FROM subjects s
      WHERE s.course_id = c.id
        AND s.status = 'ativo'
        AND s.deleted_at IS NULL
    )
  ) ORDER BY c.nome), '[]'::jsonb) INTO v_courses
  FROM course_schools cs JOIN courses c ON c.id = cs.course_id
  WHERE cs.school_id = v_link.school_id
    AND c.organization_id = v_link.organization_id
    AND c.status = 'ativo'
    AND c.deleted_at IS NULL;
  SELECT coalesce(teto_ch_semanal,24) INTO v_teto FROM hr_settings WHERE organization_id = v_link.organization_id LIMIT 1;
  IF v_teto IS NULL THEN v_teto := 24; END IF;
  RETURN jsonb_build_object(
    'link_id', v_link.id, 'organization_id', v_link.organization_id,
    'school', to_jsonb(v_school), 'courses', v_courses, 'teto_ch_professor', v_teto
  );
END;
$function$;