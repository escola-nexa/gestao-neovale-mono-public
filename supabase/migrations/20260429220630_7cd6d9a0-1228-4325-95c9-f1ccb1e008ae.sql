CREATE OR REPLACE FUNCTION public.is_active_quarterly_keyword(p_org_id uuid, p_keyword text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash TEXT;
BEGIN
  IF p_keyword IS NULL OR length(trim(p_keyword)) = 0 THEN RETURN false; END IF;
  v_hash := encode(extensions.digest(lower(trim(p_keyword)), 'sha256'), 'hex');
  RETURN EXISTS (
    SELECT 1 FROM public.quarterly_keywords
    WHERE organization_id = p_org_id
      AND is_active = true
      AND keyword_hash = v_hash
      AND starts_at <= now()
      AND expires_at > now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_indication_link_info(p_token text, p_keyword text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
      FROM subjects s WHERE s.course_id = c.id AND s.status='ativo'
    )
  ) ORDER BY c.nome), '[]'::jsonb) INTO v_courses
  FROM course_schools cs JOIN courses c ON c.id = cs.course_id
  WHERE cs.school_id = v_link.school_id AND c.organization_id = v_link.organization_id AND c.status='ativo';
  SELECT coalesce(teto_ch_semanal,24) INTO v_teto FROM hr_settings WHERE organization_id = v_link.organization_id LIMIT 1;
  IF v_teto IS NULL THEN v_teto := 24; END IF;
  RETURN jsonb_build_object(
    'link_id', v_link.id, 'organization_id', v_link.organization_id,
    'school', to_jsonb(v_school), 'courses', v_courses, 'teto_ch_professor', v_teto
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_school_indication_full(p_token text, p_keyword text, p_course_id uuid, p_classes jsonb, p_indications jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link RECORD; v_org UUID; v_school UUID;
  v_class JSONB; v_class_id UUID; v_class_ids UUID[] := ARRAY[]::UUID[];
  v_ind JSONB; v_count INT := 0;
BEGIN
  SELECT * INTO v_link FROM external_links
  WHERE token = p_token AND content_type='hr_school_indication' AND is_active=true LIMIT 1;
  IF v_link IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;
  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  IF NOT EXISTS (SELECT 1 FROM course_schools WHERE school_id = v_school AND course_id = p_course_id) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;
  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome_turma, turno, qtd_alunos
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      coalesce(v_class->>'nome',''),
      coalesce((v_class->>'turno')::text,'manha'),
      coalesce((v_class->>'qtd')::int,0)
    ) RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || v_class_id;
  END LOOP;
  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidate_name, candidate_phone, candidate_email, status
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      coalesce(v_ind->>'nome',''),
      coalesce(v_ind->>'telefone',''),
      coalesce(v_ind->>'email',''),
      'pendente'
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'classes', array_length(v_class_ids,1), 'indications', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_school_indication(p_token text, p_keyword text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link RECORD; v_indication_id UUID;
BEGIN
  SELECT id, organization_id, school_id, content_type, is_active, expires_at, starts_at, scope_json
    INTO v_link FROM public.external_links WHERE token = p_token;
  IF v_link.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado'); END IF;
  IF v_link.is_active IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'Link inativo'); END IF;
  IF v_link.starts_at > now() THEN RETURN jsonb_build_object('success', false, 'error', 'Link ainda não está disponível'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link expirado');
  END IF;
  IF v_link.content_type <> 'RH_INDICACOES' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link não é de indicações');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Palavra-chave inválida ou expirada');
  END IF;
  IF COALESCE(p_payload->>'indicado_por_nome', '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe seu nome');
  END IF;
  IF COALESCE(p_payload->>'candidato_nome', '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe o nome do candidato');
  END IF;
  INSERT INTO public.hr_school_indications(
    organization_id, external_link_id, school_id, course_id,
    candidate_name, candidate_phone, candidate_email, status
  ) VALUES (
    v_link.organization_id, v_link.id, v_link.school_id,
    NULLIF(p_payload->>'course_id','')::uuid,
    p_payload->>'candidato_nome',
    p_payload->>'candidato_telefone',
    p_payload->>'candidato_email',
    'pendente'
  ) RETURNING id INTO v_indication_id;
  RETURN jsonb_build_object('success', true, 'indication_id', v_indication_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_indication_link_info(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link RECORD; v_school_nome TEXT;
BEGIN
  SELECT id, organization_id, school_id, content_type, is_active, expires_at, starts_at, scope_json
    INTO v_link FROM public.external_links WHERE token = p_token;
  IF v_link.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado'); END IF;
  IF v_link.is_active IS NOT TRUE
     OR v_link.starts_at > now()
     OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < now())
     OR v_link.content_type <> 'RH_INDICACOES' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido ou expirado');
  END IF;
  SELECT nome INTO v_school_nome FROM public.schools WHERE id = v_link.school_id;
  RETURN jsonb_build_object(
    'success', true,
    'school_id', v_link.school_id,
    'school_nome', v_school_nome,
    'requires_keyword', true
  );
END;
$$;

DROP FUNCTION IF EXISTS public.generate_school_indication_links(uuid[], timestamptz);
CREATE FUNCTION public.generate_school_indication_links(p_school_ids uuid[], p_expires_at timestamptz DEFAULT NULL)
RETURNS TABLE(out_school_id uuid, out_link_id uuid, out_token text, out_keyword text, out_created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_org UUID; v_school UUID; v_existing RECORD; v_token TEXT; v_link_id UUID;
BEGIN
  SELECT organization_id INTO v_org FROM profiles WHERE id = auth.uid() LIMIT 1;
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
$$;

DROP FUNCTION IF EXISTS public.list_school_indication_links();
CREATE FUNCTION public.list_school_indication_links()
RETURNS TABLE(
  link_id uuid, school_id uuid, school_nome text, qtd_cursos int,
  token text, keyword text, is_active boolean, expires_at timestamptz, created_at timestamptz,
  qtd_indicacoes int, qtd_turmas int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM profiles WHERE id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    el.id AS link_id,
    s.id AS school_id,
    s.nome AS school_nome,
    (SELECT count(*)::int FROM course_schools cs JOIN courses c ON c.id=cs.course_id WHERE cs.school_id=s.id AND c.status='ativo') AS qtd_cursos,
    el.token,
    NULL::text AS keyword,
    el.is_active,
    el.expires_at,
    el.created_at,
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_indicacoes,
    (SELECT count(*)::int FROM hr_indication_classes hc WHERE hc.external_link_id = el.id) AS qtd_turmas
  FROM external_links el
  JOIN schools s ON s.id = el.school_id
  WHERE el.organization_id = v_org AND el.content_type = 'hr_school_indication'
  ORDER BY s.nome;
END;
$$;
