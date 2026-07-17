
-- =============================================================================
-- PARTE 1: Schema — slot_type em entries + totalizadores split em sheets
-- =============================================================================

ALTER TABLE public.teacher_attendance_entries
  ADD COLUMN IF NOT EXISTS slot_type text NOT NULL DEFAULT 'CLASS';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_attendance_entries_slot_type_chk'
  ) THEN
    ALTER TABLE public.teacher_attendance_entries
      ADD CONSTRAINT teacher_attendance_entries_slot_type_chk
      CHECK (slot_type IN ('CLASS','PLANNING'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_entries_sheet_slot
  ON public.teacher_attendance_entries(monthly_sheet_id, slot_type);

ALTER TABLE public.teacher_attendance_monthly_sheets
  ADD COLUMN IF NOT EXISTS expected_class_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_planning_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_class_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_planning_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_class_entries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_planning_entries integer NOT NULL DEFAULT 0;

-- =============================================================================
-- PARTE 2: Bug A — guard trigger de folha fechada usava colunas inexistentes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_teacher_attendance_closed_sheet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_sheet_id uuid;
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    BEGIN
      IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF TG_TABLE_NAME = 'teacher_attendance_monthly_sheets' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'closed' AND NEW.status = 'closed' THEN
      IF NEW.expected_workload_minutes  IS DISTINCT FROM OLD.expected_workload_minutes
         OR NEW.confirmed_workload_minutes IS DISTINCT FROM OLD.confirmed_workload_minutes
         OR NEW.absence_workload_minutes IS DISTINCT FROM OLD.absence_workload_minutes
         OR NEW.late_minutes_total       IS DISTINCT FROM OLD.late_minutes_total
         OR NEW.total_expected_entries   IS DISTINCT FROM OLD.total_expected_entries
         OR NEW.total_present_entries    IS DISTINCT FROM OLD.total_present_entries
         OR NEW.total_absent_entries     IS DISTINCT FROM OLD.total_absent_entries
         OR NEW.total_late_entries       IS DISTINCT FROM OLD.total_late_entries THEN
        RAISE EXCEPTION 'Folha fechada não pode ter totais alterados';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  v_sheet_id := COALESCE(NEW.monthly_sheet_id, OLD.monthly_sheet_id);
  SELECT status INTO v_status
  FROM public.teacher_attendance_monthly_sheets
  WHERE id = v_sheet_id;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'Operação bloqueada: folha mensal está fechada';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- PARTE 3: generate_teacher_attendance_sheet — insere CLASS + PLANNING
-- =============================================================================

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

  INSERT INTO public.teacher_attendance_monthly_sheets (organization_id, professor_id, reference_year, reference_month, status)
  VALUES (p_org_id, p_professor_id, p_year, p_month, 'generated')
  ON CONFLICT (organization_id, professor_id, reference_year, reference_month) DO UPDATE
    SET updated_at = now()
  RETURNING id, status INTO v_sheet_id, v_status;

  IF v_status IN ('closed','approved_by_rh') THEN
    RETURN v_sheet_id;
  END IF;

  -- BLOCO 1: entradas de AULA (CLASS) — dependem de chamada de alunos
  INSERT INTO public.teacher_attendance_entries (
    organization_id, monthly_sheet_id, professor_id, school_id, course_id,
    class_group_id, subject_id, annual_class_occurrence_id, weekly_teaching_model_id,
    scheduled_date, scheduled_start_at, scheduled_end_at,
    workload_minutes, computed_status, final_status, slot_type
  )
  SELECT
    p_org_id, v_sheet_id, wtm.professor_id, wtm.school_id, wtm.course_id,
    wtm.class_group_id, wtm.subject_id, occ.id, wtm.id,
    occ.occurrence_date,
    (occ.occurrence_date::timestamp + occ.start_time)::timestamptz,
    (occ.occurrence_date::timestamp + occ.end_time)::timestamptz,
    EXTRACT(EPOCH FROM (occ.end_time - occ.start_time))::int / 60,
    'pending', 'pending', 'CLASS'
  FROM public.annual_class_occurrences occ
  JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
  WHERE occ.organization_id = p_org_id
    AND wtm.professor_id = p_professor_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
  ON CONFLICT (organization_id, professor_id, annual_class_occurrence_id) DO NOTHING;

  -- BLOCO 2: entradas de PLANEJAMENTO (PLANNING) — auto-confirmadas pela grade
  INSERT INTO public.teacher_attendance_entries (
    organization_id, monthly_sheet_id, professor_id, school_id, course_id,
    class_group_id, subject_id, annual_class_occurrence_id, weekly_teaching_model_id,
    scheduled_date, scheduled_start_at, scheduled_end_at,
    workload_minutes, confirmed_workload_minutes,
    computed_status, final_status, slot_type, is_auto_computed
  )
  SELECT
    p_org_id, v_sheet_id, wtm.professor_id, wtm.school_id, wtm.course_id,
    wtm.class_group_id, wtm.subject_id, occ.id, wtm.id,
    occ.occurrence_date,
    (occ.occurrence_date::timestamp + occ.start_time)::timestamptz,
    (occ.occurrence_date::timestamp + occ.end_time)::timestamptz,
    EXTRACT(EPOCH FROM (occ.end_time - occ.start_time))::int / 60,
    EXTRACT(EPOCH FROM (occ.end_time - occ.start_time))::int / 60,
    'planning_auto', 'planning_auto', 'PLANNING', true
  FROM public.annual_class_occurrences occ
  JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
  WHERE occ.organization_id = p_org_id
    AND wtm.professor_id = p_professor_id
    AND wtm.schedule_type = 'PLANNING'
    AND wtm.status = 'ACTIVE'
    AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
  ON CONFLICT (organization_id, professor_id, annual_class_occurrence_id) DO NOTHING;

  PERFORM public.recompute_teacher_attendance_for_sheet(v_sheet_id);
  PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);

  RETURN v_sheet_id;
END;
$$;

-- =============================================================================
-- PARTE 4: recompute_teacher_attendance_for_sheet — só toca CLASS
-- =============================================================================

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
  v_late  := COALESCE(v_late, 20);
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
     AND ar.professor_id    = e.professor_id
     AND ar.class_group_id  = e.class_group_id
     AND ar.subject_id      = e.subject_id
     AND ar.occurrence_date = e.scheduled_date
    WHERE e.monthly_sheet_id = p_sheet_id
      AND e.is_manual_adjusted = false
      AND e.slot_type = 'CLASS'
    GROUP BY e.id
  )
  UPDATE public.teacher_attendance_entries e
  SET
    attendance_record_id     = fc.first_record_id,
    actual_call_started_at   = fc.first_call_at,
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

-- =============================================================================
-- PARTE 5: recalc_teacher_attendance_sheet — totais separados CLASS / PLANNING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalc_teacher_attendance_sheet(p_sheet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teacher_attendance_monthly_sheets s
  SET
    total_class_entries        = sub.class_count,
    total_planning_entries     = sub.planning_count,
    total_expected_entries     = sub.class_count + sub.planning_count,
    total_present_entries      = sub.present,
    total_absent_entries       = sub.absent,
    total_late_entries         = sub.late,
    total_pending_entries      = sub.pending,
    total_divergent_entries    = sub.divergent,
    expected_class_minutes     = sub.exp_class,
    expected_planning_minutes  = sub.exp_planning,
    confirmed_class_minutes    = sub.conf_class,
    confirmed_planning_minutes = sub.conf_planning,
    expected_workload_minutes  = sub.exp_class + sub.exp_planning,
    confirmed_workload_minutes = sub.conf_class + sub.conf_planning,
    absence_workload_minutes   = sub.abs_wl,
    late_minutes_total         = sub.late_min,
    last_recalculated_at       = now(),
    updated_at                 = now()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE slot_type = 'CLASS')                                                AS class_count,
      COUNT(*) FILTER (WHERE slot_type = 'PLANNING')                                             AS planning_count,
      COUNT(*) FILTER (WHERE slot_type = 'CLASS' AND final_status IN ('present','present_with_delay')) AS present,
      COUNT(*) FILTER (WHERE slot_type = 'CLASS' AND final_status = 'absent')                    AS absent,
      COUNT(*) FILTER (WHERE slot_type = 'CLASS' AND final_status = 'present_with_delay')        AS late,
      COUNT(*) FILTER (WHERE slot_type = 'CLASS' AND final_status = 'pending')                   AS pending,
      COUNT(*) FILTER (WHERE slot_type = 'CLASS' AND computed_status IN ('divergent_professor','divergent_schedule','manual_review_required')) AS divergent,
      COALESCE(SUM(workload_minutes) FILTER (WHERE slot_type='CLASS'    AND final_status NOT IN ('cancelled','ignored')), 0) AS exp_class,
      COALESCE(SUM(workload_minutes) FILTER (WHERE slot_type='PLANNING' AND final_status NOT IN ('cancelled','ignored')), 0) AS exp_planning,
      COALESCE(SUM(confirmed_workload_minutes) FILTER (WHERE slot_type='CLASS'    AND final_status IN ('present','present_with_delay','justified_absence')), 0) AS conf_class,
      COALESCE(SUM(confirmed_workload_minutes) FILTER (WHERE slot_type='PLANNING'), 0) AS conf_planning,
      COALESCE(SUM(workload_minutes) FILTER (WHERE slot_type='CLASS' AND final_status = 'absent'), 0) AS abs_wl,
      COALESCE(SUM(late_minutes) FILTER (WHERE slot_type='CLASS'), 0) AS late_min
    FROM public.teacher_attendance_entries
    WHERE monthly_sheet_id = p_sheet_id
  ) sub
  WHERE s.id = p_sheet_id;
END;
$$;

-- =============================================================================
-- PARTE 6: recalculate_teacher_attendance_monthly_sheet — usa nova função
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_teacher_attendance_monthly_sheet(
  p_monthly_sheet_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet record;
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_totals record;
BEGIN
  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'sheet_not_found'); END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.professors p WHERE p.id = v_sheet.professor_id AND p.user_id = v_uid
  ) INTO v_is_owner;

  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id)
          OR is_rh(v_uid, v_sheet.organization_id) OR v_is_owner) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  IF v_sheet.status IN ('closed','approved_by_rh') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sheet_closed');
  END IF;

  PERFORM public.recalc_teacher_attendance_sheet(p_monthly_sheet_id);

  SELECT total_expected_entries AS expected,
         total_present_entries  AS present,
         total_absent_entries   AS absent,
         total_late_entries     AS late,
         total_pending_entries  AS pending,
         total_divergent_entries AS divergent,
         expected_workload_minutes AS expected_wl,
         confirmed_workload_minutes AS confirmed_wl,
         absence_workload_minutes AS absent_wl,
         late_minutes_total AS late_total,
         expected_class_minutes,
         expected_planning_minutes,
         confirmed_class_minutes,
         confirmed_planning_minutes,
         total_class_entries,
         total_planning_entries
    INTO v_totals
  FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, new_values)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'recalculate_sheet', to_jsonb(v_totals));

  RETURN jsonb_build_object('ok', true, 'sheet_id', p_monthly_sheet_id, 'totals', to_jsonb(v_totals));
END;
$$;

-- =============================================================================
-- PARTE 7: batch — incluir professores que só têm PLANNING também
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_monthly_sheets_batch(
  p_organization_id uuid,
  p_reference_year integer,
  p_reference_month integer,
  p_school_id uuid DEFAULT NULL,
  p_professor_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prof_id uuid;
  v_sheet_id uuid;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_start_date date := make_date(p_reference_year, p_reference_month, 1);
  v_end_date date := (make_date(p_reference_year, p_reference_month, 1) + interval '1 month')::date - 1;
  v_existed boolean;
  v_status text;
BEGIN
  IF NOT (is_admin(v_uid) OR is_rh(v_uid, p_organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  FOR v_prof_id IN
    SELECT DISTINCT wtm.professor_id
    FROM public.annual_class_occurrences occ
    JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
    WHERE occ.organization_id = p_organization_id
      AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
      AND wtm.schedule_type IN ('CLASS','PLANNING')
      AND wtm.status = 'ACTIVE'
      AND wtm.professor_id IS NOT NULL
      AND (p_school_id IS NULL OR wtm.school_id = p_school_id)
      AND (p_professor_ids IS NULL OR wtm.professor_id = ANY(p_professor_ids))
  LOOP
    BEGIN
      SELECT id, status INTO v_sheet_id, v_status
      FROM public.teacher_attendance_monthly_sheets
      WHERE organization_id = p_organization_id AND professor_id = v_prof_id
        AND reference_year = p_reference_year AND reference_month = p_reference_month;
      v_existed := v_sheet_id IS NOT NULL;

      IF v_existed AND v_status IN ('closed','approved_by_rh') THEN
        v_skipped := v_skipped + 1;
      ELSE
        v_sheet_id := public.generate_teacher_attendance_sheet(p_organization_id, v_prof_id, p_reference_year, p_reference_month);
        PERFORM public.recalculate_teacher_attendance_monthly_sheet(v_sheet_id);
        IF v_existed THEN v_updated := v_updated + 1; ELSE v_created := v_created + 1; END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('professor_id', v_prof_id, 'error', SQLERRM);
    END;
  END LOOP;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, actor_user_id, action, new_values)
  VALUES (p_organization_id, v_uid, 'generate_sheets_batch',
    jsonb_build_object('year', p_reference_year, 'month', p_reference_month,
      'school_id', p_school_id, 'professor_ids', p_professor_ids,
      'created', v_created, 'updated', v_updated, 'skipped', v_skipped,
      'errors_count', jsonb_array_length(v_errors)));

  RETURN jsonb_build_object('ok', true, 'created', v_created, 'updated', v_updated,
    'skipped', v_skipped, 'errors', v_errors);
END;
$$;

-- =============================================================================
-- PARTE 8: chamada dos alunos — só toca CLASS, nunca PLANNING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.compute_teacher_attendance_from_student_call(
  p_attendance_record_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_settings record;
  v_entry record;
  v_sheet_id uuid;
  v_call_at timestamptz;
  v_early int := 20;
  v_late int := 20;
  v_after int := 120;
  v_diff_sec bigint;
  v_late_min int := 0;
  v_early_min int := 0;
  v_computed text;
  v_final text;
  v_divergence text := NULL;
  v_existing_call timestamptz;
  v_wtm_prof uuid;
BEGIN
  SELECT ar.*, COALESCE(ar.call_submitted_at, ar.created_at) AS effective_call_at
    INTO v_rec
  FROM public.attendance_records ar
  WHERE ar.id = p_attendance_record_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'attendance_record_not_found'); END IF;

  v_call_at := v_rec.effective_call_at;

  SELECT allowed_early_minutes, allowed_late_minutes, max_call_after_class_minutes,
         auto_compute_on_student_call
    INTO v_settings
  FROM public.teacher_attendance_settings
  WHERE organization_id = v_rec.organization_id;
  IF FOUND THEN
    v_early := COALESCE(v_settings.allowed_early_minutes, 20);
    v_late  := COALESCE(v_settings.allowed_late_minutes, 20);
    v_after := COALESCE(v_settings.max_call_after_class_minutes, 120);
    IF v_settings.auto_compute_on_student_call = false THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'auto_compute_disabled');
    END IF;
  END IF;

  SELECT e.* INTO v_entry
  FROM public.teacher_attendance_entries e
  WHERE e.organization_id = v_rec.organization_id
    AND e.class_group_id  = v_rec.class_group_id
    AND e.subject_id      = v_rec.subject_id
    AND e.scheduled_date  = v_rec.occurrence_date
    AND e.is_manual_adjusted = false
    AND e.slot_type = 'CLASS'
  ORDER BY ABS(EXTRACT(EPOCH FROM (e.scheduled_start_at - v_call_at)))
  LIMIT 1;
  IF v_entry.id IS NULL THEN RETURN jsonb_build_object('ok', true, 'skipped', 'no_matching_entry'); END IF;

  v_sheet_id := v_entry.monthly_sheet_id;
  v_existing_call := v_entry.actual_call_submitted_at;
  IF v_existing_call IS NOT NULL AND v_existing_call <= v_call_at THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'already_computed', 'entry_id', v_entry.id, 'final_status', v_entry.final_status);
  END IF;

  SELECT wtm.professor_id INTO v_wtm_prof
  FROM public.weekly_teaching_models wtm WHERE wtm.id = v_entry.weekly_teaching_model_id;

  IF v_wtm_prof IS NOT NULL AND v_wtm_prof <> v_rec.professor_id THEN
    v_divergence := 'divergent_professor';
  ELSIF v_entry.class_group_id IS DISTINCT FROM v_rec.class_group_id
     OR v_entry.subject_id     IS DISTINCT FROM v_rec.subject_id THEN
    v_divergence := 'divergent_schedule';
  END IF;

  v_diff_sec := EXTRACT(EPOCH FROM (v_call_at - v_entry.scheduled_start_at))::bigint;
  IF v_diff_sec >= 0 THEN v_late_min := (v_diff_sec / 60)::int;
  ELSE v_early_min := ((-v_diff_sec) / 60)::int; END IF;

  IF v_divergence IS NOT NULL THEN
    v_computed := v_divergence; v_final := 'manual_review_required';
  ELSIF v_call_at BETWEEN (v_entry.scheduled_start_at - make_interval(mins => v_early))
                      AND (v_entry.scheduled_start_at + make_interval(mins => v_late)) THEN
    v_computed := 'present_on_time'; v_final := 'present';
  ELSIF v_call_at > (v_entry.scheduled_start_at + make_interval(mins => v_late))
    AND v_call_at <= (v_entry.scheduled_end_at  + make_interval(mins => v_after)) THEN
    v_computed := 'present_with_delay'; v_final := 'present_with_delay';
  ELSE
    v_computed := 'present_outside_window'; v_final := 'manual_review_required';
  END IF;

  UPDATE public.teacher_attendance_entries
  SET attendance_record_id     = v_rec.id,
      actual_call_started_at   = COALESCE(v_rec.call_started_at, v_call_at),
      actual_call_submitted_at = v_call_at,
      late_minutes             = v_late_min,
      early_minutes            = v_early_min,
      confirmed_workload_minutes = workload_minutes,
      computed_status          = v_computed,
      final_status             = v_final,
      divergence_reason        = v_divergence,
      updated_at               = now()
  WHERE id = v_entry.id;

  UPDATE public.attendance_records
  SET teacher_attendance_entry_id = v_entry.id
  WHERE id = v_rec.id AND (teacher_attendance_entry_id IS DISTINCT FROM v_entry.id);

  PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);

  BEGIN
    INSERT INTO public.teacher_attendance_audit_logs (
      organization_id, monthly_sheet_id, entry_id, actor_user_id, actor_role,
      action, new_values
    ) VALUES (
      v_rec.organization_id, v_sheet_id, v_entry.id, v_rec.call_created_by, 'system',
      'auto_compute_from_student_call',
      jsonb_build_object('attendance_record_id', v_rec.id, 'call_at', v_call_at,
        'computed_status', v_computed, 'final_status', v_final,
        'late_minutes', v_late_min, 'early_minutes', v_early_min, 'divergence', v_divergence)
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry.id, 'sheet_id', v_sheet_id,
    'computed_status', v_computed, 'final_status', v_final,
    'late_minutes', v_late_min, 'early_minutes', v_early_min, 'divergence', v_divergence);
END;
$$;

-- =============================================================================
-- PARTE 9: trigger legacy de attendance_records — também filtra CLASS
-- =============================================================================

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
  SELECT e.id, e.monthly_sheet_id, e.scheduled_start_at, e.scheduled_end_at, e.actual_call_started_at
    INTO v_entry_id, v_sheet_id, v_scheduled_start, v_scheduled_end, v_existing_call
  FROM public.teacher_attendance_entries e
  WHERE e.organization_id = NEW.organization_id
    AND e.professor_id    = NEW.professor_id
    AND e.class_group_id  = NEW.class_group_id
    AND e.subject_id      = NEW.subject_id
    AND e.scheduled_date  = NEW.occurrence_date
    AND e.is_manual_adjusted = false
    AND e.slot_type = 'CLASS'
  ORDER BY ABS(EXTRACT(EPOCH FROM (e.scheduled_start_at - NEW.created_at)))
  LIMIT 1;

  IF v_entry_id IS NULL THEN RETURN NEW; END IF;
  IF v_existing_call IS NOT NULL AND v_existing_call <= NEW.created_at THEN RETURN NEW; END IF;

  SELECT allowed_early_minutes, allowed_late_minutes, max_call_after_class_minutes
    INTO v_settings
  FROM public.teacher_attendance_settings
  WHERE organization_id = NEW.organization_id;

  v_early := COALESCE(v_settings.allowed_early_minutes, 20);
  v_late  := COALESCE(v_settings.allowed_late_minutes, 20);
  v_first_call := NEW.created_at;

  UPDATE public.teacher_attendance_entries e
  SET
    attendance_record_id     = NEW.id,
    actual_call_started_at   = v_first_call,
    actual_call_submitted_at = v_first_call,
    late_minutes  = CASE WHEN v_first_call > v_scheduled_start
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

  BEGIN
    PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- PARTE 10: Bug C — get_teacher_attendance_monthly_sheet_details usa full_name
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_teacher_attendance_monthly_sheet_details(
  p_monthly_sheet_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet record;
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_professor jsonb;
  v_entries jsonb;
  v_adjustments jsonb;
  v_signatures jsonb;
  v_audit jsonb;
BEGIN
  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'sheet_not_found'); END IF;

  SELECT EXISTS(SELECT 1 FROM public.professors p WHERE p.id = v_sheet.professor_id AND p.user_id = v_uid) INTO v_is_owner;
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id)
          OR is_rh(v_uid, v_sheet.organization_id) OR v_is_owner) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT to_jsonb(p) INTO v_professor
  FROM (SELECT id, full_name, cpf FROM public.professors WHERE id = v_sheet.professor_id) p;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.scheduled_start_at), '[]'::jsonb) INTO v_entries
  FROM (
    SELECT e.*,
           s.nome  AS school_name,
           c.nome  AS course_name,
           cg.nome AS class_group_name,
           sb.nome AS subject_name
    FROM public.teacher_attendance_entries e
    LEFT JOIN public.schools s ON s.id = e.school_id
    LEFT JOIN public.courses c ON c.id = e.course_id
    LEFT JOIN public.class_groups cg ON cg.id = e.class_group_id
    LEFT JOIN public.subjects sb ON sb.id = e.subject_id
    WHERE e.monthly_sheet_id = p_monthly_sheet_id
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_adjustments
  FROM public.teacher_attendance_adjustments a WHERE a.monthly_sheet_id = p_monthly_sheet_id;

  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC), '[]'::jsonb) INTO v_signatures
  FROM public.teacher_attendance_closure_signatures s WHERE s.monthly_sheet_id = p_monthly_sheet_id;

  SELECT COALESCE(jsonb_agg(row_to_json(l) ORDER BY l.created_at DESC), '[]'::jsonb) INTO v_audit
  FROM public.teacher_attendance_audit_logs l WHERE l.monthly_sheet_id = p_monthly_sheet_id;

  RETURN jsonb_build_object('ok', true, 'sheet', to_jsonb(v_sheet),
    'professor', v_professor, 'entries', v_entries,
    'adjustments', v_adjustments, 'signatures', v_signatures, 'audit_logs', v_audit);
END;
$$;

-- =============================================================================
-- PARTE 11: Recalculo retroativo de folhas abertas existentes
-- =============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.teacher_attendance_monthly_sheets
    WHERE status NOT IN ('closed','approved_by_rh')
  LOOP
    BEGIN
      PERFORM public.recalc_teacher_attendance_sheet(r.id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
