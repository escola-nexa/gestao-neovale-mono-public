
-- =========================================================================
-- MÓDULO APTOS PARA CONTRATAÇÃO
-- =========================================================================

-- 1) ENUMS
DO $$ BEGIN
  CREATE TYPE public.hr_hiring_status AS ENUM (
    'PENDENTE_DOC',
    'AGUARDANDO_ASSINATURA',
    'ASSINADO',
    'CONCLUIDO',
    'CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_hiring_doc_kind AS ENUM ('CONTRATO','TERMO','ADITIVO','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_hiring_doc_version_kind AS ENUM ('ORIGINAL','ASSINADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_hiring_audit_event AS ENUM (
    'SENT_TO_HIRING',
    'CANCELLED',
    'DOC_ADDED',
    'DOC_REMOVED',
    'SIGNED_DOC_RECEIVED',
    'EXTERNAL_LINK_CREATED',
    'EXTERNAL_LINK_REVOKED',
    'EXTERNAL_VIEW',
    'EXTERNAL_DOWNLOAD',
    'STATUS_CHANGED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) TABELA hr_hiring_candidates
CREATE TABLE IF NOT EXISTS public.hr_hiring_candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id    uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  status          public.hr_hiring_status NOT NULL DEFAULT 'PENDENTE_DOC',
  sent_by         uuid REFERENCES auth.users(id),
  sent_at         timestamptz NOT NULL DEFAULT now(),
  cancelled_at    timestamptz,
  cancel_reason   text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_candidates_org ON public.hr_hiring_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_candidates_prof ON public.hr_hiring_candidates(professor_id);
-- 1 ativo por (org, professor)
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_hiring_candidates_active
  ON public.hr_hiring_candidates(organization_id, professor_id)
  WHERE status NOT IN ('CANCELADO','CONCLUIDO');

DROP TRIGGER IF EXISTS trg_hr_hiring_candidates_updated_at ON public.hr_hiring_candidates;
CREATE TRIGGER trg_hr_hiring_candidates_updated_at
BEFORE UPDATE ON public.hr_hiring_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.hr_hiring_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coord manage hiring candidates" ON public.hr_hiring_candidates;
CREATE POLICY "Coord manage hiring candidates"
  ON public.hr_hiring_candidates FOR ALL TO authenticated
  USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

-- 3) TABELA hr_hiring_documents (versionada)
CREATE TABLE IF NOT EXISTS public.hr_hiring_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id        uuid NOT NULL REFERENCES public.hr_hiring_candidates(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id        uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  doc_kind            public.hr_hiring_doc_kind NOT NULL DEFAULT 'CONTRATO',
  title               text NOT NULL,
  version             smallint NOT NULL DEFAULT 1,
  kind                public.hr_hiring_doc_version_kind NOT NULL DEFAULT 'ORIGINAL',
  parent_document_id  uuid REFERENCES public.hr_hiring_documents(id) ON DELETE SET NULL,
  file_path           text NOT NULL,
  file_name           text NOT NULL,
  file_size           bigint,
  mime_type           text,
  uploaded_by         uuid REFERENCES auth.users(id),
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  external_link_id    uuid REFERENCES public.external_links(id) ON DELETE SET NULL,
  external_ip         text,
  external_geo        text,
  deleted_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_docs_candidate ON public.hr_hiring_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_docs_prof ON public.hr_hiring_documents(professor_id);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_docs_parent ON public.hr_hiring_documents(parent_document_id);

ALTER TABLE public.hr_hiring_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coord manage hiring documents" ON public.hr_hiring_documents;
CREATE POLICY "Coord manage hiring documents"
  ON public.hr_hiring_documents FOR ALL TO authenticated
  USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

-- 4) TABELA hr_hiring_audit_logs
CREATE TABLE IF NOT EXISTS public.hr_hiring_audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  candidate_id    uuid REFERENCES public.hr_hiring_candidates(id) ON DELETE SET NULL,
  professor_id    uuid REFERENCES public.professors(id) ON DELETE SET NULL,
  actor_user_id   uuid REFERENCES auth.users(id),
  actor_label     text,
  event           public.hr_hiring_audit_event NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_audit_org ON public.hr_hiring_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_hiring_audit_candidate ON public.hr_hiring_audit_logs(candidate_id);

ALTER TABLE public.hr_hiring_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coord view hiring audit" ON public.hr_hiring_audit_logs;
CREATE POLICY "Coord view hiring audit"
  ON public.hr_hiring_audit_logs FOR SELECT TO authenticated
  USING (public.is_coordinator(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Coord insert hiring audit" ON public.hr_hiring_audit_logs;
CREATE POLICY "Coord insert hiring audit"
  ON public.hr_hiring_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));
-- inserts da edge function ocorrem com service_role (bypass de RLS)

-- 5) Estende external_links.content_type
ALTER TABLE public.external_links DROP CONSTRAINT IF EXISTS external_links_content_type_check;
ALTER TABLE public.external_links ADD CONSTRAINT external_links_content_type_check
  CHECK (content_type = ANY (ARRAY[
    'planejamentos','notas','faltas','documentos_professor','hr_school_indication','professor_contratacao'
  ]));

-- 6) BUCKET privado para PDFs de contratação
INSERT INTO storage.buckets (id, name, public)
VALUES ('hiring-documents','hiring-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS sobre storage.objects para o bucket
DROP POLICY IF EXISTS "Hiring docs: coord read" ON storage.objects;
CREATE POLICY "Hiring docs: coord read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hiring-documents'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.is_coordinator(auth.uid(), o.id)
    )
  );
DROP POLICY IF EXISTS "Hiring docs: coord write" ON storage.objects;
CREATE POLICY "Hiring docs: coord write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hiring-documents'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.is_coordinator(auth.uid(), o.id)
    )
  );
DROP POLICY IF EXISTS "Hiring docs: coord update" ON storage.objects;
CREATE POLICY "Hiring docs: coord update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hiring-documents'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.is_coordinator(auth.uid(), o.id)
    )
  );
DROP POLICY IF EXISTS "Hiring docs: coord delete" ON storage.objects;
CREATE POLICY "Hiring docs: coord delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hiring-documents'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND public.is_coordinator(auth.uid(), o.id)
    )
  );

-- 7) RPC: enviar professores para contratação
CREATE OR REPLACE FUNCTION public.send_professors_to_hiring(
  _professor_ids uuid[],
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_created int := 0;
  v_skipped int := 0;
  v_prof_id uuid;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _professor_ids IS NULL OR array_length(_professor_ids,1) IS NULL THEN
    RETURN jsonb_build_object('created',0,'skipped',0);
  END IF;

  -- Determina a organização a partir do primeiro professor válido (assume mesmo tenant)
  FOREACH v_prof_id IN ARRAY _professor_ids LOOP
    SELECT organization_id INTO v_org FROM public.professors
      WHERE id = v_prof_id AND deleted_at IS NULL;
    IF v_org IS NOT NULL THEN EXIT; END IF;
  END LOOP;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Nenhum professor válido encontrado'; END IF;
  IF NOT public.is_coordinator(v_uid, v_org) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  FOREACH v_prof_id IN ARRAY _professor_ids LOOP
    -- já tem candidato ativo?
    IF EXISTS (
      SELECT 1 FROM public.hr_hiring_candidates
      WHERE organization_id = v_org
        AND professor_id = v_prof_id
        AND status NOT IN ('CANCELADO','CONCLUIDO')
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.professors
      WHERE id = v_prof_id AND organization_id = v_org AND deleted_at IS NULL
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    INSERT INTO public.hr_hiring_candidates(organization_id, professor_id, sent_by, notes)
      VALUES (v_org, v_prof_id, v_uid, _notes)
      RETURNING id INTO v_new_id;
    INSERT INTO public.hr_hiring_audit_logs(organization_id, candidate_id, professor_id, actor_user_id, event, payload)
      VALUES (v_org, v_new_id, v_prof_id, v_uid, 'SENT_TO_HIRING', jsonb_build_object('notes', _notes));
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped);
END $$;

-- 8) RPC: cancelar candidato
CREATE OR REPLACE FUNCTION public.cancel_hiring_candidate(
  _candidate_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid; v_prof uuid; v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT organization_id, professor_id, status::text
    INTO v_org, v_prof, v_old
  FROM public.hr_hiring_candidates WHERE id = _candidate_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Candidato não encontrado'; END IF;
  IF NOT public.is_coordinator(v_uid, v_org) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  UPDATE public.hr_hiring_candidates
     SET status='CANCELADO', cancelled_at = now(), cancel_reason = _reason
   WHERE id = _candidate_id;

  INSERT INTO public.hr_hiring_audit_logs(organization_id, candidate_id, professor_id, actor_user_id, event, payload)
    VALUES (v_org, _candidate_id, v_prof, v_uid, 'CANCELLED',
            jsonb_build_object('reason', _reason, 'previous_status', v_old));
END $$;

-- 9) RPC: counts (resumo) - usada pela lista p/ KPIs / botão verde/amarelo
CREATE OR REPLACE FUNCTION public.get_hiring_candidate_doc_counts(_organization_id uuid)
RETURNS TABLE(candidate_id uuid, originals int, signed int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,
         COUNT(d.*) FILTER (WHERE d.kind='ORIGINAL' AND d.deleted_at IS NULL)::int AS originals,
         COUNT(d.*) FILTER (WHERE d.kind='ASSINADO' AND d.deleted_at IS NULL)::int AS signed
  FROM public.hr_hiring_candidates c
  LEFT JOIN public.hr_hiring_documents d ON d.candidate_id = c.id
  WHERE c.organization_id = _organization_id
    AND public.is_coordinator(auth.uid(), c.organization_id)
  GROUP BY c.id
$$;
