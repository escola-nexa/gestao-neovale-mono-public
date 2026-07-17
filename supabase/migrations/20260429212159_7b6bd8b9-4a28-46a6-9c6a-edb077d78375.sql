DROP FUNCTION IF EXISTS public.list_school_indication_links();

CREATE FUNCTION public.list_school_indication_links()
RETURNS TABLE(
  link_id UUID, school_id UUID, school_nome TEXT, qtd_cursos BIGINT,
  token TEXT, keyword TEXT, is_active BOOLEAN, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, qtd_indicacoes BIGINT, qtd_turmas BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT el.id, el.school_id, s.nome,
    (SELECT count(*) FROM public.course_schools cs JOIN public.courses c ON c.id = cs.course_id
       WHERE cs.school_id = el.school_id AND c.status='ativo'),
    el.token, el.scope_json->>'keyword', el.is_active, el.expires_at, el.created_at,
    (SELECT count(*) FROM public.hr_school_indications i WHERE i.external_link_id = el.id),
    (SELECT count(*) FROM public.hr_indication_classes cl WHERE cl.external_link_id = el.id)
  FROM public.external_links el
  JOIN public.schools s ON s.id = el.school_id
  WHERE el.content_type='hr_school_indication'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = el.organization_id
        AND ur.role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
    )
  ORDER BY s.nome;
$$;

GRANT EXECUTE ON FUNCTION public.list_school_indication_links() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_school_indication_link_info(p_token TEXT, p_keyword TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link RECORD; v_school RECORD; v_courses JSONB; v_teto INT;
BEGIN
  SELECT * INTO v_link FROM external_links
  WHERE token = p_token AND content_type='hr_school_indication' AND is_active=true LIMIT 1;
  IF v_link IS NULL THEN RETURN jsonb_build_object('error','Link inválido ou expirado'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error','Link expirado');
  END IF;
  IF upper(coalesce(v_link.scope_json->>'keyword','')) <> upper(coalesce(p_keyword,'')) THEN
    RETURN jsonb_build_object('error','Palavra-chave inválida');
  END IF;

  SELECT id, nome, codigo, cidade INTO v_school FROM schools WHERE id = v_link.school_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'codigo', c.codigo,
    'subjects', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'nome', s.nome, 'carga_horaria_semanal', s.carga_horaria_semanal
      ) ORDER BY s.nome), '[]'::jsonb)
      FROM subjects s WHERE s.course_id = c.id AND s.status='ativo'
    )
  ) ORDER BY c.nome), '[]'::jsonb) INTO v_courses
  FROM course_schools cs
  JOIN courses c ON c.id = cs.course_id
  WHERE cs.school_id = v_link.school_id AND c.organization_id = v_link.organization_id AND c.status='ativo';

  SELECT coalesce(teto_ch_semanal,24) INTO v_teto FROM hr_settings WHERE organization_id = v_link.organization_id LIMIT 1;
  IF v_teto IS NULL THEN v_teto := 24; END IF;

  RETURN jsonb_build_object(
    'link_id', v_link.id, 'organization_id', v_link.organization_id,
    'school', to_jsonb(v_school), 'courses', v_courses, 'teto_ch_professor', v_teto
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token TEXT, p_keyword TEXT, p_course_id UUID, p_classes JSONB, p_indications JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link RECORD; v_org UUID; v_school UUID;
  v_class JSONB; v_class_id UUID; v_class_ids UUID[] := ARRAY[]::UUID[];
  v_ind JSONB; v_count INT := 0;
BEGIN
  SELECT * INTO v_link FROM external_links
  WHERE token = p_token AND content_type='hr_school_indication' AND is_active=true LIMIT 1;
  IF v_link IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
  IF upper(coalesce(v_link.scope_json->>'keyword','')) <> upper(coalesce(p_keyword,'')) THEN
    RAISE EXCEPTION 'Palavra-chave inválida';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;

  IF NOT EXISTS (SELECT 1 FROM course_schools WHERE school_id = v_school AND course_id = p_course_id) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;

  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, school_id, course_id, external_link_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_school, p_course_id, v_link.id,
      coalesce(v_class->>'nome','Turma'),
      coalesce(v_class->>'turno','manha'),
      coalesce((v_class->>'qtd')::int, 3)
    ) RETURNING id INTO v_class_id;
    v_class_ids := array_append(v_class_ids, v_class_id);
  END LOOP;

  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    INSERT INTO hr_school_indications(
      organization_id, school_id, external_link_id, course_id,
      indication_class_id, candidato_nome, candidato_email, candidato_telefone,
      origem, status
    ) VALUES (
      v_org, v_school, v_link.id, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      v_ind->>'nome', v_ind->>'email', v_ind->>'telefone',
      'PORTAL_ESCOLA', 'PENDENTE'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'classes', coalesce(array_length(v_class_ids,1),0), 'indications', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_indication_link_info(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_school_indication_full(TEXT, TEXT, UUID, JSONB, JSONB) TO anon, authenticated;