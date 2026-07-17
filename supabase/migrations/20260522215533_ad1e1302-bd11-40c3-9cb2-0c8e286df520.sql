
-- ============================================================================
-- 0) Corrige nomes de coluna na auditoria (compute_teacher_attendance...)
--    O insert anterior usava actor_id/metadata; a tabela usa actor_user_id e
--    new_values. Recriamos a função com as colunas corretas.
-- ============================================================================
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

-- ============================================================================
-- 1) RECALCULATE
-- ============================================================================
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

  SELECT
    COUNT(*) FILTER (WHERE final_status NOT IN ('cancelled','ignored'))                                  AS expected,
    COUNT(*) FILTER (WHERE final_status IN ('present','present_with_delay'))                             AS present,
    COUNT(*) FILTER (WHERE final_status = 'absent')                                                      AS absent,
    COUNT(*) FILTER (WHERE final_status = 'present_with_delay')                                          AS late,
    COUNT(*) FILTER (WHERE final_status IN ('pending','manual_review_required'))                        AS pending,
    COUNT(*) FILTER (WHERE computed_status IN ('divergent_professor','divergent_schedule','present_outside_window')) AS divergent,
    COALESCE(SUM(workload_minutes)            FILTER (WHERE final_status NOT IN ('cancelled','ignored')), 0)         AS expected_wl,
    COALESCE(SUM(confirmed_workload_minutes)  FILTER (WHERE final_status IN ('present','present_with_delay','justified_absence')), 0) AS confirmed_wl,
    COALESCE(SUM(workload_minutes)            FILTER (WHERE final_status = 'absent'), 0)                            AS absent_wl,
    COALESCE(SUM(late_minutes), 0)                                                                                   AS late_total
  INTO v_totals
  FROM public.teacher_attendance_entries
  WHERE monthly_sheet_id = p_monthly_sheet_id;

  UPDATE public.teacher_attendance_monthly_sheets SET
    total_expected_entries     = v_totals.expected,
    total_present_entries      = v_totals.present,
    total_absent_entries       = v_totals.absent,
    total_late_entries         = v_totals.late,
    total_pending_entries      = v_totals.pending,
    total_divergent_entries    = v_totals.divergent,
    expected_workload_minutes  = v_totals.expected_wl,
    confirmed_workload_minutes = v_totals.confirmed_wl,
    absence_workload_minutes   = v_totals.absent_wl,
    late_minutes_total         = v_totals.late_total,
    last_recalculated_at       = now(),
    updated_at                 = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, new_values)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'recalculate_sheet', to_jsonb(v_totals));

  RETURN jsonb_build_object('ok', true, 'sheet_id', p_monthly_sheet_id, 'totals', to_jsonb(v_totals));
END;
$$;

-- ============================================================================
-- 2) GENERATE INDIVIDUAL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_monthly_sheet(
  p_organization_id uuid,
  p_professor_id uuid,
  p_reference_year integer,
  p_reference_month integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sheet_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, p_organization_id) OR is_rh(v_uid, p_organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  v_sheet_id := public.generate_teacher_attendance_sheet(p_organization_id, p_professor_id, p_reference_year, p_reference_month);
  PERFORM public.recalculate_teacher_attendance_monthly_sheet(v_sheet_id);

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, new_values)
  VALUES (p_organization_id, v_sheet_id, v_uid, 'generate_sheet',
    jsonb_build_object('professor_id', p_professor_id, 'year', p_reference_year, 'month', p_reference_month));

  RETURN v_sheet_id;
END;
$$;

-- ============================================================================
-- 3) GENERATE BATCH
-- ============================================================================
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
      AND wtm.schedule_type = 'CLASS'
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

-- ============================================================================
-- 4) DETAILS
-- ============================================================================
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
  FROM (SELECT id, nome_completo, email, cpf FROM public.professors WHERE id = v_sheet.professor_id) p;

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

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_adjustments
  FROM public.teacher_attendance_adjustments a WHERE a.monthly_sheet_id = p_monthly_sheet_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sg) ORDER BY sg.signed_at DESC), '[]'::jsonb) INTO v_signatures
  FROM public.teacher_attendance_closure_signatures sg WHERE sg.monthly_sheet_id = p_monthly_sheet_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(al) ORDER BY al.created_at DESC), '[]'::jsonb) INTO v_audit
  FROM public.teacher_attendance_audit_logs al WHERE al.monthly_sheet_id = p_monthly_sheet_id;

  RETURN jsonb_build_object('ok', true, 'sheet', to_jsonb(v_sheet),
    'professor', v_professor, 'entries', v_entries,
    'adjustments', v_adjustments, 'signatures', v_signatures, 'audit_logs', v_audit);
END;
$$;

-- ============================================================================
-- 5) DASHBOARD KPIs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_teacher_attendance_dashboard_kpis(
  p_organization_id uuid,
  p_reference_year integer,
  p_reference_month integer,
  p_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, p_organization_id) OR is_rh(v_uid, p_organization_id)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  WITH sheets AS (
    SELECT s.* FROM public.teacher_attendance_monthly_sheets s
    WHERE s.organization_id = p_organization_id
      AND s.reference_year  = p_reference_year
      AND s.reference_month = p_reference_month
  ),
  filtered_sheets AS (
    SELECT s.* FROM sheets s
    WHERE p_school_id IS NULL
       OR EXISTS (
         SELECT 1 FROM public.teacher_attendance_entries e
         WHERE e.monthly_sheet_id = s.id AND e.school_id = p_school_id
       )
  ),
  agg AS (
    SELECT
      COUNT(*)                                                                       AS total_sheets,
      COUNT(*) FILTER (WHERE status IN ('closed','approved_by_rh'))                  AS closed_sheets,
      COUNT(*) FILTER (WHERE status NOT IN ('closed','approved_by_rh'))              AS pending_sheets,
      COALESCE(SUM(expected_workload_minutes), 0)                                    AS expected_wl,
      COALESCE(SUM(confirmed_workload_minutes), 0)                                   AS confirmed_wl,
      COALESCE(SUM(absence_workload_minutes), 0)                                     AS absence_wl,
      COALESCE(SUM(total_absent_entries), 0)                                         AS absences,
      COALESCE(SUM(total_late_entries), 0)                                           AS lates,
      COALESCE(SUM(total_divergent_entries), 0)                                      AS divergences,
      COALESCE(SUM(late_minutes_total), 0)                                           AS late_minutes_total
    FROM filtered_sheets
  )
  SELECT to_jsonb(agg) INTO v_result FROM agg;

  RETURN jsonb_build_object('ok', true, 'year', p_reference_year, 'month', p_reference_month,
    'school_id', p_school_id, 'kpis', v_result);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_teacher_attendance_monthly_sheet(uuid,uuid,integer,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_teacher_attendance_monthly_sheets_batch(uuid,integer,integer,uuid,uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_teacher_attendance_monthly_sheet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_teacher_attendance_monthly_sheet_details(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_teacher_attendance_dashboard_kpis(uuid,integer,integer,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_teacher_attendance_from_student_call(uuid) FROM anon;
