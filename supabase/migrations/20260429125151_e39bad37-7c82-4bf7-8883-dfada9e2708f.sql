-- Função SECURITY DEFINER para excluir escola em cascata controlada
CREATE OR REPLACE FUNCTION public.delete_school_cascade(
  p_school_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_user_name text;
  v_school record;
  v_org_id uuid;
  v_grades_count int;
  v_attendance_count int;
  v_counts jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Motivo da exclusão é obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;

  -- Apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir escolas.' USING ERRCODE = '42501';
  END IF;

  -- Carrega escola
  SELECT * INTO v_school FROM public.schools WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escola não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  v_org_id := v_school.organization_id;

  -- Bloqueio: notas lançadas
  SELECT count(*) INTO v_grades_count
  FROM public.student_grades sg
  WHERE sg.student_id IN (
    SELECT e.student_id FROM public.enrollments e WHERE e.school_id = p_school_id
  );

  -- Bloqueio: frequência registrada
  SELECT count(*) INTO v_attendance_count
  FROM public.attendance_records ar
  WHERE ar.class_group_id IN (
    SELECT cg.id FROM public.class_groups cg WHERE cg.school_id = p_school_id
  );

  IF v_grades_count > 0 OR v_attendance_count > 0 THEN
    RAISE EXCEPTION
      'Não é possível excluir a escola: existem % nota(s) e % registro(s) de frequência vinculados.',
      v_grades_count, v_attendance_count
      USING ERRCODE = '23503';
  END IF;

  -- Captura dados do executor para auditoria
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT raw_user_meta_data->>'nome_completo' INTO v_user_name FROM auth.users WHERE id = v_user_id;

  -- Cascade manual nas FKs sem ON DELETE CASCADE
  DELETE FROM public.orientations WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('orientations', v_n);

  DELETE FROM public.tickets WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('tickets', v_n);

  DELETE FROM public.pre_plannings WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('pre_plannings', v_n);

  DELETE FROM public.teacher_plannings WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('teacher_plannings', v_n);

  DELETE FROM public.school_time_slots WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('school_time_slots', v_n);

  DELETE FROM public.grade_configurations WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('grade_configurations', v_n);

  DELETE FROM public.booklet_delivery_schools WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('booklet_delivery_schools', v_n);

  DELETE FROM public.school_visit_schools WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('school_visit_schools', v_n);

  DELETE FROM public.import_batches WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('import_batches', v_n);

  DELETE FROM public.external_access_logs WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('external_access_logs', v_n);

  DELETE FROM public.external_links WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('external_links', v_n);

  -- Demais (course_schools, class_groups, enrollments, professor_school_courses,
  -- weekly_teaching_models) já têm ON DELETE CASCADE.
  -- chat_channels e audit_events têm ON DELETE SET NULL.

  -- Por fim: a escola
  DELETE FROM public.schools WHERE id = p_school_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('schools', v_n);

  -- Registra auditoria (school_id fica NULL pois a escola já foi removida)
  INSERT INTO public.audit_events (
    organization_id, user_id, user_email, user_name, user_role,
    school_id, module, action, action_result, details
  ) VALUES (
    v_org_id, v_user_id, v_user_email, v_user_name, 'admin',
    NULL, 'escolas', 'delete_cascade', 'success',
    jsonb_build_object(
      'school_id', p_school_id,
      'school_nome', v_school.nome,
      'school_codigo', v_school.codigo,
      'reason', p_reason,
      'cascade_counts', v_counts
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'school_id', p_school_id,
    'school_nome', v_school.nome,
    'cascade_counts', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_school_cascade(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_school_cascade(uuid, text) TO authenticated;