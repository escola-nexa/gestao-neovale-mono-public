
-- =========================================================
-- PARTE 4 — Tabelas complementares Substituição
-- =========================================================

-- 1) teacher_substitution_documents -----------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID NOT NULL
    REFERENCES public.teacher_substitution_requests(id) ON DELETE CASCADE,

  document_type   TEXT NOT NULL,
  document_status TEXT NOT NULL DEFAULT 'uploaded',

  file_url        TEXT,
  storage_path    TEXT,
  file_name       TEXT,
  mime_type       TEXT,
  file_size_bytes BIGINT,

  generated_by UUID REFERENCES public.profiles(id),
  uploaded_by  UUID REFERENCES public.profiles(id),
  signed_by    UUID REFERENCES public.profiles(id),
  signed_at    TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tsd_type CHECK (document_type IN (
    'declaration','receipt','signed_report','supporting_document','payment_proof','other'
  )),
  CONSTRAINT chk_tsd_status CHECK (document_status IN (
    'draft','generated','uploaded','signed','approved','rejected','cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tsd_request ON public.teacher_substitution_documents(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_tsd_org     ON public.teacher_substitution_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_tsd_type    ON public.teacher_substitution_documents(document_type);

-- 2) teacher_substitution_payments ------------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID NOT NULL
    REFERENCES public.teacher_substitution_requests(id) ON DELETE CASCADE,
  substitute_professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,

  payee_name TEXT NOT NULL,
  payee_cpf  TEXT,

  payment_method TEXT,
  bank_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  total_class_hours NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_class_hours >= 0),
  hour_class_value  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (hour_class_value  >= 0),
  gross_amount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gross_amount      >= 0),
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount   >= 0),
  net_amount        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (net_amount        >= 0),

  payment_status TEXT NOT NULL DEFAULT 'pending_calculation',

  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  paid_by     UUID REFERENCES public.profiles(id),
  paid_at     TIMESTAMPTZ,

  payment_reference TEXT,
  payment_proof_document_id UUID REFERENCES public.teacher_substitution_documents(id) ON DELETE SET NULL,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tsp_status CHECK (payment_status IN (
    'not_applicable','pending_calculation','calculated','pending_documentation',
    'pending_rh_validation','approved_for_payment','payment_scheduled','paid',
    'returned_for_correction','cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tsp_request ON public.teacher_substitution_payments(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_tsp_org     ON public.teacher_substitution_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_tsp_status  ON public.teacher_substitution_payments(payment_status);

-- 3) teacher_substitution_status_history -------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID NOT NULL
    REFERENCES public.teacher_substitution_requests(id) ON DELETE CASCADE,

  old_status TEXT,
  new_status TEXT NOT NULL,
  old_payment_status TEXT,
  new_payment_status TEXT,

  changed_by UUID REFERENCES public.profiles(id),
  changed_by_role TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsh_request ON public.teacher_substitution_status_history(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_tsh_org     ON public.teacher_substitution_status_history(organization_id);

-- 4) teacher_substitution_settings -------------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  enabled BOOLEAN NOT NULL DEFAULT true,
  default_hour_class_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (default_hour_class_value >= 0),

  require_ticket_creation BOOLEAN NOT NULL DEFAULT true,
  require_channel_notification BOOLEAN NOT NULL DEFAULT true,
  require_signed_report_for_payment BOOLEAN NOT NULL DEFAULT true,
  require_receipt_for_payment BOOLEAN NOT NULL DEFAULT true,
  allow_professor_upload_report BOOLEAN NOT NULL DEFAULT true,
  allow_external_substitute BOOLEAN NOT NULL DEFAULT true,
  payment_approval_required BOOLEAN NOT NULL DEFAULT true,
  substitution_channel_name TEXT NOT NULL DEFAULT 'substituicao',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) teacher_substitution_audit_logs -----------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID REFERENCES public.teacher_substitution_requests(id) ON DELETE SET NULL,

  actor_user_id UUID REFERENCES public.profiles(id),
  actor_role TEXT,

  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tsa_action CHECK (action IN (
    'substitution_created','ticket_created','channel_notified',
    'candidate_suggested','substitute_confirmed','execution_confirmed',
    'declaration_generated','receipt_generated','document_uploaded',
    'signed_report_uploaded','payment_calculated','payment_approved',
    'payment_completed','status_changed','substitution_cancelled',
    'substitution_reopened','settings_changed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tsa_request ON public.teacher_substitution_audit_logs(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_tsa_org     ON public.teacher_substitution_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_tsa_action  ON public.teacher_substitution_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tsa_created ON public.teacher_substitution_audit_logs(created_at DESC);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- updated_at triggers (function já existe: tg_teacher_substitution_updated_at)
DROP TRIGGER IF EXISTS trg_tsd_updated ON public.teacher_substitution_documents;
CREATE TRIGGER trg_tsd_updated BEFORE UPDATE ON public.teacher_substitution_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

DROP TRIGGER IF EXISTS trg_tsp_updated ON public.teacher_substitution_payments;
CREATE TRIGGER trg_tsp_updated BEFORE UPDATE ON public.teacher_substitution_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

DROP TRIGGER IF EXISTS trg_tss_updated ON public.teacher_substitution_settings;
CREATE TRIGGER trg_tss_updated BEFORE UPDATE ON public.teacher_substitution_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

-- Cálculo automático do pagamento (gross = h * v; net = gross - discount)
CREATE OR REPLACE FUNCTION public.tg_teacher_substitution_payment_calculate_total()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.gross_amount := COALESCE(NEW.total_class_hours,0) * COALESCE(NEW.hour_class_value,0);
  NEW.net_amount   := GREATEST(0, NEW.gross_amount - COALESCE(NEW.discount_amount,0));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_tsp_calc ON public.teacher_substitution_payments;
CREATE TRIGGER trg_tsp_calc BEFORE INSERT OR UPDATE ON public.teacher_substitution_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_payment_calculate_total();

-- Histórico automático de status do request (operacional + financeiro)
CREATE OR REPLACE FUNCTION public.tg_teacher_substitution_status_history()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.teacher_substitution_status_history(
      organization_id, substitution_request_id,
      old_status, new_status,
      old_payment_status, new_payment_status,
      changed_by
    ) VALUES (
      NEW.organization_id, NEW.id,
      NULL, NEW.status,
      NULL, NEW.payment_status,
      NEW.requested_by
    );
  ELSIF TG_OP = 'UPDATE' AND (
        NEW.status         IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
  ) THEN
    INSERT INTO public.teacher_substitution_status_history(
      organization_id, substitution_request_id,
      old_status, new_status,
      old_payment_status, new_payment_status,
      changed_by
    ) VALUES (
      NEW.organization_id, NEW.id,
      OLD.status, NEW.status,
      OLD.payment_status, NEW.payment_status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_tsr_status_history_ins ON public.teacher_substitution_requests;
CREATE TRIGGER trg_tsr_status_history_ins AFTER INSERT ON public.teacher_substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_status_history();

DROP TRIGGER IF EXISTS trg_tsr_status_history_upd ON public.teacher_substitution_requests;
CREATE TRIGGER trg_tsr_status_history_upd AFTER UPDATE ON public.teacher_substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_status_history();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.teacher_substitution_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_audit_logs     ENABLE ROW LEVEL SECURITY;

-- Helper: usuário pode ver a substituição (substituído ou substituto)
CREATE OR REPLACE FUNCTION public.user_can_view_substitution(_req_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_substitution_requests r
    WHERE r.id = _req_id
      AND r.organization_id = public.get_user_organization_id(auth.uid())
      AND (
        public.has_role(auth.uid(),'admin')
        OR public.has_role(auth.uid(),'coordenador')
        OR public.has_role(auth.uid(),'rh')
        OR r.substituted_professor_id = public.get_professor_id_for_user(auth.uid())
        OR r.substitute_professor_id  = public.get_professor_id_for_user(auth.uid())
      )
  );
$$;

-- ----- documents -----
DROP POLICY IF EXISTS tsd_select ON public.teacher_substitution_documents;
CREATE POLICY tsd_select ON public.teacher_substitution_documents
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_can_view_substitution(substitution_request_id)
);
DROP POLICY IF EXISTS tsd_insert ON public.teacher_substitution_documents;
CREATE POLICY tsd_insert ON public.teacher_substitution_documents
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh')
    OR EXISTS (
      SELECT 1 FROM public.teacher_substitution_requests r
      WHERE r.id = substitution_request_id
        AND r.substitute_professor_id = public.get_professor_id_for_user(auth.uid())
    )
  )
);
DROP POLICY IF EXISTS tsd_update ON public.teacher_substitution_documents;
CREATE POLICY tsd_update ON public.teacher_substitution_documents
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);
DROP POLICY IF EXISTS tsd_delete ON public.teacher_substitution_documents;
CREATE POLICY tsd_delete ON public.teacher_substitution_documents
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh') OR uploaded_by = auth.uid())
);

-- ----- payments -----
DROP POLICY IF EXISTS tsp_select ON public.teacher_substitution_payments;
CREATE POLICY tsp_select ON public.teacher_substitution_payments
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh')
    OR substitute_professor_id = public.get_professor_id_for_user(auth.uid())
  )
);
DROP POLICY IF EXISTS tsp_insert ON public.teacher_substitution_payments;
CREATE POLICY tsp_insert ON public.teacher_substitution_payments
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);
DROP POLICY IF EXISTS tsp_update ON public.teacher_substitution_payments;
CREATE POLICY tsp_update ON public.teacher_substitution_payments
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);
DROP POLICY IF EXISTS tsp_delete ON public.teacher_substitution_payments;
CREATE POLICY tsp_delete ON public.teacher_substitution_payments
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);

-- ----- status history (read-only) -----
DROP POLICY IF EXISTS tsh_select ON public.teacher_substitution_status_history;
CREATE POLICY tsh_select ON public.teacher_substitution_status_history
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.user_can_view_substitution(substitution_request_id)
);
-- Sem políticas de INSERT/UPDATE/DELETE: gravação só via SECURITY DEFINER triggers.

-- ----- settings (leitura por toda a org; somente admin altera) -----
DROP POLICY IF EXISTS tss_select ON public.teacher_substitution_settings;
CREATE POLICY tss_select ON public.teacher_substitution_settings
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
);
DROP POLICY IF EXISTS tss_insert ON public.teacher_substitution_settings;
CREATE POLICY tss_insert ON public.teacher_substitution_settings
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);
DROP POLICY IF EXISTS tss_update ON public.teacher_substitution_settings;
CREATE POLICY tss_update ON public.teacher_substitution_settings
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);

-- ----- audit logs (imutável) -----
DROP POLICY IF EXISTS tsa_select ON public.teacher_substitution_audit_logs;
CREATE POLICY tsa_select ON public.teacher_substitution_audit_logs
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);
DROP POLICY IF EXISTS tsa_insert ON public.teacher_substitution_audit_logs;
CREATE POLICY tsa_insert ON public.teacher_substitution_audit_logs
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);
-- Sem UPDATE/DELETE — auditoria é imutável.

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-substitutions', 'teacher-substitutions', false)
ON CONFLICT (id) DO NOTHING;

-- Estrutura de pasta: org/{organization_id}/substitution/{request_id}/{tipo}/arquivo
-- foldername(name)[1] = 'org', [2] = organization_id

DROP POLICY IF EXISTS ts_storage_select ON storage.objects;
CREATE POLICY ts_storage_select ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[2]::uuid = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR EXISTS (
      SELECT 1 FROM public.teacher_substitution_requests r
      WHERE r.id::text = (storage.foldername(name))[4]
        AND (
          r.substituted_professor_id = public.get_professor_id_for_user(auth.uid())
          OR r.substitute_professor_id = public.get_professor_id_for_user(auth.uid())
        )
    )
  )
);

DROP POLICY IF EXISTS ts_storage_insert ON storage.objects;
CREATE POLICY ts_storage_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[2]::uuid = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR EXISTS (
      SELECT 1 FROM public.teacher_substitution_requests r
      WHERE r.id::text = (storage.foldername(name))[4]
        AND r.substitute_professor_id = public.get_professor_id_for_user(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS ts_storage_update ON storage.objects;
CREATE POLICY ts_storage_update ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[2]::uuid = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS ts_storage_delete ON storage.objects;
CREATE POLICY ts_storage_delete ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[2]::uuid = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);
