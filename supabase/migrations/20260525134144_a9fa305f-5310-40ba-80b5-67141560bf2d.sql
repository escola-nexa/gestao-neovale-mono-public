CREATE OR REPLACE FUNCTION public.create_teacher_substitution_request(p_organization_id uuid, p_substituted_professor_id uuid, p_substituted_professor_data jsonb, p_school_id uuid, p_course_id uuid, p_class_group_id uuid, p_subject_id uuid, p_absence_reason text, p_absence_date date, p_total_class_hours numeric, p_hour_class_value numeric, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_id uuid;
  v_hour_value numeric;
  v_default_value numeric;
  v_prof_name text;
  v_prof_cpf text;
  v_school_name text;
  v_course_name text;
  v_class_name text;
  v_subject_name text;
  v_bank_data jsonb;
BEGIN
  PERFORM public._tsr_assert_manager(v_user, p_organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF p_total_class_hours IS NULL OR p_total_class_hours <= 0 THEN
    RAISE EXCEPTION 'total_class_hours inválido';
  END IF;
  IF p_hour_class_value IS NOT NULL AND p_hour_class_value < 0 THEN
    RAISE EXCEPTION 'hour_class_value inválido';
  END IF;

  SELECT default_hour_class_value INTO v_default_value
  FROM public.teacher_substitution_settings
  WHERE organization_id = p_organization_id;
  v_hour_value := COALESCE(p_hour_class_value, v_default_value, 0);

  IF p_substituted_professor_id IS NOT NULL THEN
    SELECT full_name, cpf INTO v_prof_name, v_prof_cpf
    FROM public.professors
    WHERE id = p_substituted_professor_id;
  END IF;

  v_prof_name := COALESCE(NULLIF(p_substituted_professor_data->>'name', ''), v_prof_name, 'Professor não identificado');
  v_prof_cpf := COALESCE(NULLIF(p_substituted_professor_data->>'cpf', ''), v_prof_cpf);

  SELECT nome INTO v_school_name FROM public.schools WHERE id = p_school_id;
  SELECT nome INTO v_course_name FROM public.courses WHERE id = p_course_id;
  SELECT nome INTO v_class_name FROM public.class_groups WHERE id = p_class_group_id;
  SELECT nome INTO v_subject_name FROM public.subjects WHERE id = p_subject_id;

  v_bank_data := CASE
    WHEN p_context ? 'bank_data' THEN jsonb_build_object('raw', NULLIF(p_context->>'bank_data', ''))
    ELSE '{}'::jsonb
  END;

  INSERT INTO public.teacher_substitution_requests (
    organization_id, status, payment_status, documentation_status, workflow_phase,
    requested_by, requested_by_role, source_type,
    substituted_professor_id, substituted_professor_name,
    substituted_professor_cpf, substituted_professor_rg, substituted_professor_registration,
    substitute_professor_name, substitute_professor_cpf, substitute_professor_rg,
    school_id, course_id, class_group_id, subject_id,
    school_name_snapshot, course_name_snapshot, class_group_name_snapshot, subject_name_snapshot,
    municipality, state, absence_reason, absence_date,
    total_class_hours, hour_class_value,
    payment_method, bank_data,
    director_name, adjunct_director_name, coordinator_name, performed_by_name,
    notes
  ) VALUES (
    p_organization_id, 'request_created', 'pending_calculation', 'pending_upload', 'phase_1_demand_routing',
    v_profile_id, v_role, COALESCE(p_context->>'source_type', 'manual'),
    p_substituted_professor_id, v_prof_name,
    v_prof_cpf, NULLIF(p_substituted_professor_data->>'rg', ''), NULLIF(p_substituted_professor_data->>'registration', ''),
    NULLIF(p_context #>> '{substitute_data,name}', ''),
    NULLIF(p_context #>> '{substitute_data,cpf}', ''),
    NULLIF(p_context #>> '{substitute_data,rg}', ''),
    p_school_id, p_course_id, p_class_group_id, p_subject_id,
    v_school_name, v_course_name, v_class_name, v_subject_name,
    NULLIF(p_context->>'municipality', ''), NULLIF(p_context->>'state', ''), p_absence_reason, p_absence_date,
    p_total_class_hours, v_hour_value,
    NULLIF(p_context->>'payment_method', ''), v_bank_data,
    NULLIF(p_context->>'director_name', ''), NULLIF(p_context->>'adjunct_director_name', ''),
    NULLIF(p_context->>'coordinator_name', ''), NULLIF(p_context->>'performed_by_name', ''),
    NULLIF(p_context->>'notes', '')
  ) RETURNING id INTO v_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (p_organization_id, v_id, v_profile_id, v_role, 'substitution_created',
          jsonb_build_object('absence_date', p_absence_date, 'hours', p_total_class_hours, 'context', p_context));

  RETURN v_id;
END;
$function$;