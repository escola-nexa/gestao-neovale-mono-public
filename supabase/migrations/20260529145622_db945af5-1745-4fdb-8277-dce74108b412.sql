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
      SELECT id INTO v_sheet_id
      FROM public.teacher_attendance_monthly_sheets
      WHERE organization_id = p_organization_id AND professor_id = v_prof_id
        AND reference_year = p_reference_year AND reference_month = p_reference_month;
      v_existed := v_sheet_id IS NOT NULL;

      IF v_existed THEN
        -- Política: folha do professor é gerada UMA única vez no lote.
        -- Reprocessar o lote pula quem já tem folha (qualquer status).
        -- Para regenerar individualmente, usar "Gerar folha do professor filtrado" ou "Recalcular".
        v_skipped := v_skipped + 1;
      ELSE
        v_sheet_id := public.generate_teacher_attendance_sheet(p_organization_id, v_prof_id, p_reference_year, p_reference_month);
        PERFORM public.recalculate_teacher_attendance_monthly_sheet(v_sheet_id);
        v_created := v_created + 1;
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