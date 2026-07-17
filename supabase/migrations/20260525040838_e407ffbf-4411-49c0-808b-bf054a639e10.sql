
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.substitution_status AS ENUM (
    'OPEN','INDICATED','CONFIRMED','EXECUTED','REPORT_SUBMITTED','APPROVED','PAID','CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.substitution_payment_status AS ENUM ('PENDING','APPROVED','PAID','REJECTED','CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.substitution_doc_type AS ENUM ('REPORT','SIGNED_REPORT','RECEIPT','DECLARATION','PAYMENT_PROOF','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS public.substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  school_id UUID NOT NULL,
  course_id UUID,
  class_group_id UUID,
  subject_id UUID,
  absent_professor_id UUID NOT NULL,
  substitute_professor_id UUID,
  ticket_id UUID,
  absence_date DATE NOT NULL,
  total_class_hours NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (total_class_hours >= 0),
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  total_amount NUMERIC(12,2) GENERATED ALWAYS AS (total_class_hours * hourly_rate) STORED,
  reason TEXT,
  notes TEXT,
  status public.substitution_status NOT NULL DEFAULT 'OPEN',
  requested_by UUID NOT NULL,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  canceled_by UUID,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_req_org    ON public.substitution_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_req_school ON public.substitution_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_sub_req_absent ON public.substitution_requests(absent_professor_id);
CREATE INDEX IF NOT EXISTS idx_sub_req_sub    ON public.substitution_requests(substitute_professor_id);
CREATE INDEX IF NOT EXISTS idx_sub_req_status ON public.substitution_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_req_date   ON public.substitution_requests(absence_date);

CREATE TABLE IF NOT EXISTS public.substitution_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  substitution_id UUID NOT NULL REFERENCES public.substitution_requests(id) ON DELETE CASCADE,
  doc_type public.substitution_doc_type NOT NULL DEFAULT 'OTHER',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_docs_sub ON public.substitution_documents(substitution_id);
CREATE INDEX IF NOT EXISTS idx_sub_docs_org ON public.substitution_documents(organization_id);

CREATE TABLE IF NOT EXISTS public.substitution_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  substitution_id UUID NOT NULL REFERENCES public.substitution_requests(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT,
  scheduled_for DATE,
  paid_at TIMESTAMPTZ,
  proof_document_id UUID REFERENCES public.substitution_documents(id) ON DELETE SET NULL,
  status public.substitution_payment_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_pay_sub    ON public.substitution_payments(substitution_id);
CREATE INDEX IF NOT EXISTS idx_sub_pay_org    ON public.substitution_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_pay_status ON public.substitution_payments(status);

CREATE TABLE IF NOT EXISTS public.substitution_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  substitution_id UUID NOT NULL REFERENCES public.substitution_requests(id) ON DELETE CASCADE,
  from_status public.substitution_status,
  to_status public.substitution_status NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_hist_sub ON public.substitution_status_history(substitution_id);

CREATE TABLE IF NOT EXISTS public.substitution_settings (
  organization_id UUID PRIMARY KEY,
  default_hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  require_signed_report BOOLEAN NOT NULL DEFAULT true,
  require_rh_approval BOOLEAN NOT NULL DEFAULT true,
  auto_create_ticket BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.tg_substitution_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sub_req_updated ON public.substitution_requests;
CREATE TRIGGER trg_sub_req_updated BEFORE UPDATE ON public.substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_substitution_updated_at();

DROP TRIGGER IF EXISTS trg_sub_pay_updated ON public.substitution_payments;
CREATE TRIGGER trg_sub_pay_updated BEFORE UPDATE ON public.substitution_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_substitution_updated_at();

CREATE OR REPLACE FUNCTION public.tg_substitution_status_history()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.substitution_status_history(organization_id, substitution_id, from_status, to_status, changed_by)
    VALUES (NEW.organization_id, NEW.id, NULL, NEW.status, NEW.requested_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.substitution_status_history(organization_id, substitution_id, from_status, to_status, changed_by)
    VALUES (NEW.organization_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sub_req_hist_ins ON public.substitution_requests;
CREATE TRIGGER trg_sub_req_hist_ins AFTER INSERT ON public.substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_substitution_status_history();

DROP TRIGGER IF EXISTS trg_sub_req_hist_upd ON public.substitution_requests;
CREATE TRIGGER trg_sub_req_hist_upd AFTER UPDATE ON public.substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_substitution_status_history();

-- HELPERS
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_professor_id_for_user(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.professors WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS
ALTER TABLE public.substitution_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_settings       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sub_req_select ON public.substitution_requests;
CREATE POLICY sub_req_select ON public.substitution_requests
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR absent_professor_id     = public.get_professor_id_for_user(auth.uid())
    OR substitute_professor_id = public.get_professor_id_for_user(auth.uid())
  )
);

DROP POLICY IF EXISTS sub_req_insert ON public.substitution_requests;
CREATE POLICY sub_req_insert ON public.substitution_requests
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS sub_req_update ON public.substitution_requests;
CREATE POLICY sub_req_update ON public.substitution_requests
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS sub_req_delete ON public.substitution_requests;
CREATE POLICY sub_req_delete ON public.substitution_requests
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS sub_doc_select ON public.substitution_documents;
CREATE POLICY sub_doc_select ON public.substitution_documents
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND EXISTS (SELECT 1 FROM public.substitution_requests r WHERE r.id = substitution_id)
);

DROP POLICY IF EXISTS sub_doc_insert ON public.substitution_documents;
CREATE POLICY sub_doc_insert ON public.substitution_documents
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh')
    OR EXISTS (SELECT 1 FROM public.substitution_requests r WHERE r.id = substitution_id AND r.substitute_professor_id = public.get_professor_id_for_user(auth.uid())))
);

DROP POLICY IF EXISTS sub_doc_delete ON public.substitution_documents;
CREATE POLICY sub_doc_delete ON public.substitution_documents
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh') OR uploaded_by = auth.uid())
);

DROP POLICY IF EXISTS sub_pay_select ON public.substitution_payments;
CREATE POLICY sub_pay_select ON public.substitution_payments
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh')
    OR EXISTS (SELECT 1 FROM public.substitution_requests r WHERE r.id = substitution_id AND r.substitute_professor_id = public.get_professor_id_for_user(auth.uid()))
  )
);

DROP POLICY IF EXISTS sub_pay_insert ON public.substitution_payments;
CREATE POLICY sub_pay_insert ON public.substitution_payments
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS sub_pay_update ON public.substitution_payments;
CREATE POLICY sub_pay_update ON public.substitution_payments
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS sub_pay_delete ON public.substitution_payments;
CREATE POLICY sub_pay_delete ON public.substitution_payments
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS sub_hist_select ON public.substitution_status_history;
CREATE POLICY sub_hist_select ON public.substitution_status_history
FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS sub_hist_insert ON public.substitution_status_history;
CREATE POLICY sub_hist_insert ON public.substitution_status_history
FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS sub_set_select ON public.substitution_settings;
CREATE POLICY sub_set_select ON public.substitution_settings
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS sub_set_upsert ON public.substitution_settings;
CREATE POLICY sub_set_upsert ON public.substitution_settings
FOR ALL TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(),'admin'))
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND public.has_role(auth.uid(),'admin'));

-- STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('substitution-docs','substitution-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS sub_docs_storage_select ON storage.objects;
CREATE POLICY sub_docs_storage_select ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'substitution-docs'
  AND public.get_user_organization_id(auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS sub_docs_storage_insert ON storage.objects;
CREATE POLICY sub_docs_storage_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'substitution-docs'
  AND public.get_user_organization_id(auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS sub_docs_storage_delete ON storage.objects;
CREATE POLICY sub_docs_storage_delete ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'substitution-docs'
  AND public.get_user_organization_id(auth.uid())::text = (storage.foldername(name))[1]
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.substitution_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.substitution_payments;
