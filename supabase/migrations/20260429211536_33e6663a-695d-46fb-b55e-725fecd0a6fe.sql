CREATE TABLE IF NOT EXISTS public.hr_indication_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  external_link_id UUID REFERENCES public.external_links(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('manha','tarde','noite','integral')),
  qtd_professores_indicados INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_indication_classes_link ON public.hr_indication_classes(external_link_id);
CREATE INDEX IF NOT EXISTS idx_hr_indication_classes_school_course ON public.hr_indication_classes(school_id, course_id);

ALTER TABLE public.hr_indication_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RH/Admin manage indication classes" ON public.hr_indication_classes;
CREATE POLICY "RH/Admin manage indication classes"
ON public.hr_indication_classes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = hr_indication_classes.organization_id
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = hr_indication_classes.organization_id
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

ALTER TABLE public.hr_school_indications
  ADD COLUMN IF NOT EXISTS indication_class_id UUID REFERENCES public.hr_indication_classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_school_indications_class ON public.hr_school_indications(indication_class_id);

CREATE OR REPLACE FUNCTION public.generate_school_indication_links(
  p_school_ids UUID[],
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(school_id UUID, course_id UUID, link_id UUID, token TEXT, keyword TEXT, created BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org UUID; rec RECORD; v_token TEXT; v_keyword TEXT; v_link_id UUID; v_existing UUID;
BEGIN
  SELECT organization_id INTO v_org FROM user_roles
  WHERE user_id = auth.uid() AND role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
  LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  FOR rec IN
    SELECT sc.school_id AS sid, sc.course_id AS cid
    FROM public.school_courses sc
    JOIN public.schools s ON s.id = sc.school_id
    JOIN public.courses c ON c.id = sc.course_id
    WHERE sc.school_id = ANY(p_school_ids)
      AND s.organization_id = v_org AND c.organization_id = v_org
      AND s.status = 'ativo' AND c.status = 'ativo'
  LOOP
    SELECT id INTO v_existing FROM public.external_links
    WHERE organization_id = v_org AND school_id = rec.sid
      AND content_type = 'hr_school_indication'
      AND scope_json->>'course_id' = rec.cid::text AND is_active = true
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      school_id := rec.sid; course_id := rec.cid; link_id := v_existing;
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
        v_org, rec.sid, auth.uid(), 'hr_school_indication',
        jsonb_build_object('course_id', rec.cid, 'keyword', v_keyword),
        v_token, true, now(), p_expires_at
      ) RETURNING id INTO v_link_id;
      school_id := rec.sid; course_id := rec.cid; link_id := v_link_id;
      token := v_token; keyword := v_keyword; created := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_school_indication_link_info(p_token TEXT, p_keyword TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link RECORD; v_school RECORD; v_course RECORD; v_subjects JSONB; v_teto INT;
BEGIN
  SELECT * INTO v_link FROM public.external_links
  WHERE token = p_token AND content_type = 'hr_school_indication' AND is_active = true LIMIT 1;
  IF v_link IS NULL THEN RETURN jsonb_build_object('error','Link inválido ou expirado'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error','Link expirado');
  END IF;
  IF upper(coalesce(v_link.scope_json->>'keyword','')) <> upper(coalesce(p_keyword,'')) THEN
    RETURN jsonb_build_object('error','Palavra-chave inválida');
  END IF;

  SELECT id, nome, codigo, cidade INTO v_school FROM public.schools WHERE id = v_link.school_id;
  SELECT id, nome, codigo INTO v_course FROM public.courses WHERE id = (v_link.scope_json->>'course_id')::uuid;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'nome', s.nome, 'carga_horaria_semanal', s.carga_horaria_semanal
  ) ORDER BY s.nome), '[]'::jsonb)
  INTO v_subjects FROM public.subjects s
  WHERE s.course_id = v_course.id AND s.status = 'ativo';

  SELECT coalesce(teto_ch_semanal, 24) INTO v_teto FROM public.hr_settings WHERE organization_id = v_link.organization_id LIMIT 1;
  IF v_teto IS NULL THEN v_teto := 24; END IF;

  RETURN jsonb_build_object(
    'link_id', v_link.id, 'organization_id', v_link.organization_id,
    'school', to_jsonb(v_school), 'course', to_jsonb(v_course),
    'subjects', v_subjects, 'teto_ch_professor', v_teto
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token TEXT, p_keyword TEXT, p_classes JSONB, p_indications JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link RECORD; v_org UUID; v_school UUID; v_course UUID;
  v_class JSONB; v_class_id UUID; v_class_ids UUID[] := ARRAY[]::UUID[];
  v_ind JSONB; v_count INT := 0;
BEGIN
  SELECT * INTO v_link FROM public.external_links
  WHERE token = p_token AND content_type='hr_school_indication' AND is_active=true LIMIT 1;
  IF v_link IS NULL THEN RAISE EXCEPTION 'Link inválido'; END IF;
  IF upper(coalesce(v_link.scope_json->>'keyword','')) <> upper(coalesce(p_keyword,'')) THEN
    RAISE EXCEPTION 'Palavra-chave inválida';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  v_course := (v_link.scope_json->>'course_id')::uuid;

  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO public.hr_indication_classes(
      organization_id, school_id, course_id, external_link_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_school, v_course, v_link.id,
      coalesce(v_class->>'nome','Turma'),
      coalesce(v_class->>'turno','manha'),
      coalesce((v_class->>'qtd')::int, 3)
    ) RETURNING id INTO v_class_id;
    v_class_ids := array_append(v_class_ids, v_class_id);
  END LOOP;

  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    INSERT INTO public.hr_school_indications(
      organization_id, school_id, external_link_id, course_id,
      indication_class_id, candidato_nome, candidato_email, candidato_telefone,
      origem, status
    ) VALUES (
      v_org, v_school, v_link.id, v_course,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      v_ind->>'nome', v_ind->>'email', v_ind->>'telefone',
      'PORTAL_ESCOLA', 'PENDENTE'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'classes', coalesce(array_length(v_class_ids,1),0), 'indications', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_school_indication_links()
RETURNS TABLE(
  link_id UUID, school_id UUID, school_nome TEXT, course_id UUID, course_nome TEXT,
  token TEXT, keyword TEXT, is_active BOOLEAN, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, qtd_indicacoes BIGINT, qtd_turmas BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT el.id, el.school_id, s.nome, (el.scope_json->>'course_id')::uuid, c.nome,
    el.token, el.scope_json->>'keyword', el.is_active, el.expires_at, el.created_at,
    (SELECT count(*) FROM public.hr_school_indications i WHERE i.external_link_id = el.id),
    (SELECT count(*) FROM public.hr_indication_classes cl WHERE cl.external_link_id = el.id)
  FROM public.external_links el
  JOIN public.schools s ON s.id = el.school_id
  LEFT JOIN public.courses c ON c.id = (el.scope_json->>'course_id')::uuid
  WHERE el.content_type = 'hr_school_indication'
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = el.organization_id
        AND ur.role IN ('admin'::app_role,'coordenador'::app_role,'rh'::app_role)
    )
  ORDER BY s.nome, c.nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_indication_link_info(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_school_indication_full(TEXT, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_school_indication_links(UUID[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_school_indication_links() TO authenticated;