
-- 1) Campo formação no candidato indicado
ALTER TABLE public.hr_school_indications
  ADD COLUMN IF NOT EXISTS candidato_formacao text;

-- 2) Configuração da regra fixa de carga horária
ALTER TABLE public.hr_settings
  ADD COLUMN IF NOT EXISTS regra_horas_pem int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS regra_horas_uci int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS regra_horas_ucii int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS regra_horas_uciii int NOT NULL DEFAULT 2;

-- 3) Tabela de rascunho do portal externo
CREATE TABLE IF NOT EXISTS public.hr_indication_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_link_id uuid NOT NULL REFERENCES public.external_links(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  diretor_nome text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_link_id)
);

ALTER TABLE public.hr_indication_drafts ENABLE ROW LEVEL SECURITY;

-- Sem políticas SELECT/INSERT diretas: acesso só via RPC SECURITY DEFINER abaixo,
-- exceto para admin/coordenador/rh da organização para fins de inspeção.
DROP POLICY IF EXISTS "drafts_view_org_managers" ON public.hr_indication_drafts;
CREATE POLICY "drafts_view_org_managers"
  ON public.hr_indication_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.organization_id = hr_indication_drafts.organization_id
         AND ur.role IN ('admin','coordenador','rh')
    )
  );

-- 4) save_indication_draft (upsert via token + keyword)
CREATE OR REPLACE FUNCTION public.save_indication_draft(
  p_token text,
  p_keyword text,
  p_payload jsonb,
  p_diretor_nome text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_link RECORD;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link inválido';
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Link expirado';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  INSERT INTO public.hr_indication_drafts (
    external_link_id, organization_id, payload, diretor_nome, updated_at
  ) VALUES (
    v_link.id, v_link.organization_id, coalesce(p_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_diretor_nome, '')), ''), now()
  )
  ON CONFLICT (external_link_id) DO UPDATE
    SET payload = EXCLUDED.payload,
        diretor_nome = COALESCE(EXCLUDED.diretor_nome, hr_indication_drafts.diretor_nome),
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'updated_at', now());
END;
$$;

-- 5) load_indication_draft
CREATE OR REPLACE FUNCTION public.load_indication_draft(
  p_token text,
  p_keyword text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_link RECORD; v_draft RECORD;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Link inválido');
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Link expirado');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('error', 'Palavra-chave inválida ou expirada');
  END IF;

  SELECT * INTO v_draft
    FROM public.hr_indication_drafts
   WHERE external_link_id = v_link.id;

  IF v_draft IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'payload', v_draft.payload,
    'diretor_nome', v_draft.diretor_nome,
    'updated_at', v_draft.updated_at
  );
END;
$$;

-- 6) get_school_indication_link_info — incluir regra fixa
CREATE OR REPLACE FUNCTION public.get_school_indication_link_info(
  p_token text,
  p_keyword text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link RECORD; v_school RECORD; v_courses jsonb;
  v_teto int; v_pem int; v_uci int; v_ucii int; v_uciii int;
BEGIN
  SELECT * INTO v_link FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Link inválido ou expirado');
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Link expirado');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('error', 'Palavra-chave inválida ou expirada');
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
    FROM course_schools cs
    JOIN courses c ON c.id = cs.course_id
   WHERE cs.school_id = v_link.school_id
     AND c.organization_id = v_link.organization_id
     AND c.status = 'ativo';

  SELECT coalesce(teto_ch_semanal, 24),
         coalesce(regra_horas_pem, 2),
         coalesce(regra_horas_uci, 4),
         coalesce(regra_horas_ucii, 2),
         coalesce(regra_horas_uciii, 2)
    INTO v_teto, v_pem, v_uci, v_ucii, v_uciii
    FROM hr_settings WHERE organization_id = v_link.organization_id LIMIT 1;
  IF v_teto IS NULL THEN
    v_teto := 24; v_pem := 2; v_uci := 4; v_ucii := 2; v_uciii := 2;
  END IF;

  RETURN jsonb_build_object(
    'link_id', v_link.id,
    'organization_id', v_link.organization_id,
    'school', to_jsonb(v_school),
    'courses', v_courses,
    'teto_ch_professor', v_teto,
    'regra_fixa', jsonb_build_object(
      'pem', v_pem, 'uci', v_uci, 'ucii', v_ucii, 'uciii', v_uciii,
      'total_por_turma', v_pem + v_uci + v_ucii + v_uciii
    )
  );
END;
$$;

-- 7) submit_school_indication_full — incluir formação
CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token text,
  p_keyword text,
  p_course_id uuid,
  p_classes jsonb,
  p_indications jsonb,
  p_indicado_por_nome text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link RECORD;
  v_org uuid;
  v_school uuid;
  v_class jsonb;
  v_class_id uuid;
  v_class_ids uuid[] := ARRAY[]::uuid[];
  v_ind jsonb;
  v_count int := 0;
  v_indicado text;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link inválido';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  v_indicado := nullif(trim(coalesce(p_indicado_por_nome, '')), '');
  IF v_indicado IS NULL THEN
    v_indicado := 'Diretor da escola';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM course_schools
     WHERE school_id = v_school AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;

  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      coalesce(v_class->>'nome', ''),
      coalesce(v_class->>'turno', 'manha'),
      coalesce((v_class->>'qtd')::int, 3)
    )
    RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || v_class_id;
  END LOOP;

  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    IF nullif(trim(coalesce(v_ind->>'telefone', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Telefone obrigatório para todos os professores indicados';
    END IF;
    IF nullif(trim(coalesce(v_ind->>'nome', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Nome obrigatório para todos os professores indicados';
    END IF;

    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidato_nome, candidato_telefone, candidato_email,
      candidato_formacao,
      indicado_por_nome,
      origem,
      status,
      candidato_disciplinas
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      trim(v_ind->>'nome'),
      trim(v_ind->>'telefone'),
      nullif(trim(coalesce(v_ind->>'email', '')), ''),
      nullif(trim(coalesce(v_ind->>'formacao', '')), ''),
      v_indicado,
      'PORTAL_ESCOLA',
      'PENDENTE'::hr_indication_status,
      nullif(trim(coalesce(v_ind->>'funcao', '')), '')  -- ex: PEM/UCI/UCII/UCIII
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'classes', coalesce(array_length(v_class_ids, 1), 0),
    'indications', v_count
  );
END;
$$;
