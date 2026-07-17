
-- =========================================================
-- PARTE 3 — Schema oficial Substituição (3 tabelas)
-- =========================================================

-- 1) teacher_substitution_requests ------------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  substitution_code TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'pending_calculation',
  documentation_status TEXT NOT NULL DEFAULT 'pending_upload',
  workflow_phase TEXT NOT NULL DEFAULT 'phase_1_demand_routing',

  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  requested_by_role TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',

  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  chat_channel_id UUID REFERENCES public.chat_channels(id) ON DELETE SET NULL,

  -- Substituído
  substituted_professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  substituted_professor_registration TEXT,
  substituted_professor_name TEXT NOT NULL,
  substituted_professor_cpf TEXT,
  substituted_professor_rg TEXT,

  -- Substituto
  substitute_professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  substitute_professor_name TEXT,
  substitute_professor_cpf TEXT,
  substitute_professor_rg TEXT,
  substitute_confirmed_by UUID REFERENCES public.profiles(id),
  substitute_confirmed_at TIMESTAMPTZ,

  -- Acadêmico + snapshots
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  school_name_snapshot TEXT,
  course_name_snapshot TEXT,
  class_group_name_snapshot TEXT,
  subject_name_snapshot TEXT,
  municipality TEXT,
  state TEXT,

  -- Ausência
  absence_reason TEXT NOT NULL,
  absence_date DATE NOT NULL,
  absence_start_at TIMESTAMPTZ,
  absence_end_at TIMESTAMPTZ,

  -- Financeiro (hora-aula cheia — total gerado)
  total_class_hours NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_class_hours >= 0),
  hour_class_value  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (hour_class_value  >= 0),
  total_amount      NUMERIC(12,2) GENERATED ALWAYS AS (total_class_hours * hour_class_value) STORED,

  payment_method TEXT,
  bank_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Diretoria/coordenação
  director_name TEXT,
  adjunct_director_name TEXT,
  coordinator_name TEXT,
  performed_by_name TEXT,

  notes TEXT,
  internal_link TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  reopened_by UUID REFERENCES public.profiles(id),
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,

  CONSTRAINT uq_tsr_org_code UNIQUE (organization_id, substitution_code),
  CONSTRAINT chk_tsr_status CHECK (status IN (
    'draft','identified_absence','request_created','ticket_created','routed_to_channel',
    'awaiting_substitute_indication','substitute_suggested','substitute_confirmed',
    'in_execution','execution_completed','report_pending','report_generated',
    'signed_report_pending','signed_report_uploaded','pending_rh_validation',
    'approved_for_payment','payment_pending','payment_completed','cancelled','reopened'
  )),
  CONSTRAINT chk_tsr_payment_status CHECK (payment_status IN (
    'not_applicable','pending_calculation','calculated','pending_documentation',
    'pending_rh_validation','approved_for_payment','payment_scheduled','paid',
    'returned_for_correction','cancelled'
  )),
  CONSTRAINT chk_tsr_doc_status CHECK (documentation_status IN (
    'not_required','pending_upload','uploaded','signed','approved','rejected','expired'
  )),
  CONSTRAINT chk_tsr_phase CHECK (workflow_phase IN (
    'phase_1_demand_routing','phase_2_execution_closure'
  ))
);

CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_org_status
  ON public.teacher_substitution_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_absence_date
  ON public.teacher_substitution_requests(absence_date);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_substituted_professor
  ON public.teacher_substitution_requests(substituted_professor_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_substitute_professor
  ON public.teacher_substitution_requests(substitute_professor_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_school
  ON public.teacher_substitution_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_requests_payment_status
  ON public.teacher_substitution_requests(payment_status);

-- 2) teacher_substitution_occurrences ----------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID NOT NULL
    REFERENCES public.teacher_substitution_requests(id) ON DELETE CASCADE,

  annual_class_occurrence_id UUID REFERENCES public.annual_class_occurrences(id) ON DELETE SET NULL,
  teacher_attendance_entry_id UUID REFERENCES public.teacher_attendance_entries(id) ON DELETE SET NULL,

  substituted_professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  substitute_professor_id  UUID REFERENCES public.professors(id) ON DELETE SET NULL,

  school_id      UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  course_id      UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  subject_id     UUID REFERENCES public.subjects(id) ON DELETE SET NULL,

  scheduled_date DATE NOT NULL,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at   TIMESTAMPTZ,

  class_hours      NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (class_hours >= 0),
  hour_class_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount           NUMERIC(12,2) GENERATED ALWAYS AS (class_hours * hour_class_value) STORED,

  execution_status TEXT NOT NULL DEFAULT 'pending',

  attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  evidence_type  TEXT,
  evidence_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tso_exec_status CHECK (execution_status IN (
    'pending','confirmed','executed','not_executed','cancelled','manual_review_required'
  ))
);

CREATE INDEX IF NOT EXISTS idx_teacher_substitution_occurrences_request
  ON public.teacher_substitution_occurrences(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_occurrences_occurrence
  ON public.teacher_substitution_occurrences(annual_class_occurrence_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_occurrences_date
  ON public.teacher_substitution_occurrences(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_occurrences_substitute
  ON public.teacher_substitution_occurrences(substitute_professor_id);

-- 3) teacher_substitution_candidates -----------------------
CREATE TABLE IF NOT EXISTS public.teacher_substitution_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  substitution_request_id UUID NOT NULL
    REFERENCES public.teacher_substitution_requests(id) ON DELETE CASCADE,

  professor_id     UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  candidate_name   TEXT NOT NULL,
  candidate_cpf    TEXT,
  candidate_rg     TEXT,
  candidate_phone  TEXT,
  candidate_email  TEXT,

  source TEXT NOT NULL DEFAULT 'manual',
  suggested_by UUID REFERENCES public.profiles(id),
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  confirmation_status TEXT NOT NULL DEFAULT 'suggested',
  confirmed_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_tsc_status CHECK (confirmation_status IN (
    'suggested','contacted','available','unavailable','confirmed','rejected','cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS idx_teacher_substitution_candidates_request
  ON public.teacher_substitution_candidates(substitution_request_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_candidates_professor
  ON public.teacher_substitution_candidates(professor_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_candidates_status
  ON public.teacher_substitution_candidates(confirmation_status);

-- =========================================================
-- TRIGGERS — updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_teacher_substitution_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_tsr_updated ON public.teacher_substitution_requests;
CREATE TRIGGER trg_tsr_updated BEFORE UPDATE ON public.teacher_substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

DROP TRIGGER IF EXISTS trg_tso_updated ON public.teacher_substitution_occurrences;
CREATE TRIGGER trg_tso_updated BEFORE UPDATE ON public.teacher_substitution_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

DROP TRIGGER IF EXISTS trg_tsc_updated ON public.teacher_substitution_candidates;
CREATE TRIGGER trg_tsc_updated BEFORE UPDATE ON public.teacher_substitution_candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_substitution_updated_at();

-- =========================================================
-- AUTO substitution_code (TSR-AAAA-NNNNNN por organização)
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.teacher_substitution_code_seq START 1;

CREATE OR REPLACE FUNCTION public.tg_tsr_set_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.substitution_code IS NULL OR length(trim(NEW.substitution_code)) = 0 THEN
    NEW.substitution_code := 'TSR-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.teacher_substitution_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_tsr_set_code ON public.teacher_substitution_requests;
CREATE TRIGGER trg_tsr_set_code BEFORE INSERT ON public.teacher_substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_tsr_set_code();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.teacher_substitution_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_substitution_candidates  ENABLE ROW LEVEL SECURITY;

-- Helpers já existem: public.get_user_organization_id(uuid), public.get_professor_id_for_user(uuid), public.has_role(...)

-- --------- teacher_substitution_requests ---------
DROP POLICY IF EXISTS tsr_select ON public.teacher_substitution_requests;
CREATE POLICY tsr_select ON public.teacher_substitution_requests
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR substituted_professor_id = public.get_professor_id_for_user(auth.uid())
    OR substitute_professor_id  = public.get_professor_id_for_user(auth.uid())
  )
);

DROP POLICY IF EXISTS tsr_insert ON public.teacher_substitution_requests;
CREATE POLICY tsr_insert ON public.teacher_substitution_requests
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tsr_update ON public.teacher_substitution_requests;
CREATE POLICY tsr_update ON public.teacher_substitution_requests
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tsr_delete ON public.teacher_substitution_requests;
CREATE POLICY tsr_delete ON public.teacher_substitution_requests
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);

-- --------- teacher_substitution_occurrences ---------
DROP POLICY IF EXISTS tso_select ON public.teacher_substitution_occurrences;
CREATE POLICY tso_select ON public.teacher_substitution_occurrences
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR substituted_professor_id = public.get_professor_id_for_user(auth.uid())
    OR substitute_professor_id  = public.get_professor_id_for_user(auth.uid())
  )
);

DROP POLICY IF EXISTS tso_insert ON public.teacher_substitution_occurrences;
CREATE POLICY tso_insert ON public.teacher_substitution_occurrences
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tso_update ON public.teacher_substitution_occurrences;
CREATE POLICY tso_update ON public.teacher_substitution_occurrences
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tso_delete ON public.teacher_substitution_occurrences;
CREATE POLICY tso_delete ON public.teacher_substitution_occurrences
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);

-- --------- teacher_substitution_candidates ---------
DROP POLICY IF EXISTS tsc_select ON public.teacher_substitution_candidates;
CREATE POLICY tsc_select ON public.teacher_substitution_candidates
FOR SELECT TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'coordenador')
    OR public.has_role(auth.uid(),'rh')
    OR professor_id = public.get_professor_id_for_user(auth.uid())
  )
);

DROP POLICY IF EXISTS tsc_insert ON public.teacher_substitution_candidates;
CREATE POLICY tsc_insert ON public.teacher_substitution_candidates
FOR INSERT TO authenticated WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tsc_update ON public.teacher_substitution_candidates;
CREATE POLICY tsc_update ON public.teacher_substitution_candidates
FOR UPDATE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
);

DROP POLICY IF EXISTS tsc_delete ON public.teacher_substitution_candidates;
CREATE POLICY tsc_delete ON public.teacher_substitution_candidates
FOR DELETE TO authenticated USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin')
);
