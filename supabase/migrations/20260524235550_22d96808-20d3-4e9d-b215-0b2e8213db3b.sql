
-- Helper: resolve semester (FIRST/SECOND) for a given year/month using active calendar bimesters
CREATE OR REPLACE FUNCTION public.get_semester_for_month(p_org_id uuid, p_year integer, p_month integer)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month_start date := make_date(p_year, p_month, 1);
  v_month_end date := (make_date(p_year, p_month, 1) + interval '1 month')::date - 1;
  v_bim int;
BEGIN
  -- 1) Bimester whose range overlaps the month
  SELECT b.number
    INTO v_bim
  FROM public.academic_bimesters b
  JOIN public.academic_calendars c ON c.id = b.calendar_id
  WHERE c.organization_id = p_org_id
    AND c.status = 'ACTIVE'
    AND b.start_date <= v_month_end
    AND b.end_date   >= v_month_start
  ORDER BY b.number
  LIMIT 1;

  -- 2) Fallback: nearest bimester in same year
  IF v_bim IS NULL THEN
    SELECT b.number
      INTO v_bim
    FROM public.academic_bimesters b
    JOIN public.academic_calendars c ON c.id = b.calendar_id
    WHERE c.organization_id = p_org_id
      AND c.status = 'ACTIVE'
      AND c.academic_year = p_year
    ORDER BY LEAST(
      ABS(b.start_date - v_month_start),
      ABS(b.end_date   - v_month_start)
    )
    LIMIT 1;
  END IF;

  IF v_bim IS NULL THEN RETURN NULL; END IF;
  IF v_bim IN (1,2) THEN RETURN 'FIRST'; END IF;
  IF v_bim IN (3,4) THEN RETURN 'SECOND'; END IF;
  RETURN NULL;
END;
$$;

-- Update active-grade guard to consider semester (CLASS only)
CREATE OR REPLACE FUNCTION public.professor_has_active_grade(p_org_id uuid, p_professor_id uuid, p_year integer, p_month integer)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_semester text := public.get_semester_for_month(p_org_id, p_year, p_month);
  v_start date := make_date(p_year, p_month, 1);
  v_end   date := (make_date(p_year, p_month, 1) + interval '1 month')::date - 1;
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.annual_class_occurrences occ
    JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
    LEFT JOIN public.subjects s ON s.id = wtm.subject_id
    WHERE occ.organization_id = p_org_id
      AND wtm.professor_id = p_professor_id
      AND wtm.status = 'ACTIVE'
      AND wtm.schedule_type = 'CLASS'
      AND occ.occurrence_date BETWEEN v_start AND v_end
      AND (
        v_semester IS NULL
        OR s.semester IS NULL
        OR s.semester::text = 'ANNUAL'
        OR s.semester::text = v_semester
      )
  );
END;
$$;

-- Update sheet generator to filter CLASS by semester and align PLANNING to schools with CLASS in the semester
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_sheet(p_org_id uuid, p_professor_id uuid, p_year integer, p_month integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sheet_id uuid;
  v_status text;
  v_start_date date;
  v_end_date date;
  v_semester text;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month')::date - 1;
  v_semester := public.get_semester_for_month(p_org_id, p_year, p_month);

  -- GUARDA: bloqueia geração se professor não tem grade ativa no mês para o semestre
  IF NOT public.professor_has_active_grade(p_org_id, p_professor_id, p_year, p_month) THEN
    RAISE EXCEPTION 'no_active_schedule' USING HINT = 'Professor sem grade horária ativa neste mês/semestre';
  END IF;

  INSERT INTO public.teacher_attendance_monthly_sheets (organization_id, professor_id, reference_year, reference_month, status)
  VALUES (p_org_id, p_professor_id, p_year, p_month, 'generated')
  ON CONFLICT (organization_id, professor_id, reference_year, reference_month) DO UPDATE
    SET updated_at = now()
  RETURNING id, status INTO v_sheet_id, v_status;

  IF v_status IN ('closed','approved_by_rh') THEN
    RETURN v_sheet_id;
  END IF;

  -- CLASS: respeita semestre da disciplina (NULL/ANNUAL entram sempre)
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
  LEFT JOIN public.subjects s ON s.id = wtm.subject_id
  WHERE occ.organization_id = p_org_id
    AND wtm.professor_id = p_professor_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
    AND (
      v_semester IS NULL
      OR s.semester IS NULL
      OR s.semester::text = 'ANNUAL'
      OR s.semester::text = v_semester
    )
  ON CONFLICT (organization_id, professor_id, annual_class_occurrence_id) DO NOTHING;

  -- PLANNING: só inclui se o professor tem CLASS naquele semestre na mesma escola
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
    AND (
      v_semester IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.weekly_teaching_models wc
        LEFT JOIN public.subjects sc ON sc.id = wc.subject_id
        WHERE wc.organization_id = p_org_id
          AND wc.professor_id = p_professor_id
          AND wc.school_id = wtm.school_id
          AND wc.schedule_type = 'CLASS'
          AND wc.status = 'ACTIVE'
          AND (sc.semester IS NULL OR sc.semester::text = 'ANNUAL' OR sc.semester::text = v_semester)
      )
    )
  ON CONFLICT (organization_id, professor_id, annual_class_occurrence_id) DO NOTHING;

  PERFORM public.recompute_teacher_attendance_for_sheet(v_sheet_id);
  PERFORM public.recalc_teacher_attendance_sheet(v_sheet_id);

  RETURN v_sheet_id;
END;
$$;

-- Batch: filtra candidatos pelo semestre do mês e reporta 'out_of_semester'
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_monthly_sheets_batch(
  p_organization_id uuid, p_reference_year integer, p_reference_month integer,
  p_school_id uuid DEFAULT NULL::uuid, p_professor_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prof_id uuid;
  v_sheet_id uuid;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_out_of_semester int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_start_date date := make_date(p_reference_year, p_reference_month, 1);
  v_end_date date := (make_date(p_reference_year, p_reference_month, 1) + interval '1 month')::date - 1;
  v_semester text := public.get_semester_for_month(p_organization_id, p_reference_year, p_reference_month);
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
    LEFT JOIN public.subjects s ON s.id = wtm.subject_id
    WHERE occ.organization_id = p_organization_id
      AND occ.occurrence_date BETWEEN v_start_date AND v_end_date
      AND wtm.schedule_type = 'CLASS'
      AND wtm.status = 'ACTIVE'
      AND wtm.professor_id IS NOT NULL
      AND (p_school_id IS NULL OR wtm.school_id = p_school_id)
      AND (p_professor_ids IS NULL OR wtm.professor_id = ANY(p_professor_ids))
      AND (
        v_semester IS NULL
        OR s.semester IS NULL
        OR s.semester::text = 'ANNUAL'
        OR s.semester::text = v_semester
      )
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
      IF SQLERRM = 'no_active_schedule' THEN
        v_out_of_semester := v_out_of_semester + 1;
      ELSE
        v_errors := v_errors || jsonb_build_object('professor_id', v_prof_id, 'error', SQLERRM);
      END IF;
    END;
  END LOOP;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, actor_user_id, action, new_values)
  VALUES (p_organization_id, v_uid, 'generate_sheets_batch',
    jsonb_build_object('year', p_reference_year, 'month', p_reference_month,
      'semester', v_semester,
      'school_id', p_school_id, 'professor_ids', p_professor_ids,
      'created', v_created, 'updated', v_updated, 'skipped', v_skipped,
      'out_of_semester', v_out_of_semester,
      'errors_count', jsonb_array_length(v_errors)));

  RETURN jsonb_build_object('ok', true, 'created', v_created, 'updated', v_updated,
    'skipped', v_skipped, 'out_of_semester', v_out_of_semester,
    'semester', v_semester, 'errors', v_errors);
END;
$$;
