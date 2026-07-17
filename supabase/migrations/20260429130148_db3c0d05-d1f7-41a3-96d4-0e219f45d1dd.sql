
CREATE OR REPLACE FUNCTION public.delete_school_cascade(p_school_id uuid, p_reason text, p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_school_name text;
  v_closed_grades int := 0;
  v_counts jsonb := '{}'::jsonb;
  v_c int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir escolas';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'É necessário informar um motivo (mínimo 5 caracteres) para a exclusão';
  END IF;

  SELECT organization_id, nome INTO v_org_id, v_school_name
  FROM public.schools WHERE id = p_school_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Escola não encontrada';
  END IF;

  -- Block ONLY if there are CLOSED grade configurations (notas fechadas)
  -- Attendance and open grades no longer block
  SELECT COUNT(*) INTO v_closed_grades
  FROM public.grade_configurations gc
  WHERE gc.school_id = p_school_id AND gc.status = 'CLOSED';

  IF v_closed_grades > 0 AND NOT p_force THEN
    RAISE EXCEPTION 'Não é possível excluir: existem % configuração(ões) de notas FECHADAS. Use force=true para sobrescrever.', v_closed_grades;
  END IF;

  -- Cascade deletes (manual, ordered)
  DELETE FROM public.student_grades sg
   USING public.grade_activities ga, public.grade_configurations gc
   WHERE sg.grade_activity_id = ga.id AND ga.grade_config_id = gc.id AND gc.school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('student_grades', v_c);

  DELETE FROM public.grade_activities ga
   USING public.grade_configurations gc
   WHERE ga.grade_config_id = gc.id AND gc.school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grade_activities', v_c);

  DELETE FROM public.grade_configurations WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grade_configurations', v_c);

  DELETE FROM public.attendance_records ar
   USING public.class_groups cg
   WHERE ar.class_group_id = cg.id AND cg.school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('attendance_records', v_c);

  DELETE FROM public.orientations WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('orientations', v_c);

  DELETE FROM public.tickets WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('tickets', v_c);

  DELETE FROM public.teacher_plannings WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('teacher_plannings', v_c);

  DELETE FROM public.pre_plannings WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('pre_plannings', v_c);

  DELETE FROM public.annual_class_occurrences aco
   USING public.weekly_teaching_models wtm
   WHERE aco.weekly_model_id = wtm.id AND wtm.school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('annual_class_occurrences', v_c);

  DELETE FROM public.weekly_teaching_models WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('weekly_teaching_models', v_c);

  DELETE FROM public.enrollments WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_c);

  DELETE FROM public.class_groups WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('class_groups', v_c);

  DELETE FROM public.professor_school_courses WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('professor_school_courses', v_c);

  DELETE FROM public.school_time_slots WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_counts := v_counts || jsonb_build_object('school_time_slots', v_c);

  DELETE FROM public.schools WHERE id = p_school_id;

  -- Audit
  INSERT INTO public.audit_events (organization_id, user_id, module, action, action_result, details, school_id)
  VALUES (v_org_id, v_user_id, 'escolas', 'delete_cascade', 'success',
    jsonb_build_object('school_name', v_school_name, 'reason', p_reason, 'force', p_force,
      'closed_grades_overridden', v_closed_grades, 'counts', v_counts),
    NULL);

  RETURN jsonb_build_object('success', true, 'school_name', v_school_name, 'counts', v_counts);
END;
$function$;
