
-- 1. Estender enum de status
DO $$ BEGIN
  ALTER TYPE public.hr_indication_status ADD VALUE IF NOT EXISTS 'EM_ANALISE';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER TYPE public.hr_indication_status ADD VALUE IF NOT EXISTS 'ALOCADA';
EXCEPTION WHEN others THEN null; END $$;

-- 2. Novas colunas em hr_school_indications
ALTER TABLE public.hr_school_indications
  ADD COLUMN IF NOT EXISTS qtd_turmas INT,
  ADD COLUMN IF NOT EXISTS class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weekly_teaching_model_id UUID REFERENCES public.weekly_teaching_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allocated_by UUID;

CREATE INDEX IF NOT EXISTS idx_hr_indications_course ON public.hr_school_indications(course_id);
CREATE INDEX IF NOT EXISTS idx_hr_indications_wtm ON public.hr_school_indications(weekly_teaching_model_id);

-- 3. RPC: contexto da escola para portal externo (cursos + disciplinas)
CREATE OR REPLACE FUNCTION public.get_indication_school_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_courses JSONB;
  v_subjects JSONB;
BEGIN
  SELECT id, organization_id, school_id, content_type, is_active, expires_at, starts_at
    INTO v_link
  FROM public.external_links
  WHERE token = p_token;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado');
  END IF;
  IF v_link.is_active IS NOT TRUE
     OR v_link.starts_at > now()
     OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < now())
     OR v_link.content_type <> 'RH_INDICACOES' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido ou expirado');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) ORDER BY c.nome), '[]'::jsonb)
    INTO v_courses
  FROM public.courses c
  JOIN public.course_schools cs ON cs.course_id = c.id
  WHERE cs.school_id = v_link.school_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'nome', s.nome, 'course_id', s.course_id,
    'carga_horaria_semanal', s.carga_horaria_semanal
  ) ORDER BY s.nome), '[]'::jsonb)
    INTO v_subjects
  FROM public.subjects s
  WHERE s.course_id IN (
    SELECT cs.course_id FROM public.course_schools cs WHERE cs.school_id = v_link.school_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'school_id', v_link.school_id,
    'courses', v_courses,
    'subjects', v_subjects
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_indication_school_context(TEXT) TO anon, authenticated;

-- 4. Atualizar submit_school_indication para aceitar qtd_turmas
CREATE OR REPLACE FUNCTION public.submit_school_indication(
  p_token TEXT,
  p_keyword TEXT,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_keyword_required BOOLEAN := false;
  v_indication_id UUID;
BEGIN
  SELECT id, organization_id, school_id, content_type, is_active, expires_at, starts_at, scope_json
    INTO v_link
  FROM public.external_links
  WHERE token = p_token;

  IF v_link.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado'); END IF;
  IF v_link.is_active IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'Link inativo'); END IF;
  IF v_link.starts_at > now() THEN RETURN jsonb_build_object('success', false, 'error', 'Link ainda não está disponível'); END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link expirado');
  END IF;
  IF v_link.content_type <> 'RH_INDICACOES' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link não é de indicações');
  END IF;

  v_keyword_required := COALESCE((v_link.scope_json->>'requires_keyword')::boolean, false);
  IF v_keyword_required THEN
    IF NOT EXISTS(
      SELECT 1 FROM public.external_link_keywords k
      WHERE k.external_link_id = v_link.id AND k.keyword = p_keyword
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Palavra-chave inválida');
    END IF;
  END IF;

  IF COALESCE(p_payload->>'indicado_por_nome', '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe seu nome');
  END IF;
  IF COALESCE(p_payload->>'candidato_nome', '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe o nome do candidato');
  END IF;

  INSERT INTO public.hr_school_indications (
    organization_id, school_id, external_link_id,
    indicado_por_nome, indicado_por_cargo, indicado_por_email,
    origem, professor_id, talent_pool_candidate_id,
    candidato_nome, candidato_email, candidato_telefone, candidato_disciplinas,
    course_id, periodo, qtd_turmas, observacoes
  ) VALUES (
    v_link.organization_id, v_link.school_id, v_link.id,
    p_payload->>'indicado_por_nome',
    NULLIF(p_payload->>'indicado_por_cargo', ''),
    NULLIF(p_payload->>'indicado_por_email', ''),
    COALESCE(p_payload->>'origem', 'NOVO'),
    NULLIF(p_payload->>'professor_id', '')::uuid,
    NULLIF(p_payload->>'talent_pool_candidate_id', '')::uuid,
    p_payload->>'candidato_nome',
    NULLIF(p_payload->>'candidato_email', ''),
    NULLIF(p_payload->>'candidato_telefone', ''),
    NULLIF(p_payload->>'candidato_disciplinas', ''),
    NULLIF(p_payload->>'course_id', '')::uuid,
    NULLIF(p_payload->>'periodo', '')::public.hr_period,
    NULLIF(p_payload->>'qtd_turmas', '')::int,
    NULLIF(p_payload->>'observacoes', '')
  ) RETURNING id INTO v_indication_id;

  RETURN jsonb_build_object('success', true, 'id', v_indication_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_school_indication(TEXT, TEXT, JSONB) TO anon, authenticated;

-- 5. RPC: atribuir indicação a uma vaga (slot weekly_teaching_models)
CREATE OR REPLACE FUNCTION public.assign_indication_to_vaga(
  p_indication_id UUID,
  p_weekly_teaching_model_id UUID,
  p_professor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ind RECORD;
  v_wtm RECORD;
BEGIN
  SELECT * INTO v_ind FROM public.hr_school_indications WHERE id = p_indication_id;
  IF v_ind.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  IF NOT public.is_hr_manager(v_ind.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  SELECT * INTO v_wtm FROM public.weekly_teaching_models WHERE id = p_weekly_teaching_model_id;
  IF v_wtm.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vaga não encontrada');
  END IF;

  -- Atualiza o slot com o professor
  UPDATE public.weekly_teaching_models
    SET professor_id = p_professor_id,
        updated_at = now()
    WHERE id = p_weekly_teaching_model_id;

  -- Marca a indicação como ALOCADA
  UPDATE public.hr_school_indications
    SET status = 'ALOCADA',
        weekly_teaching_model_id = p_weekly_teaching_model_id,
        class_group_id = v_wtm.class_group_id,
        professor_id = p_professor_id,
        allocated_at = now(),
        allocated_by = auth.uid()
    WHERE id = p_indication_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_indication_to_vaga(UUID, UUID, UUID) TO authenticated;
