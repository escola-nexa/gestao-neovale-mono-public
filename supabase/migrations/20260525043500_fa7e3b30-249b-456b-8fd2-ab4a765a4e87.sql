
CREATE OR REPLACE FUNCTION public.create_teacher_substitution_request(
  p_organization_id uuid,
  p_substituted_professor_id uuid,
  p_substituted_professor_data jsonb,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_subject_id uuid,
  p_absence_reason text,
  p_absence_date date,
  p_total_class_hours numeric,
  p_hour_class_value numeric,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
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
BEGIN
  PERFORM public._tsr_assert_manager(v_user, p_organization_id);
  v_role := public._tsr_user_role(v_user);

  IF p_total_class_hours IS NULL OR p_total_class_hours < 0 THEN
    RAISE EXCEPTION 'total_class_hours inválido';
  END IF;
  IF p_hour_class_value IS NOT NULL AND p_hour_class_value < 0 THEN
    RAISE EXCEPTION 'hour_class_value inválido';
  END IF;

  IF p_hour_class_value IS NULL THEN
    SELECT default_hour_class_value INTO v_default_value
      FROM public.teacher_substitution_settings WHERE organization_id = p_organization_id;
    v_hour_value := COALESCE(v_default_value, 0);
  ELSE
    v_hour_value := p_hour_class_value;
  END IF;

  IF p_substituted_professor_id IS NOT NULL THEN
    SELECT full_name, cpf INTO v_prof_name, v_prof_cpf
      FROM public.professors WHERE id = p_substituted_professor_id;
  END IF;
  v_prof_name := COALESCE(p_substituted_professor_data->>'name', v_prof_name, 'Professor não identificado');
  v_prof_cpf  := COALESCE(p_substituted_professor_data->>'cpf', v_prof_cpf);

  SELECT nome INTO v_school_name  FROM public.schools     WHERE id = p_school_id;
  SELECT nome INTO v_course_name  FROM public.courses     WHERE id = p_course_id;
  SELECT nome INTO v_class_name   FROM public.class_groups WHERE id = p_class_group_id;
  SELECT nome INTO v_subject_name FROM public.subjects    WHERE id = p_subject_id;

  INSERT INTO public.teacher_substitution_requests (
    organization_id, status, payment_status, documentation_status, workflow_phase,
    requested_by, requested_by_role, source_type,
    substituted_professor_id, substituted_professor_name,
    substituted_professor_cpf, substituted_professor_rg, substituted_professor_registration,
    school_id, course_id, class_group_id, subject_id,
    school_name_snapshot, course_name_snapshot, class_group_name_snapshot, subject_name_snapshot,
    absence_reason, absence_date,
    total_class_hours, hour_class_value,
    notes
  ) VALUES (
    p_organization_id, 'request_created', 'pending_calculation', 'pending_upload', 'phase_1_demand_routing',
    v_user, v_role, COALESCE(p_context->>'source_type', 'manual'),
    p_substituted_professor_id, v_prof_name,
    v_prof_cpf, p_substituted_professor_data->>'rg', p_substituted_professor_data->>'registration',
    p_school_id, p_course_id, p_class_group_id, p_subject_id,
    v_school_name, v_course_name, v_class_name, v_subject_name,
    p_absence_reason, p_absence_date,
    p_total_class_hours, v_hour_value,
    p_context->>'notes'
  ) RETURNING id INTO v_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (p_organization_id, v_id, v_user, v_role, 'substitution_created',
          jsonb_build_object('total_class_hours', p_total_class_hours, 'hour_class_value', v_hour_value));

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.suggest_teacher_substitution_candidate(
  p_substitution_request_id uuid,
  p_professor_id uuid,
  p_candidate_data jsonb,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_candidate_id uuid;
  v_name text;
  v_cpf text;
  v_phone text;
  v_source text;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  IF p_professor_id IS NOT NULL THEN
    v_source := 'internal';
    SELECT full_name, cpf, phone INTO v_name, v_cpf, v_phone
      FROM public.professors WHERE id = p_professor_id;
  ELSE
    v_source := 'external';
  END IF;

  v_name  := COALESCE(p_candidate_data->>'name',  v_name);
  v_cpf   := COALESCE(p_candidate_data->>'cpf',   v_cpf);
  v_phone := COALESCE(p_candidate_data->>'phone', v_phone);

  IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do candidato é obrigatório';
  END IF;

  INSERT INTO public.teacher_substitution_candidates (
    organization_id, substitution_request_id, professor_id,
    candidate_name, candidate_cpf, candidate_rg, candidate_phone, candidate_email,
    source, suggested_by, confirmation_status, notes
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, p_professor_id,
    v_name, v_cpf, p_candidate_data->>'rg', v_phone, p_candidate_data->>'email',
    v_source, v_user, 'suggested', p_notes
  ) RETURNING id INTO v_candidate_id;

  UPDATE public.teacher_substitution_requests
     SET status = CASE WHEN status IN ('cancelled','substitute_confirmed','in_execution',
                                       'execution_completed','approved_for_payment','payment_completed')
                       THEN status ELSE 'substitute_suggested' END,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  IF p_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Você foi indicado para substituição',
           format('Substituição %s — %s — %s', v_req.substitution_code,
                  COALESCE(v_req.school_name_snapshot, '-'),
                  to_char(v_req.absence_date, 'DD/MM/YYYY')),
           'SUBSTITUTION_CANDIDATE_SUGGESTED', p_substitution_request_id
      FROM public.professors p
     WHERE p.id = p_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'candidate_suggested',
          jsonb_build_object('candidate_id', v_candidate_id, 'professor_id', p_professor_id, 'source', v_source));

  RETURN v_candidate_id;
END; $$;
