
-- 1) Helper: professor tem grade ativa no mês?
CREATE OR REPLACE FUNCTION public.professor_has_active_grade(
  p_org_id uuid, p_professor_id uuid, p_year int, p_month int
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.annual_class_occurrences occ
    JOIN public.weekly_teaching_models wtm ON wtm.id = occ.weekly_model_id
    WHERE occ.organization_id = p_org_id
      AND wtm.professor_id = p_professor_id
      AND wtm.status = 'ACTIVE'
      AND wtm.schedule_type IN ('CLASS','PLANNING')
      AND occ.occurrence_date BETWEEN make_date(p_year, p_month, 1)
        AND (make_date(p_year, p_month, 1) + interval '1 month')::date - 1
  );
$$;

-- 2) Guarda em generate_teacher_attendance_sheet (mantém o resto idêntico)
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_sheet(p_org_id uuid, p_professor_id uuid, p_year integer, p_month integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sheet_id uuid;
  v_status text;
  v_start_date date;
  v_end_date date;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month')::date - 1;

  -- GUARDA: bloqueia geração se professor não tem grade ativa no mês
  IF NOT public.professor_has_active_grade(p_org_id, p_professor_id, p_year, p_month) THEN
    RAISE EXCEPTION 'no_active_schedule' USING HINT = 'Professor sem grade horária ativa neste mês';
  END IF;

  INSERT INTO public.teacher_attendance_monthly_sheets (organization_id, professor_id, reference_year, reference_month, status)
  VALUES (p_org_id, p_professor_id, p_year, p_month, 'generated')
  ON CONFLICT (organization_id, professor_id, reference_year, reference_month) DO UPDATE
    SET updated_at = now()
  RETURNING id, status INTO v_sheet_id, v_status;

  IF v_status IN ('closed','approved_by_rh') THEN
    RETURN v_sheet_id;
  END IF;

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
$function$;

-- 3) Breakdown por escola
CREATE OR REPLACE FUNCTION public.get_teacher_attendance_sheet_school_breakdown(p_sheet_id uuid)
RETURNS TABLE (
  school_id uuid,
  school_name text,
  total_entries int,
  class_entries int,
  planning_entries int,
  present_entries int,
  late_entries int,
  absent_entries int,
  pending_entries int,
  divergent_entries int,
  expected_class_minutes int,
  confirmed_class_minutes int,
  expected_planning_minutes int,
  confirmed_planning_minutes int,
  expected_total_minutes int,
  confirmed_total_minutes int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    e.school_id,
    s.nome AS school_name,
    COUNT(*)::int AS total_entries,
    COUNT(*) FILTER (WHERE e.slot_type = 'CLASS')::int AS class_entries,
    COUNT(*) FILTER (WHERE e.slot_type = 'PLANNING')::int AS planning_entries,
    COUNT(*) FILTER (WHERE e.final_status IN ('present','present_with_delay','planning_auto'))::int AS present_entries,
    COUNT(*) FILTER (WHERE e.late_minutes > 0)::int AS late_entries,
    COUNT(*) FILTER (WHERE e.final_status IN ('absent','justified_absence'))::int AS absent_entries,
    COUNT(*) FILTER (WHERE e.final_status = 'pending')::int AS pending_entries,
    COUNT(*) FILTER (WHERE e.divergence_reason IS NOT NULL)::int AS divergent_entries,
    COALESCE(SUM(e.workload_minutes) FILTER (WHERE e.slot_type = 'CLASS'), 0)::int AS expected_class_minutes,
    COALESCE(SUM(e.confirmed_workload_minutes) FILTER (WHERE e.slot_type = 'CLASS'), 0)::int AS confirmed_class_minutes,
    COALESCE(SUM(e.workload_minutes) FILTER (WHERE e.slot_type = 'PLANNING'), 0)::int AS expected_planning_minutes,
    COALESCE(SUM(e.confirmed_workload_minutes) FILTER (WHERE e.slot_type = 'PLANNING'), 0)::int AS confirmed_planning_minutes,
    COALESCE(SUM(e.workload_minutes), 0)::int AS expected_total_minutes,
    COALESCE(SUM(e.confirmed_workload_minutes), 0)::int AS confirmed_total_minutes
  FROM public.teacher_attendance_entries e
  LEFT JOIN public.schools s ON s.id = e.school_id
  WHERE e.monthly_sheet_id = p_sheet_id
  GROUP BY e.school_id, s.nome
  ORDER BY s.nome NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.professor_has_active_grade(uuid, uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_attendance_sheet_school_breakdown(uuid) TO authenticated;
