
DO $$ BEGIN
  CREATE TYPE public.hr_indication_status AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA', 'CONVERTIDA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.hr_school_indications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  external_link_id UUID REFERENCES public.external_links(id) ON DELETE SET NULL,
  indicado_por_nome TEXT NOT NULL,
  indicado_por_cargo TEXT,
  indicado_por_email TEXT,
  origem TEXT NOT NULL DEFAULT 'NOVO' CHECK (origem IN ('PROFESSOR_EXISTENTE', 'TALENTO', 'NOVO')),
  professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  talent_pool_candidate_id UUID,
  candidato_nome TEXT NOT NULL,
  candidato_email TEXT,
  candidato_telefone TEXT,
  candidato_disciplinas TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  periodo public.hr_period,
  observacoes TEXT,
  status public.hr_indication_status NOT NULL DEFAULT 'PENDENTE',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  motivo_recusa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_indications_org_status ON public.hr_school_indications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_indications_school ON public.hr_school_indications(school_id);

ALTER TABLE public.hr_school_indications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR managers can view indications" ON public.hr_school_indications;
CREATE POLICY "HR managers can view indications"
ON public.hr_school_indications FOR SELECT
USING (public.is_hr_manager(organization_id));

DROP POLICY IF EXISTS "HR managers can update indications" ON public.hr_school_indications;
CREATE POLICY "HR managers can update indications"
ON public.hr_school_indications FOR UPDATE
USING (public.is_hr_manager(organization_id));

DROP POLICY IF EXISTS "HR admins can delete indications" ON public.hr_school_indications;
CREATE POLICY "HR admins can delete indications"
ON public.hr_school_indications FOR DELETE
USING (public.is_hr_admin(organization_id));

DROP TRIGGER IF EXISTS trg_hr_indications_updated_at ON public.hr_school_indications;
CREATE TRIGGER trg_hr_indications_updated_at
BEFORE UPDATE ON public.hr_school_indications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
    course_id, periodo, observacoes
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
    NULLIF(p_payload->>'observacoes', '')
  ) RETURNING id INTO v_indication_id;

  RETURN jsonb_build_object('success', true, 'id', v_indication_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_school_indication(TEXT, TEXT, JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_indication_link_info(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_school_nome TEXT;
BEGIN
  SELECT id, organization_id, school_id, content_type, is_active, expires_at, starts_at, scope_json
    INTO v_link
  FROM public.external_links
  WHERE token = p_token;

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
    'requires_keyword', COALESCE((v_link.scope_json->>'requires_keyword')::boolean, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_indication_link_info(TEXT) TO anon, authenticated;
