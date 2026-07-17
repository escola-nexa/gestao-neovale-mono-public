-- 1) Recreate BI report with enriched by_professor
CREATE OR REPLACE FUNCTION public.get_teacher_attendance_bi_report(
  p_organization_id uuid,
  p_reference_year int,
  p_reference_month int,
  p_school_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_professor_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_kpis jsonb;
  v_by_school jsonb;
  v_by_prof jsonb;
  v_by_subject jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT has_organization_access(v_uid, p_organization_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  WITH s AS (
    SELECT s.*
      FROM teacher_attendance_monthly_sheets s
     WHERE s.organization_id = p_organization_id
       AND s.reference_year = p_reference_year
       AND s.reference_month = p_reference_month
       AND (p_professor_id IS NULL OR s.professor_id = p_professor_id)
       AND (p_status IS NULL OR s.status = p_status)
  ),
  e AS (
    SELECT te.*
      FROM teacher_attendance_entries te
      JOIN s ON s.id = te.monthly_sheet_id
     WHERE (p_school_id IS NULL OR te.school_id = p_school_id)
       AND (p_course_id IS NULL OR te.course_id = p_course_id)
       AND (p_subject_id IS NULL OR te.subject_id = p_subject_id)
  )
  SELECT jsonb_build_object(
    'sheets_total', (SELECT count(*) FROM s),
    'sheets_closed', (SELECT count(*) FROM s WHERE status IN ('closed','approved_by_rh')),
    'sheets_with_pending', (SELECT count(*) FROM s WHERE status = 'with_pending_items' OR total_pending_entries > 0),
    'entries_total', (SELECT count(*) FROM e),
    'entries_present', (SELECT count(*) FROM e WHERE final_status IN ('present','present_with_delay')),
    'entries_late', (SELECT count(*) FROM e WHERE final_status = 'present_with_delay'),
    'entries_absent', (SELECT count(*) FROM e WHERE final_status IN ('absent','justified_absence')),
    'entries_divergent', (SELECT count(*) FROM e WHERE final_status = 'manual_review_required'),
    'expected_workload_minutes', (SELECT COALESCE(sum(workload_minutes),0) FROM e),
    'confirmed_workload_minutes', (SELECT COALESCE(sum(confirmed_workload_minutes),0) FROM e),
    'absent_workload_minutes', (SELECT COALESCE(sum(workload_minutes) FILTER (WHERE final_status IN ('absent','justified_absence')),0) FROM e),
    'late_minutes_total', (SELECT COALESCE(sum(late_minutes),0) FROM e),
    'presence_percent', CASE WHEN (SELECT count(*) FROM e) > 0
                             THEN round(100.0 * (SELECT count(*) FROM e WHERE final_status IN ('present','present_with_delay'))::numeric / (SELECT count(*) FROM e), 1)
                             ELSE 0 END
  ) INTO v_kpis;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_school FROM (
    SELECT sc.id AS school_id, sc.nome AS school_name,
           count(*) AS entries,
           count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay')) AS present,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent,
           COALESCE(sum(e.workload_minutes),0) AS expected_min,
           COALESCE(sum(e.confirmed_workload_minutes),0) AS confirmed_min
      FROM teacher_attendance_entries e
      JOIN schools sc ON sc.id = e.school_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
       AND (p_status IS NULL OR sh.status = p_status)
     GROUP BY sc.id, sc.nome
     ORDER BY sc.nome
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_prof FROM (
    SELECT pr.id AS professor_id,
           pr.full_name AS professor_name,
           count(*) AS entries,
           count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay')) AS present,
           count(*) FILTER (WHERE e.final_status = 'present_with_delay') AS late,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent,
           count(*) FILTER (WHERE e.final_status = 'manual_review_required') AS divergent,
           COALESCE(sum(e.workload_minutes),0) AS expected_min,
           COALESCE(sum(e.confirmed_workload_minutes),0) AS confirmed_min,
           COALESCE(sum(e.late_minutes),0) AS late_minutes,
           count(DISTINCT e.school_id) AS schools_count,
           CASE WHEN count(*) > 0
                THEN round(100.0 * count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay'))::numeric / count(*), 1)
                ELSE 0 END AS presence_percent
      FROM teacher_attendance_entries e
      JOIN professors pr ON pr.id = e.professor_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
       AND (p_status IS NULL OR sh.status = p_status)
     GROUP BY pr.id, pr.full_name
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_subject FROM (
    SELECT sub.id AS subject_id, sub.nome AS subject_name,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent_count,
           count(*) AS total
      FROM teacher_attendance_entries e
      LEFT JOIN subjects sub ON sub.id = e.subject_id
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
     GROUP BY sub.id, sub.nome
     ORDER BY absent_count DESC NULLS LAST
     LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'ok', true,
    'kpis', v_kpis,
    'by_school', v_by_school,
    'by_professor', v_by_prof,
    'by_subject_absent', v_by_subject
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_teacher_attendance_bi_report(uuid,int,int,uuid,uuid,uuid,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_teacher_attendance_bi_report(uuid,int,int,uuid,uuid,uuid,uuid,text) TO authenticated;

-- 2) Daily series RPC for trend chart
CREATE OR REPLACE FUNCTION public.get_teacher_attendance_daily_series(
  p_organization_id uuid,
  p_reference_year int,
  p_reference_month int,
  p_school_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_professor_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_series jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT has_organization_access(v_uid, p_organization_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day), '[]'::jsonb) INTO v_series FROM (
    SELECT e.entry_date AS day,
           count(*) AS entries,
           count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay')) AS present,
           count(*) FILTER (WHERE e.final_status IN ('absent','justified_absence')) AS absent,
           count(*) FILTER (WHERE e.final_status = 'manual_review_required') AS divergent,
           COALESCE(sum(e.workload_minutes),0) AS expected_min,
           COALESCE(sum(e.confirmed_workload_minutes),0) AS confirmed_min,
           CASE WHEN count(*) > 0
                THEN round(100.0 * count(*) FILTER (WHERE e.final_status IN ('present','present_with_delay'))::numeric / count(*), 1)
                ELSE 0 END AS presence_percent
      FROM teacher_attendance_entries e
      JOIN teacher_attendance_monthly_sheets sh ON sh.id = e.monthly_sheet_id
     WHERE sh.organization_id = p_organization_id
       AND sh.reference_year = p_reference_year
       AND sh.reference_month = p_reference_month
       AND (p_school_id IS NULL OR e.school_id = p_school_id)
       AND (p_course_id IS NULL OR e.course_id = p_course_id)
       AND (p_subject_id IS NULL OR e.subject_id = p_subject_id)
       AND (p_professor_id IS NULL OR e.professor_id = p_professor_id)
       AND (p_status IS NULL OR sh.status = p_status)
     GROUP BY e.entry_date
  ) t;

  RETURN jsonb_build_object('ok', true, 'series', v_series);
END;
$$;
REVOKE ALL ON FUNCTION public.get_teacher_attendance_daily_series(uuid,int,int,uuid,uuid,uuid,uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_teacher_attendance_daily_series(uuid,int,int,uuid,uuid,uuid,uuid,text) TO authenticated;