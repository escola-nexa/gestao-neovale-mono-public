
-- =====================================================================
-- MÓDULO: Presença dos Professores (Folha de Ponto Automática)
-- =====================================================================

-- 1) SETTINGS ----------------------------------------------------------
CREATE TABLE public.teacher_attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auto_generate_enabled boolean NOT NULL DEFAULT true,
  auto_compute_on_student_call boolean NOT NULL DEFAULT true,
  allowed_early_minutes integer NOT NULL DEFAULT 20,
  allowed_late_minutes integer NOT NULL DEFAULT 20,
  max_call_after_class_minutes integer NOT NULL DEFAULT 120,
  require_adjustment_reason boolean NOT NULL DEFAULT true,
  allow_professor_view_own_sheet boolean NOT NULL DEFAULT true,
  allow_professor_request_adjustment boolean NOT NULL DEFAULT true,
  require_rh_final_closure boolean NOT NULL DEFAULT true,
  closure_day_limit integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 2) MONTHLY SHEETS ---------------------------------------------------
CREATE TABLE public.teacher_attendance_monthly_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  reference_year integer NOT NULL,
  reference_month integer NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'draft',
  total_expected_entries integer NOT NULL DEFAULT 0,
  total_present_entries integer NOT NULL DEFAULT 0,
  total_absent_entries integer NOT NULL DEFAULT 0,
  total_late_entries integer NOT NULL DEFAULT 0,
  total_pending_entries integer NOT NULL DEFAULT 0,
  total_divergent_entries integer NOT NULL DEFAULT 0,
  expected_workload_minutes integer NOT NULL DEFAULT 0,
  confirmed_workload_minutes integer NOT NULL DEFAULT 0,
  absence_workload_minutes integer NOT NULL DEFAULT 0,
  late_minutes_total integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  last_recalculated_at timestamptz,
  submitted_for_review_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id),
  closed_at timestamptz,
  reopened_by uuid REFERENCES public.profiles(id),
  reopened_at timestamptz,
  closure_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, professor_id, reference_year, reference_month),
  CHECK (status IN ('draft','generated','with_pending_items','under_review','approved_by_coordination','approved_by_rh','closed','reopened','cancelled'))
);

CREATE INDEX idx_teacher_attendance_monthly_sheets_org_month ON public.teacher_attendance_monthly_sheets(organization_id, reference_year, reference_month);
CREATE INDEX idx_teacher_attendance_monthly_sheets_professor_month ON public.teacher_attendance_monthly_sheets(professor_id, reference_year, reference_month);
CREATE INDEX idx_teacher_attendance_monthly_sheets_status ON public.teacher_attendance_monthly_sheets(status);

-- 3) ENTRIES ----------------------------------------------------------
CREATE TABLE public.teacher_attendance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_sheet_id uuid NOT NULL REFERENCES public.teacher_attendance_monthly_sheets(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  class_group_id uuid REFERENCES public.class_groups(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  annual_class_occurrence_id uuid REFERENCES public.annual_class_occurrences(id) ON DELETE SET NULL,
  weekly_teaching_model_id uuid REFERENCES public.weekly_teaching_models(id) ON DELETE SET NULL,
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  actual_call_started_at timestamptz,
  actual_call_submitted_at timestamptz,
  computed_status text NOT NULL DEFAULT 'pending',
  manual_status text,
  final_status text NOT NULL DEFAULT 'pending',
  is_auto_computed boolean NOT NULL DEFAULT true,
  is_manual_adjusted boolean NOT NULL DEFAULT false,
  late_minutes integer NOT NULL DEFAULT 0,
  early_minutes integer NOT NULL DEFAULT 0,
  workload_minutes integer NOT NULL DEFAULT 0,
  confirmed_workload_minutes integer NOT NULL DEFAULT 0,
  divergence_reason text,
  adjustment_reason text,
  adjusted_by uuid REFERENCES public.profiles(id),
  adjusted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, professor_id, annual_class_occurrence_id),
  CHECK (computed_status IN ('pending','present_on_time','present_with_delay','present_outside_window','absent_no_call','divergent_professor','divergent_schedule','cancelled_non_letivo','not_expected','manual_review_required')),
  CHECK (final_status IN ('pending','present','present_with_delay','absent','justified_absence','cancelled','ignored','manual_review_required'))
);

CREATE INDEX idx_teacher_attendance_entries_monthly_sheet ON public.teacher_attendance_entries(monthly_sheet_id);
CREATE INDEX idx_teacher_attendance_entries_professor_date ON public.teacher_attendance_entries(professor_id, scheduled_date);
CREATE INDEX idx_teacher_attendance_entries_school_date ON public.teacher_attendance_entries(school_id, scheduled_date);
CREATE INDEX idx_teacher_attendance_entries_final_status ON public.teacher_attendance_entries(final_status);
CREATE INDEX idx_teacher_attendance_entries_attendance_record ON public.teacher_attendance_entries(attendance_record_id);
CREATE INDEX idx_teacher_attendance_entries_occurrence ON public.teacher_attendance_entries(annual_class_occurrence_id);

-- 4) ADJUSTMENTS ------------------------------------------------------
CREATE TABLE public.teacher_attendance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.teacher_attendance_entries(id) ON DELETE CASCADE,
  monthly_sheet_id uuid NOT NULL REFERENCES public.teacher_attendance_monthly_sheets(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  requested_by_role text NOT NULL,
  request_type text NOT NULL,
  previous_status text,
  requested_status text NOT NULL,
  reason text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (request_type IN ('mark_present','mark_absent','mark_justified_absence','ignore_entry','fix_schedule_link','fix_attendance_record_link','other')),
  CHECK (status IN ('pending','approved','rejected','cancelled'))
);

CREATE INDEX idx_teacher_attendance_adjustments_entry ON public.teacher_attendance_adjustments(entry_id);
CREATE INDEX idx_teacher_attendance_adjustments_status ON public.teacher_attendance_adjustments(status);
CREATE INDEX idx_teacher_attendance_adjustments_sheet ON public.teacher_attendance_adjustments(monthly_sheet_id);

-- 5) CLOSURE SIGNATURES -----------------------------------------------
CREATE TABLE public.teacher_attendance_closure_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_sheet_id uuid NOT NULL REFERENCES public.teacher_attendance_monthly_sheets(id) ON DELETE CASCADE,
  signed_by uuid NOT NULL REFERENCES public.profiles(id),
  signed_by_role text NOT NULL,
  signature_type text NOT NULL,
  signature_status text NOT NULL DEFAULT 'signed',
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (signature_type IN ('coordination_review','rh_review','admin_closure','professor_acknowledgement','reopening_authorization'))
);

CREATE INDEX idx_teacher_attendance_closure_signatures_sheet ON public.teacher_attendance_closure_signatures(monthly_sheet_id);

-- 6) AUDIT LOGS -------------------------------------------------------
CREATE TABLE public.teacher_attendance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_sheet_id uuid REFERENCES public.teacher_attendance_monthly_sheets(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.teacher_attendance_entries(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id),
  actor_role text,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_attendance_audit_logs_sheet ON public.teacher_attendance_audit_logs(monthly_sheet_id);
CREATE INDEX idx_teacher_attendance_audit_logs_entry ON public.teacher_attendance_audit_logs(entry_id);
CREATE INDEX idx_teacher_attendance_audit_logs_action ON public.teacher_attendance_audit_logs(action);

-- =====================================================================
-- TRIGGERS de updated_at
-- =====================================================================
CREATE TRIGGER trg_tas_updated_at BEFORE UPDATE ON public.teacher_attendance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tams_updated_at BEFORE UPDATE ON public.teacher_attendance_monthly_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tae_updated_at BEFORE UPDATE ON public.teacher_attendance_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_taa_updated_at BEFORE UPDATE ON public.teacher_attendance_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- ENABLE RLS
-- =====================================================================
ALTER TABLE public.teacher_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_monthly_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_closure_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- settings: only admin manage, all org members read
CREATE POLICY "Org members read attendance settings" ON public.teacher_attendance_settings
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Admins manage attendance settings" ON public.teacher_attendance_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- monthly_sheets
CREATE POLICY "Managers view all sheets in org" ON public.teacher_attendance_monthly_sheets
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));
CREATE POLICY "Professors view own sheets" ON public.teacher_attendance_monthly_sheets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professors p WHERE p.id = teacher_attendance_monthly_sheets.professor_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Managers manage sheets" ON public.teacher_attendance_monthly_sheets
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

-- entries
CREATE POLICY "Managers view all entries in org" ON public.teacher_attendance_entries
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));
CREATE POLICY "Professors view own entries" ON public.teacher_attendance_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professors p WHERE p.id = teacher_attendance_entries.professor_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Managers manage entries" ON public.teacher_attendance_entries
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

-- adjustments
CREATE POLICY "Managers view all adjustments" ON public.teacher_attendance_adjustments
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));
CREATE POLICY "Professors view own adjustments" ON public.teacher_attendance_adjustments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_attendance_entries e JOIN public.professors p ON p.id = e.professor_id
            WHERE e.id = teacher_attendance_adjustments.entry_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Professors create own adjustments" ON public.teacher_attendance_adjustments
  FOR INSERT WITH CHECK (
    public.has_organization_access(auth.uid(), organization_id) AND
    requested_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.teacher_attendance_entries e JOIN public.professors p ON p.id = e.professor_id
            WHERE e.id = entry_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Managers manage adjustments" ON public.teacher_attendance_adjustments
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

-- signatures
CREATE POLICY "Managers view signatures" ON public.teacher_attendance_closure_signatures
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));
CREATE POLICY "Professors view own sheet signatures" ON public.teacher_attendance_closure_signatures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_attendance_monthly_sheets s
            JOIN public.professors p ON p.id = s.professor_id
            WHERE s.id = teacher_attendance_closure_signatures.monthly_sheet_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Managers create signatures" ON public.teacher_attendance_closure_signatures
  FOR INSERT WITH CHECK (
    public.is_coordinator(auth.uid(), organization_id) AND signed_by = auth.uid()
  );
CREATE POLICY "Professors sign acknowledgement" ON public.teacher_attendance_closure_signatures
  FOR INSERT WITH CHECK (
    signature_type = 'professor_acknowledgement' AND signed_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.teacher_attendance_monthly_sheets s
            JOIN public.professors p ON p.id = s.professor_id
            WHERE s.id = monthly_sheet_id AND p.user_id = auth.uid())
  );

-- audit logs: insert by system + managers; read by managers + professor own
CREATE POLICY "Managers read audit logs" ON public.teacher_attendance_audit_logs
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));
CREATE POLICY "Professors read own audit logs" ON public.teacher_attendance_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_attendance_monthly_sheets s
            JOIN public.professors p ON p.id = s.professor_id
            WHERE s.id = teacher_attendance_audit_logs.monthly_sheet_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Org members write audit logs" ON public.teacher_attendance_audit_logs
  FOR INSERT WITH CHECK (public.has_organization_access(auth.uid(), organization_id));

-- =====================================================================
-- FUNÇÃO: recalcula totais da folha
-- =====================================================================
CREATE OR REPLACE FUNCTION public.recalc_teacher_attendance_sheet(p_sheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teacher_attendance_monthly_sheets s
  SET
    total_expected_entries = sub.total,
    total_present_entries = sub.present,
    total_absent_entries = sub.absent,
    total_late_entries = sub.late,
    total_pending_entries = sub.pending,
    total_divergent_entries = sub.divergent,
    expected_workload_minutes = sub.exp_wl,
    confirmed_workload_minutes = sub.conf_wl,
    absence_workload_minutes = sub.abs_wl,
    late_minutes_total = sub.late_min,
    last_recalculated_at = now(),
    updated_at = now()
  FROM (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE final_status IN ('present','present_with_delay')) AS present,
      COUNT(*) FILTER (WHERE final_status = 'absent') AS absent,
      COUNT(*) FILTER (WHERE final_status = 'present_with_delay') AS late,
      COUNT(*) FILTER (WHERE final_status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE computed_status IN ('divergent_professor','divergent_schedule','manual_review_required')) AS divergent,
      COALESCE(SUM(workload_minutes),0) AS exp_wl,
      COALESCE(SUM(confirmed_workload_minutes) FILTER (WHERE final_status IN ('present','present_with_delay')),0) AS conf_wl,
      COALESCE(SUM(workload_minutes) FILTER (WHERE final_status = 'absent'),0) AS abs_wl,
      COALESCE(SUM(late_minutes),0) AS late_min
    FROM public.teacher_attendance_entries
    WHERE monthly_sheet_id = p_sheet_id
  ) sub
  WHERE s.id = p_sheet_id;
END;
$$;

-- =====================================================================
-- FUNÇÃO: gera/atualiza folha mensal de um professor
--   - Cria sheet se não existir (e estiver não-fechada)
--   - Cria entries a partir de annual_class_occurrences do mês
--   - Idempotente (UNIQUE por professor + occurrence)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_sheet(
  p_org_id uuid,
  p_professor_id uuid,
  p_year integer,
  p_month integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet_id uuid;
  v_status text;
  v_start_date date;
  v_end_date date;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month')::date - 1;

  -- upsert sheet
  INSERT INTO public.teacher_attendance_monthly_sheets (organization_id, professor_id, reference_year, reference_month, status)
  VALUES (p_org_id, p_professor_id, p_year, p_month, 'generated')
  ON CONFLICT (organization_id, professor_id, reference_year, reference_month) DO UPDATE
    SET updated_at = now()
  RETURNING id, status INTO v_sheet_id, v_status;

  -- bloqueia se folha fechada
  IF v_status IN ('closed','approved_by_rh') THEN
    RETURN v_sheet_id;
  END IF;

  -- insere entries faltantes
  INSERT INTO public.teacher_attendance_entries (
    organization_id, monthly_sheet_id, professor_id, school_id, course_id,
    class_group_id, subject_id, annual_class_occurrence_id, weekly_teaching_model_id,
    scheduled_date, scheduled_start_at, scheduled_end_at,
    workload_minutes, computed_status, final_status
  )
  SELECT
    p_org_id,
    v_sheet_id,
    wtm.professor_id,
    wtm.school_id,
    wtm.course_id,
    wtm.class_group_id,
    wtm.subject_id,
    occ.id,
    wtm.id,
    occ.occurrence_date,
    (occ.occurrence_date::timestamp + occ.start_time)::timestamptz,
    (occ.occurrence_date::timestamp + occ.end_time)::timestamptz,
    EXTRACT(EPOCH FROM (occ.end_time - occ.start_time))::int / 60,
    'pending',
    'pending'
  FROM public.annual_class_occurrences occ
  JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
  WHERE occ.organization_id = p_org_id
    AND wtm.professor_id = p_professor_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
  ON CONFLICT (organization_id, professor_id, annual_class_occurrence_id) DO NOTHING;

  -- recalcula com base em attendance_records já existentes
  PERFORM public.recompute_teacher_attendance_for_sheet(v_sheet_id);
  PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);

  RETURN v_sheet_id;
END;
$$;

-- =====================================================================
-- FUNÇÃO: recomputa todas as entries de uma folha a partir de attendance_records
-- =====================================================================
CREATE OR REPLACE FUNCTION public.recompute_teacher_attendance_for_sheet(p_sheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_early int;
  v_late int;
  v_after int;
BEGIN
  SELECT allowed_early_minutes, allowed_late_minutes, max_call_after_class_minutes
    INTO v_early, v_late, v_after
  FROM public.teacher_attendance_settings s
  JOIN public.teacher_attendance_monthly_sheets sh ON sh.organization_id = s.organization_id
  WHERE sh.id = p_sheet_id;

  v_early := COALESCE(v_early, 20);
  v_late := COALESCE(v_late, 20);
  v_after := COALESCE(v_after, 120);

  WITH first_calls AS (
    SELECT
      e.id AS entry_id,
      e.scheduled_start_at,
      e.scheduled_end_at,
      e.workload_minutes,
      MIN(ar.created_at) AS first_call_at,
      (ARRAY_AGG(ar.id ORDER BY ar.created_at))[1] AS first_record_id
    FROM public.teacher_attendance_entries e
    LEFT JOIN public.attendance_records ar
      ON ar.organization_id = e.organization_id
     AND ar.professor_id = e.professor_id
     AND ar.class_group_id = e.class_group_id
     AND ar.subject_id = e.subject_id
     AND ar.occurrence_date = e.scheduled_date
    WHERE e.monthly_sheet_id = p_sheet_id
      AND e.is_manual_adjusted = false
    GROUP BY e.id
  )
  UPDATE public.teacher_attendance_entries e
  SET
    attendance_record_id = fc.first_record_id,
    actual_call_started_at = fc.first_call_at,
    actual_call_submitted_at = fc.first_call_at,
    late_minutes = CASE
      WHEN fc.first_call_at IS NULL THEN 0
      WHEN fc.first_call_at > fc.scheduled_start_at THEN GREATEST(0, EXTRACT(EPOCH FROM (fc.first_call_at - fc.scheduled_start_at))::int / 60)
      ELSE 0
    END,
    early_minutes = CASE
      WHEN fc.first_call_at IS NULL THEN 0
      WHEN fc.first_call_at < fc.scheduled_start_at THEN GREATEST(0, EXTRACT(EPOCH FROM (fc.scheduled_start_at - fc.first_call_at))::int / 60)
      ELSE 0
    END,
    confirmed_workload_minutes = CASE WHEN fc.first_call_at IS NOT NULL THEN fc.workload_minutes ELSE 0 END,
    computed_status = CASE
      WHEN fc.first_call_at IS NULL AND fc.scheduled_end_at < now() THEN 'absent_no_call'
      WHEN fc.first_call_at IS NULL THEN 'pending'
      WHEN fc.first_call_at BETWEEN (fc.scheduled_start_at - make_interval(mins => v_early)) AND (fc.scheduled_start_at + make_interval(mins => v_late)) THEN 'present_on_time'
      WHEN fc.first_call_at <= fc.scheduled_end_at + make_interval(mins => v_after) THEN 'present_with_delay'
      ELSE 'present_outside_window'
    END,
    final_status = CASE
      WHEN fc.first_call_at IS NULL AND fc.scheduled_end_at < now() THEN 'absent'
      WHEN fc.first_call_at IS NULL THEN 'pending'
      WHEN fc.first_call_at BETWEEN (fc.scheduled_start_at - make_interval(mins => v_early)) AND (fc.scheduled_start_at + make_interval(mins => v_late)) THEN 'present'
      WHEN fc.first_call_at <= fc.scheduled_end_at + make_interval(mins => v_after) THEN 'present_with_delay'
      ELSE 'present'
    END,
    updated_at = now()
  FROM first_calls fc
  WHERE e.id = fc.entry_id;
END;
$$;

-- =====================================================================
-- TRIGGER: ao inserir attendance_record, atualiza entry correspondente
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_attendance_records_update_teacher_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_sheet_id uuid;
  v_settings record;
  v_scheduled_start timestamptz;
  v_scheduled_end timestamptz;
  v_first_call timestamptz;
  v_existing_call timestamptz;
  v_late int;
  v_early int;
BEGIN
  -- localiza entry pelo (professor, turma, disciplina, data)
  SELECT e.id, e.monthly_sheet_id, e.scheduled_start_at, e.scheduled_end_at, e.actual_call_started_at
    INTO v_entry_id, v_sheet_id, v_scheduled_start, v_scheduled_end, v_existing_call
  FROM public.teacher_attendance_entries e
  WHERE e.organization_id = NEW.organization_id
    AND e.professor_id = NEW.professor_id
    AND e.class_group_id = NEW.class_group_id
    AND e.subject_id = NEW.subject_id
    AND e.scheduled_date = NEW.occurrence_date
    AND e.is_manual_adjusted = false
  ORDER BY ABS(EXTRACT(EPOCH FROM (e.scheduled_start_at - NEW.created_at)))
  LIMIT 1;

  IF v_entry_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- só atualiza se for a primeira chamada da aula
  IF v_existing_call IS NOT NULL AND v_existing_call <= NEW.created_at THEN
    RETURN NEW;
  END IF;

  SELECT allowed_early_minutes, allowed_late_minutes, max_call_after_class_minutes
    INTO v_settings
  FROM public.teacher_attendance_settings
  WHERE organization_id = NEW.organization_id;

  v_early := COALESCE(v_settings.allowed_early_minutes, 20);
  v_late := COALESCE(v_settings.allowed_late_minutes, 20);
  v_first_call := NEW.created_at;

  UPDATE public.teacher_attendance_entries e
  SET
    attendance_record_id = NEW.id,
    actual_call_started_at = v_first_call,
    actual_call_submitted_at = v_first_call,
    late_minutes = CASE WHEN v_first_call > v_scheduled_start
                        THEN GREATEST(0, EXTRACT(EPOCH FROM (v_first_call - v_scheduled_start))::int / 60) ELSE 0 END,
    early_minutes = CASE WHEN v_first_call < v_scheduled_start
                         THEN GREATEST(0, EXTRACT(EPOCH FROM (v_scheduled_start - v_first_call))::int / 60) ELSE 0 END,
    confirmed_workload_minutes = e.workload_minutes,
    computed_status = CASE
      WHEN v_first_call BETWEEN (v_scheduled_start - make_interval(mins => v_early)) AND (v_scheduled_start + make_interval(mins => v_late)) THEN 'present_on_time'
      WHEN v_first_call <= v_scheduled_end + make_interval(mins => COALESCE(v_settings.max_call_after_class_minutes, 120)) THEN 'present_with_delay'
      ELSE 'present_outside_window'
    END,
    final_status = CASE
      WHEN v_first_call BETWEEN (v_scheduled_start - make_interval(mins => v_early)) AND (v_scheduled_start + make_interval(mins => v_late)) THEN 'present'
      WHEN v_first_call <= v_scheduled_end + make_interval(mins => COALESCE(v_settings.max_call_after_class_minutes, 120)) THEN 'present_with_delay'
      ELSE 'present'
    END,
    updated_at = now()
  WHERE e.id = v_entry_id;

  -- recalcula totais (best-effort, não falha a inserção)
  BEGIN
    PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_records_teacher_presence
AFTER INSERT ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.trg_attendance_records_update_teacher_entry();
