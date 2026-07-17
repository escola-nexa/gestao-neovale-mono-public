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
    SELECT e.scheduled_date AS day,
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
     GROUP BY e.scheduled_date
  ) t;

  RETURN jsonb_build_object('ok', true, 'series', v_series);
END;
$$;