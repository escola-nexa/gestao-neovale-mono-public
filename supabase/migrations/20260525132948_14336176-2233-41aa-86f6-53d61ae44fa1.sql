-- Helper canônico para converter auth.users.id em profiles.id nos campos que possuem FK para profiles(id)
CREATE OR REPLACE FUNCTION public._tsr_profile_id(_user uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado não encontrado' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = _user
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado' USING ERRCODE = '23503';
  END IF;

  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._tsr_profile_id(uuid) TO authenticated;

-- Permite todos os eventos de auditoria que o próprio módulo já registra.
ALTER TABLE public.teacher_substitution_audit_logs
DROP CONSTRAINT IF EXISTS chk_tsa_action;

ALTER TABLE public.teacher_substitution_audit_logs
ADD CONSTRAINT chk_tsa_action CHECK (action IN (
  'substitution_created',
  'ticket_created',
  'channel_notified',
  'routed_to_channel',
  'candidate_suggested',
  'substitute_confirmed',
  'execution_confirmed',
  'declaration_generated',
  'receipt_generated',
  'document_uploaded',
  'signed_report_uploaded',
  'payment_calculated',
  'payment_approved',
  'approved_for_payment',
  'payment_scheduled',
  'payment_completed',
  'returned_for_correction',
  'status_changed',
  'cancelled',
  'substitution_cancelled',
  'substitution_reopened',
  'settings_changed',
  'financial_access_granted',
  'financial_access_revoked',
  'financial_details_viewed'
));

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    total_class_hours, hour_class_value, total_amount,
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
    p_total_class_hours, v_hour_value, p_total_class_hours * v_hour_value,
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
$$;

CREATE OR REPLACE FUNCTION public.create_teacher_substitution_ticket(p_substitution_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_cat_id uuid;
  v_ticket_id uuid;
  v_title text;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.ticket_id IS NOT NULL THEN RETURN v_req.ticket_id; END IF;

  SELECT id INTO v_cat_id FROM public.ticket_categories
  WHERE organization_id = v_req.organization_id AND name = 'Substituição';

  IF v_cat_id IS NULL THEN
    INSERT INTO public.ticket_categories (organization_id, name, description, priority_default)
    VALUES (v_req.organization_id, 'Substituição', 'Solicitações de substituição de professores', 'alta')
    RETURNING id INTO v_cat_id;
  END IF;

  v_title := format('[%s] Substituição — %s — %s — %s',
    v_req.substitution_code, v_req.substituted_professor_name,
    COALESCE(v_req.school_name_snapshot, '-'), to_char(v_req.absence_date, 'DD/MM/YYYY'));

  INSERT INTO public.tickets (organization_id, title, description, category_id, school_id, status, priority, opened_by_id, type)
  VALUES (v_req.organization_id, v_title,
          format('Solicitação %s — Motivo: %s — Horas: %s', v_req.substitution_code, v_req.absence_reason, v_req.total_class_hours),
          v_cat_id, v_req.school_id, 'aberto', 'alta', v_user, 'escola'::ticket_type)
  RETURNING id INTO v_ticket_id;

  UPDATE public.teacher_substitution_requests
  SET ticket_id = v_ticket_id,
      status = 'ticket_created',
      updated_at = now()
  WHERE id = p_substitution_request_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'ticket_created', jsonb_build_object('ticket_id', v_ticket_id, 'category_id', v_cat_id));

  RETURN v_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.route_teacher_substitution_to_channel(p_substitution_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_channel_id uuid;
  v_channel_name text;
  v_msg text;
  v_msg_id uuid;
  rec record;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  SELECT COALESCE(substitution_channel_name, 'substituicao') INTO v_channel_name
  FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;
  v_channel_name := COALESCE(v_channel_name, 'substituicao');

  SELECT id INTO v_channel_id FROM public.chat_channels
  WHERE organization_id = v_req.organization_id AND name = v_channel_name AND archived_at IS NULL
  LIMIT 1;

  IF v_channel_id IS NULL THEN
    INSERT INTO public.chat_channels (organization_id, name, description, type, is_private, created_by)
    VALUES (v_req.organization_id, v_channel_name, 'Canal de substituições de professores', 'substituicao'::chat_channel_type, true, v_user)
    RETURNING id INTO v_channel_id;

    FOR rec IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur
      WHERE ur.organization_id = v_req.organization_id AND ur.role::text IN ('admin','coordenador','rh')
    LOOP
      INSERT INTO public.chat_channel_members (channel_id, user_id, role)
      VALUES (v_channel_id, rec.user_id, 'member'::chat_member_role)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  v_msg := format('🔔 Nova substituição %s — %s — %s — %s (%s horas-aula)',
    v_req.substitution_code, v_req.substituted_professor_name,
    COALESCE(v_req.school_name_snapshot, '-'), to_char(v_req.absence_date, 'DD/MM/YYYY'), v_req.total_class_hours);

  INSERT INTO public.chat_messages (channel_id, author_id, body)
  VALUES (v_channel_id, v_user, v_msg)
  RETURNING id INTO v_msg_id;

  UPDATE public.teacher_substitution_requests
  SET chat_channel_id = v_channel_id,
      status = CASE WHEN status IN ('request_created','ticket_created') THEN 'routed_to_channel' ELSE status END,
      updated_at = now()
  WHERE id = p_substitution_request_id;

  FOR rec IN SELECT user_id FROM public.chat_channel_members WHERE channel_id = v_channel_id AND user_id <> v_user LOOP
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (rec.user_id, 'Nova substituição', v_msg, 'SUBSTITUTION_ROUTED', p_substitution_request_id);
  END LOOP;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'routed_to_channel', jsonb_build_object('channel_id', v_channel_id, 'message_id', v_msg_id));

  RETURN v_channel_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.suggest_teacher_substitution_candidate(
  p_substitution_request_id uuid,
  p_professor_id uuid,
  p_candidate_data jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_candidate_id uuid;
  v_name text;
  v_cpf text;
  v_rg text;
  v_phone text;
  v_email text;
  v_source text;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  IF p_professor_id IS NOT NULL THEN
    v_source := 'internal';
    SELECT full_name, cpf, NULL::text, phone, email INTO v_name, v_cpf, v_rg, v_phone, v_email
    FROM public.professors WHERE id = p_professor_id;
  ELSE
    v_source := 'external';
  END IF;

  v_name := COALESCE(NULLIF(p_candidate_data->>'name', ''), v_name);
  v_cpf := COALESCE(NULLIF(p_candidate_data->>'cpf', ''), v_cpf);
  v_rg := COALESCE(NULLIF(p_candidate_data->>'rg', ''), v_rg);
  v_phone := COALESCE(NULLIF(p_candidate_data->>'phone', ''), v_phone);
  v_email := COALESCE(NULLIF(p_candidate_data->>'email', ''), v_email);

  IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do candidato é obrigatório';
  END IF;

  INSERT INTO public.teacher_substitution_candidates (
    organization_id, substitution_request_id, professor_id,
    candidate_name, candidate_cpf, candidate_rg, candidate_phone, candidate_email,
    source, suggested_by, confirmation_status, notes
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, p_professor_id,
    v_name, v_cpf, v_rg, v_phone, v_email,
    v_source, v_profile_id, 'suggested', p_notes
  ) RETURNING id INTO v_candidate_id;

  UPDATE public.teacher_substitution_requests
  SET status = CASE WHEN status IN ('cancelled','substitute_confirmed','in_execution','execution_completed','approved_for_payment','payment_completed') THEN status ELSE 'substitute_suggested' END,
      updated_at = now()
  WHERE id = p_substitution_request_id;

  IF p_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Você foi indicado para substituição',
           format('Substituição %s — %s — %s', v_req.substitution_code, COALESCE(v_req.school_name_snapshot, '-'), to_char(v_req.absence_date, 'DD/MM/YYYY')),
           'SUBSTITUTION_CANDIDATE_SUGGESTED', p_substitution_request_id
    FROM public.professors p WHERE p.id = p_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'candidate_suggested', jsonb_build_object('candidate_id', v_candidate_id, 'professor_id', p_professor_id, 'source', v_source));

  RETURN v_candidate_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_teacher_substitute(p_substitution_request_id uuid, p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_cand public.teacher_substitution_candidates%ROWTYPE;
  v_payment_id uuid;
  v_gross numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Não é possível confirmar substituto em solicitação cancelada'; END IF;

  SELECT * INTO v_cand FROM public.teacher_substitution_candidates
  WHERE id = p_candidate_id AND substitution_request_id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidato não encontrado para esta solicitação'; END IF;

  UPDATE public.teacher_substitution_candidates
  SET confirmation_status = 'rejected', updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id
    AND id <> p_candidate_id
    AND confirmation_status NOT IN ('rejected','cancelled');

  UPDATE public.teacher_substitution_candidates
  SET confirmation_status = 'confirmed', confirmed_by = v_profile_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_candidate_id;

  UPDATE public.teacher_substitution_requests
  SET substitute_professor_id = v_cand.professor_id,
      substitute_professor_name = v_cand.candidate_name,
      substitute_professor_cpf = v_cand.candidate_cpf,
      substitute_professor_rg = v_cand.candidate_rg,
      substitute_confirmed_by = v_profile_id,
      substitute_confirmed_at = now(),
      status = 'substitute_confirmed',
      payment_status = CASE WHEN total_class_hours > 0 AND hour_class_value > 0 THEN 'calculated' ELSE 'pending_calculation' END,
      updated_at = now()
  WHERE id = p_substitution_request_id;

  v_gross := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  SELECT id INTO v_payment_id FROM public.teacher_substitution_payments WHERE substitution_request_id = p_substitution_request_id;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.teacher_substitution_payments (
      organization_id, substitution_request_id, substitute_professor_id,
      payee_name, payee_cpf, payment_method, bank_data,
      total_class_hours, hour_class_value, gross_amount, discount_amount, net_amount,
      payment_status
    ) VALUES (
      v_req.organization_id, p_substitution_request_id, v_cand.professor_id,
      v_cand.candidate_name, v_cand.candidate_cpf, v_req.payment_method, COALESCE(v_req.bank_data,'{}'::jsonb),
      v_req.total_class_hours, v_req.hour_class_value, v_gross, 0, v_gross,
      CASE WHEN v_gross > 0 THEN 'calculated' ELSE 'pending_calculation' END
    ) RETURNING id INTO v_payment_id;
  ELSE
    UPDATE public.teacher_substitution_payments
    SET substitute_professor_id = v_cand.professor_id,
        payee_name = v_cand.candidate_name,
        payee_cpf = v_cand.candidate_cpf,
        total_class_hours = v_req.total_class_hours,
        hour_class_value = v_req.hour_class_value,
        gross_amount = v_gross,
        net_amount = v_gross - COALESCE(discount_amount, 0),
        payment_status = CASE WHEN v_gross > 0 THEN 'calculated' ELSE 'pending_calculation' END,
        updated_at = now()
    WHERE id = v_payment_id;
  END IF;

  IF v_cand.professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Substituição confirmada',
           format('Você foi confirmado como substituto na solicitação %s', v_req.substitution_code),
           'SUBSTITUTION_SUBSTITUTE_CONFIRMED', p_substitution_request_id
    FROM public.professors p WHERE p.id = v_cand.professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'substitute_confirmed', jsonb_build_object('candidate_id', p_candidate_id, 'professor_id', v_cand.professor_id, 'payment_id', v_payment_id, 'gross_amount', v_gross));

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_teacher_substitution_execution(p_substitution_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_total numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.substitute_professor_id IS NULL AND v_req.substitute_professor_name IS NULL THEN RAISE EXCEPTION 'Substituto não confirmado'; END IF;

  UPDATE public.teacher_substitution_occurrences
  SET execution_status = 'executed', updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id
    AND execution_status NOT IN ('executed','cancelled');

  SELECT COALESCE(SUM(class_hours),0) INTO v_total
  FROM public.teacher_substitution_occurrences
  WHERE substitution_request_id = p_substitution_request_id AND execution_status = 'executed';

  UPDATE public.teacher_substitution_requests
  SET status = 'execution_completed',
      workflow_phase = 'phase_2_execution_closure',
      total_class_hours = CASE WHEN v_total > 0 THEN v_total ELSE total_class_hours END,
      updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'pending_documentation', updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'execution_confirmed', jsonb_build_object('total_class_hours', v_total));
END;
$$;

CREATE OR REPLACE FUNCTION public._tsr_create_document(
  _request_id uuid, _type text, _status text,
  _file_url text, _storage_path text, _file_name text,
  _mime text, _size bigint, _notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_org uuid;
  v_id uuid;
BEGIN
  v_profile_id := public._tsr_profile_id(v_user);
  SELECT organization_id INTO v_org FROM public.teacher_substitution_requests WHERE id = _request_id;

  INSERT INTO public.teacher_substitution_documents
    (organization_id, substitution_request_id, document_type, document_status,
     file_url, storage_path, file_name, mime_type, file_size_bytes,
     generated_by, uploaded_by, notes)
  VALUES (v_org, _request_id, _type, _status,
          _file_url, _storage_path, _file_name, _mime, _size,
          v_profile_id, v_profile_id, _notes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_teacher_substitution_declaration(
  p_substitution_request_id uuid,
  p_file_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);
  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  v_id := public._tsr_create_document(p_substitution_request_id, 'declaration', 'generated',
    p_file_url, p_storage_path, COALESCE(p_file_name, 'declaracao_'||v_req.substitution_code||'.pdf'),
    'application/pdf', NULL, NULL);

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'declaration_generated', jsonb_build_object('document_id', v_id));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_teacher_substitution_receipt(
  p_substitution_request_id uuid,
  p_file_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_id uuid;
  v_amount numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN RAISE EXCEPTION 'Acesso negado: somente Admin/RH'; END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN RAISE EXCEPTION 'Acesso negado: organização não corresponde'; END IF;
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);
  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  v_amount := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Não é possível gerar recibo com valor zero'; END IF;

  v_id := public._tsr_create_document(p_substitution_request_id, 'receipt', 'generated',
    p_file_url, p_storage_path, COALESCE(p_file_name, 'recibo_'||v_req.substitution_code||'.pdf'),
    'application/pdf', NULL, format('Horas: %s x Valor: %s = Total: %s', v_req.total_class_hours, v_req.hour_class_value, v_amount));

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'receipt_generated', jsonb_build_object('document_id', v_id, 'amount', v_amount));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upload_teacher_substitution_document_metadata(
  p_substitution_request_id uuid,
  p_document_type text,
  p_file_url text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text DEFAULT NULL,
  p_file_size_bytes bigint DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_id uuid;
  v_is_substitute boolean;
  v_is_manager boolean;
  v_settings public.teacher_substitution_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  v_is_manager := (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'coordenador'::app_role) OR public.has_role(v_user,'rh'::app_role))
    AND public.get_user_organization_id(v_user) = v_req.organization_id;
  v_is_substitute := public._tsr_is_substitute_professor(v_user, p_substitution_request_id);

  IF NOT (v_is_manager OR v_is_substitute) THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  IF p_document_type NOT IN ('signed_report','supporting_document','payment_proof','declaration','receipt','other') THEN RAISE EXCEPTION 'Tipo de documento inválido'; END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;

  IF v_is_substitute AND NOT v_is_manager THEN
    IF p_document_type NOT IN ('signed_report','supporting_document') THEN RAISE EXCEPTION 'Substituto só pode enviar relatório assinado ou documento de apoio'; END IF;
    IF COALESCE(v_settings.allow_professor_upload_report, true) = false THEN RAISE EXCEPTION 'Envio pelo substituto está desativado'; END IF;
  END IF;

  IF p_document_type = 'payment_proof' AND NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Comprovante de pagamento só pode ser enviado por Admin/RH';
  END IF;

  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  v_id := public._tsr_create_document(p_substitution_request_id, p_document_type,
    CASE WHEN p_document_type = 'signed_report' THEN 'signed' ELSE 'uploaded' END,
    p_file_url, p_storage_path, p_file_name, p_mime_type, p_file_size_bytes, p_notes);

  IF p_document_type = 'signed_report' THEN
    UPDATE public.teacher_substitution_documents SET signed_by = v_profile_id, signed_at = now() WHERE id = v_id;

    UPDATE public.teacher_substitution_requests
    SET documentation_status = 'signed',
        status = CASE WHEN status IN ('cancelled','approved_for_payment','payment_pending','payment_completed') THEN status ELSE 'signed_report_uploaded' END,
        updated_at = now()
    WHERE id = p_substitution_request_id;
  ELSIF p_document_type IN ('supporting_document','declaration','receipt') THEN
    UPDATE public.teacher_substitution_requests
    SET documentation_status = CASE WHEN documentation_status = 'pending_upload' THEN 'uploaded' ELSE documentation_status END,
        updated_at = now()
    WHERE id = p_substitution_request_id;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'document_uploaded', jsonb_build_object('document_id', v_id, 'document_type', p_document_type));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_teacher_substitution_for_payment(p_substitution_request_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_settings public.teacher_substitution_settings%ROWTYPE;
  v_amount numeric;
  v_has_receipt boolean;
  v_has_signed boolean;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN RAISE EXCEPTION 'Acesso negado: somente Admin/RH'; END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN RAISE EXCEPTION 'Acesso negado: organização não corresponde'; END IF;
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.substitute_professor_id IS NULL AND v_req.substitute_professor_name IS NULL THEN RAISE EXCEPTION 'Substituto não confirmado'; END IF;

  v_amount := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Valor total deve ser maior que zero'; END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;

  IF COALESCE(v_settings.require_receipt_for_payment, true) THEN
    SELECT EXISTS(SELECT 1 FROM public.teacher_substitution_documents WHERE substitution_request_id = p_substitution_request_id AND document_type = 'receipt' AND document_status NOT IN ('rejected','cancelled')) INTO v_has_receipt;
    IF NOT v_has_receipt THEN RAISE EXCEPTION 'Recibo obrigatório não encontrado'; END IF;
  END IF;

  IF COALESCE(v_settings.require_signed_report_for_payment, true) THEN
    SELECT EXISTS(SELECT 1 FROM public.teacher_substitution_documents WHERE substitution_request_id = p_substitution_request_id AND document_type = 'signed_report' AND document_status IN ('signed','approved')) INTO v_has_signed;
    IF NOT v_has_signed THEN RAISE EXCEPTION 'Relatório assinado obrigatório não encontrado'; END IF;
  END IF;

  UPDATE public.teacher_substitution_requests
  SET status = 'approved_for_payment', payment_status = 'approved_for_payment', updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'approved_for_payment', approved_by = v_profile_id, approved_at = now(), updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'approved_for_payment', jsonb_build_object('amount', v_amount), p_notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_payment_scheduled(
  p_substitution_request_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN RAISE EXCEPTION 'Acesso negado: somente Admin/RH'; END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN RAISE EXCEPTION 'Acesso negado: organização não corresponde'; END IF;
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status <> 'approved_for_payment' THEN RAISE EXCEPTION 'Solicitação não está aprovada para pagamento'; END IF;

  UPDATE public.teacher_substitution_requests
  SET status = 'payment_pending', payment_status = 'payment_scheduled', payment_method = COALESCE(p_payment_method, payment_method), updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'payment_scheduled', payment_reference = COALESCE(p_payment_reference, payment_reference), payment_method = COALESCE(p_payment_method, payment_method), updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'payment_scheduled', jsonb_build_object('reference', p_payment_reference, 'method', p_payment_method));
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_paid(
  p_substitution_request_id uuid,
  p_payment_proof_document_id uuid DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN RAISE EXCEPTION 'Acesso negado: somente Admin/RH'; END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN RAISE EXCEPTION 'Acesso negado: organização não corresponde'; END IF;
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status NOT IN ('approved_for_payment','payment_pending') THEN RAISE EXCEPTION 'Solicitação não está aprovada/agendada para pagamento'; END IF;

  UPDATE public.teacher_substitution_requests
  SET status = 'payment_completed', payment_status = 'paid', updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'paid', paid_by = v_profile_id, paid_at = now(),
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      payment_proof_document_id = COALESCE(p_payment_proof_document_id, payment_proof_document_id),
      notes = COALESCE(p_notes, notes), updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status NOT IN ('paid','cancelled');

  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Pagamento de substituição efetuado',
           format('Substituição %s — pagamento concluído', v_req.substitution_code),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
    FROM public.professors p WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'payment_completed', jsonb_build_object('reference', p_payment_reference, 'proof_document_id', p_payment_proof_document_id), p_notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.return_teacher_substitution_for_correction(p_substitution_request_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Motivo é obrigatório'; END IF;

  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status IN ('cancelled','payment_completed') THEN RAISE EXCEPTION 'Status atual não permite devolução'; END IF;

  UPDATE public.teacher_substitution_requests
  SET status = 'report_pending', payment_status = 'returned_for_correction', updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'returned_for_correction', updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status NOT IN ('paid','cancelled');

  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Substituição devolvida para correção',
           format('Substituição %s: %s', v_req.substitution_code, p_reason),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
    FROM public.professors p WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role, 'returned_for_correction', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_teacher_substitution_request(
  p_substitution_request_id uuid,
  p_reason text,
  p_force boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'Motivo é obrigatório'; END IF;

  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN RAISE EXCEPTION 'Acesso negado: somente Admin/RH'; END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN RAISE EXCEPTION 'Acesso negado: organização não corresponde'; END IF;
  v_profile_id := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'payment_completed' AND NOT (p_force AND public.has_role(v_user,'admin'::app_role)) THEN
    RAISE EXCEPTION 'Solicitação já paga — somente Admin pode forçar cancelamento';
  END IF;

  UPDATE public.teacher_substitution_requests
  SET status = 'cancelled', cancelled_by = v_profile_id, cancelled_at = now(), cancel_reason = p_reason, updated_at = now()
  WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
  SET payment_status = 'cancelled', updated_at = now()
  WHERE substitution_request_id = p_substitution_request_id AND payment_status <> 'paid';

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role, 'cancelled', p_reason, jsonb_build_object('force', p_force));
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_teacher_substitution_financial_access(p_user_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_user uuid := auth.uid();
  v_admin_profile uuid;
  v_admin_org uuid;
  v_target_org uuid;
  v_id uuid;
BEGIN
  IF NOT has_role(v_admin_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Admin pode conceder acesso financeiro.' USING ERRCODE='42501';
  END IF;
  v_admin_profile := public._tsr_profile_id(v_admin_user);
  v_admin_org := get_user_organization_id(v_admin_user);
  v_target_org := get_user_organization_id(p_user_id);
  IF v_admin_org IS NULL OR v_target_org IS NULL OR v_admin_org <> v_target_org THEN
    RAISE EXCEPTION 'Usuário não pertence à mesma organização.' USING ERRCODE='42501';
  END IF;
  IF NOT has_role(p_user_id, 'rh'::app_role) THEN
    RAISE EXCEPTION 'Acesso financeiro só pode ser concedido a usuários com papel R.H.' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.teacher_substitution_financial_access
    (organization_id, user_id, granted_by, granted_at, is_active, notes, revoked_by, revoked_at)
  VALUES (v_admin_org, p_user_id, v_admin_user, now(), true, p_notes, NULL, NULL)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    is_active = true,
    granted_by = v_admin_user,
    granted_at = now(),
    revoked_by = NULL,
    revoked_at = NULL,
    notes = COALESCE(EXCLUDED.notes, public.teacher_substitution_financial_access.notes),
    updated_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, actor_user_id, action, new_values)
  VALUES (v_admin_org, v_admin_profile, 'financial_access_granted', jsonb_build_object('user_id', p_user_id, 'notes', p_notes));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_teacher_substitution_financial_access(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_user uuid := auth.uid();
  v_admin_profile uuid;
  v_org uuid;
BEGIN
  IF NOT has_role(v_admin_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Admin pode revogar acesso financeiro.' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Justificativa obrigatória para revogação.' USING ERRCODE='22023';
  END IF;
  v_admin_profile := public._tsr_profile_id(v_admin_user);
  v_org := get_user_organization_id(v_admin_user);

  UPDATE public.teacher_substitution_financial_access
  SET is_active = false,
      revoked_by = v_admin_user,
      revoked_at = now(),
      notes = COALESCE(notes || E'\n', '') || '[REVOGADO ' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || p_reason,
      updated_at = now()
  WHERE organization_id = v_org AND user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso ativo não encontrado para este usuário.' USING ERRCODE='42704'; END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, actor_user_id, action, new_values)
  VALUES (v_org, v_admin_profile, 'financial_access_revoked', jsonb_build_object('user_id', p_user_id, 'reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_substitution_financial_details(p_substitution_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_org uuid;
  v_result jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='42704'; END IF;
  IF NOT can_access_teacher_substitution_financial(v_user, v_org) THEN
    RAISE EXCEPTION 'Sem permissão para visualizar dados financeiros.' USING ERRCODE='42501';
  END IF;
  v_profile_id := public._tsr_profile_id(v_user);

  SELECT jsonb_build_object(
    'request', to_jsonb(r.*),
    'payment', to_jsonb(p.*),
    'receipt_documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(d.*))
      FROM public.teacher_substitution_documents d
      WHERE d.substitution_request_id = r.id
        AND d.document_type IN ('receipt','payment_proof')
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.teacher_substitution_requests r
  LEFT JOIN public.teacher_substitution_payments p ON p.substitution_request_id = r.id
  WHERE r.id = p_substitution_request_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, action, new_values)
  VALUES (v_org, p_substitution_request_id, v_profile_id, 'financial_details_viewed', '{}'::jsonb);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_teacher_substitution_request(uuid,uuid,jsonb,uuid,uuid,uuid,uuid,text,date,numeric,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_substitution_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.route_teacher_substitution_to_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_teacher_substitution_candidate(uuid,uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_teacher_substitute(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_teacher_substitution_execution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_teacher_substitution_declaration(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_teacher_substitution_receipt(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upload_teacher_substitution_document_metadata(uuid,text,text,text,text,text,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_teacher_substitution_for_payment(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_teacher_substitution_payment_scheduled(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_teacher_substitution_paid(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_teacher_substitution_for_correction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_teacher_substitution_request(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_teacher_substitution_financial_access(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_teacher_substitution_financial_access(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_substitution_financial_details(uuid) TO authenticated;