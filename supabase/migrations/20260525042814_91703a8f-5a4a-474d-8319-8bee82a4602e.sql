
-- ============ ENUMS / TYPES ============
ALTER TYPE chat_channel_type ADD VALUE IF NOT EXISTS 'substituicao';

-- Notification types: drop & recreate constraint to include SUBSTITUTION_*
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'ORIENTATION_CREATED','ORIENTATION_ACCEPTED','ORIENTATION_REJECTED','ORIENTATION_SIGNED',
    'GENERAL','TICKET_CREATED','TICKET_RESOLVED','TICKET_STATUS_CHANGED','TICKET_MESSAGE','TICKET_UPDATED',
    'TEACHER_ATTENDANCE_PENDING','TEACHER_ATTENDANCE_ADJUSTMENT_REQUESTED','TEACHER_ATTENDANCE_READY_RH',
    'TEACHER_ATTENDANCE_CLOSED','TEACHER_ATTENDANCE_REOPENED','TEACHER_ATTENDANCE_GENERAL',
    'SUBSTITUTION_CREATED','SUBSTITUTION_TICKET_CREATED','SUBSTITUTION_ROUTED','SUBSTITUTION_CANDIDATE_SUGGESTED',
    'SUBSTITUTION_SUBSTITUTE_CONFIRMED','SUBSTITUTION_GENERAL'
  ])
);

-- ============ HELPER: role check ============
CREATE OR REPLACE FUNCTION public._tsr_assert_manager(_user uuid, _org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(_user, 'admin'::app_role) OR
    public.has_role(_user, 'coordenador'::app_role) OR
    public.has_role(_user, 'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer Admin, Coordenador ou RH';
  END IF;
  IF public.get_user_organization_id(_user) <> _org THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._tsr_user_role(_user uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = _user
  ORDER BY CASE role::text
    WHEN 'admin' THEN 1 WHEN 'coordenador' THEN 2 WHEN 'rh' THEN 3 ELSE 9 END
  LIMIT 1;
$$;

-- ============ RPC 1: create_teacher_substitution_request ============
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
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_id uuid;
  v_hour_value numeric;
  v_default_value numeric;
  v_prof_name text;
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

  -- valor padrão por organização
  IF p_hour_class_value IS NULL THEN
    SELECT default_hour_class_value INTO v_default_value
    FROM public.teacher_substitution_settings
    WHERE organization_id = p_organization_id;
    v_hour_value := COALESCE(v_default_value, 0);
  ELSE
    v_hour_value := p_hour_class_value;
  END IF;

  -- snapshots
  v_prof_name := COALESCE(
    p_substituted_professor_data->>'name',
    (SELECT name FROM public.professors WHERE id = p_substituted_professor_id),
    'Professor não identificado'
  );

  SELECT name INTO v_school_name FROM public.schools WHERE id = p_school_id;
  SELECT name INTO v_course_name FROM public.courses WHERE id = p_course_id;
  SELECT name INTO v_class_name FROM public.class_groups WHERE id = p_class_group_id;
  SELECT name INTO v_subject_name FROM public.subjects WHERE id = p_subject_id;

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
    p_substituted_professor_data->>'cpf', p_substituted_professor_data->>'rg',
    p_substituted_professor_data->>'registration',
    p_school_id, p_course_id, p_class_group_id, p_subject_id,
    v_school_name, v_course_name, v_class_name, v_subject_name,
    p_absence_reason, p_absence_date,
    p_total_class_hours, v_hour_value,
    p_context->>'notes'
  ) RETURNING id INTO v_id;

  INSERT INTO public.teacher_substitution_audit_logs (
    organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values
  ) VALUES (
    p_organization_id, v_id, v_user, v_role, 'substitution_created',
    jsonb_build_object('total_class_hours', p_total_class_hours, 'hour_class_value', v_hour_value)
  );

  RETURN v_id;
END;
$$;

-- ============ RPC 2: create_teacher_substitution_ticket ============
CREATE OR REPLACE FUNCTION public.create_teacher_substitution_ticket(
  p_substitution_request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_cat_id uuid;
  v_ticket_id uuid;
  v_title text;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN
    RAISE EXCEPTION 'Solicitação cancelada';
  END IF;
  IF v_req.ticket_id IS NOT NULL THEN
    RETURN v_req.ticket_id;
  END IF;

  -- garante categoria "Substituição" na organização
  SELECT id INTO v_cat_id FROM public.ticket_categories
   WHERE organization_id = v_req.organization_id AND name = 'Substituição';
  IF v_cat_id IS NULL THEN
    INSERT INTO public.ticket_categories (organization_id, name, description, priority_default)
    VALUES (v_req.organization_id, 'Substituição', 'Solicitações de substituição de professores', 'alta')
    RETURNING id INTO v_cat_id;
  END IF;

  v_title := format('[%s] Substituição — %s — %s — %s',
    v_req.substitution_code, v_req.substituted_professor_name,
    COALESCE(v_req.school_name_snapshot, '-'),
    to_char(v_req.absence_date, 'DD/MM/YYYY'));

  INSERT INTO public.tickets (
    organization_id, title, description, category_id, school_id,
    status, priority, opened_by_id, type
  ) VALUES (
    v_req.organization_id, v_title,
    format('Solicitação %s — Motivo: %s — Horas: %s',
      v_req.substitution_code, v_req.absence_reason, v_req.total_class_hours),
    v_cat_id, v_req.school_id,
    'aberto', 'alta', v_user, 'escola'::ticket_type
  ) RETURNING id INTO v_ticket_id;

  UPDATE public.teacher_substitution_requests
     SET ticket_id = v_ticket_id,
         status = 'ticket_created',
         updated_at = now()
   WHERE id = p_substitution_request_id;

  INSERT INTO public.teacher_substitution_audit_logs (
    organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, v_user, v_role,
    'ticket_created', jsonb_build_object('ticket_id', v_ticket_id, 'category_id', v_cat_id)
  );

  RETURN v_ticket_id;
END;
$$;

-- ============ RPC 3: route_teacher_substitution_to_channel ============
CREATE OR REPLACE FUNCTION public.route_teacher_substitution_to_channel(
  p_substitution_request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
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
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  SELECT COALESCE(substitution_channel_name, 'substituicao') INTO v_channel_name
    FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;
  v_channel_name := COALESCE(v_channel_name, 'substituicao');

  SELECT id INTO v_channel_id FROM public.chat_channels
   WHERE organization_id = v_req.organization_id
     AND name = v_channel_name
     AND archived_at IS NULL
   LIMIT 1;

  IF v_channel_id IS NULL THEN
    INSERT INTO public.chat_channels (organization_id, name, description, type, is_private, created_by)
    VALUES (v_req.organization_id, v_channel_name,
            'Canal de substituições de professores',
            'substituicao'::chat_channel_type, true, v_user)
    RETURNING id INTO v_channel_id;

    -- adiciona admin/coord/rh da organização
    FOR rec IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur
       WHERE ur.organization_id = v_req.organization_id
         AND ur.role::text IN ('admin','coordenador','rh')
    LOOP
      INSERT INTO public.chat_channel_members (channel_id, user_id, role)
      VALUES (v_channel_id, rec.user_id, 'member'::chat_member_role)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  v_msg := format('🔔 Nova substituição %s — %s — %s — %s (%s horas-aula)',
    v_req.substitution_code, v_req.substituted_professor_name,
    COALESCE(v_req.school_name_snapshot, '-'),
    to_char(v_req.absence_date, 'DD/MM/YYYY'),
    v_req.total_class_hours);

  INSERT INTO public.chat_messages (channel_id, author_id, body)
  VALUES (v_channel_id, v_user, v_msg)
  RETURNING id INTO v_msg_id;

  UPDATE public.teacher_substitution_requests
     SET chat_channel_id = v_channel_id,
         status = CASE WHEN status IN ('request_created','ticket_created') THEN 'routed_to_channel' ELSE status END,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  -- notifica membros (exceto autor)
  FOR rec IN
    SELECT user_id FROM public.chat_channel_members
     WHERE channel_id = v_channel_id AND user_id <> v_user
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (rec.user_id, 'Nova substituição', v_msg, 'SUBSTITUTION_ROUTED', p_substitution_request_id);
  END LOOP;

  INSERT INTO public.teacher_substitution_audit_logs (
    organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, v_user, v_role,
    'routed_to_channel', jsonb_build_object('channel_id', v_channel_id, 'message_id', v_msg_id)
  );

  RETURN v_channel_id;
END;
$$;

-- ============ RPC 4: suggest_teacher_substitution_candidate ============
CREATE OR REPLACE FUNCTION public.suggest_teacher_substitution_candidate(
  p_substitution_request_id uuid,
  p_professor_id uuid,
  p_candidate_data jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
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
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  IF p_professor_id IS NOT NULL THEN
    v_source := 'internal';
    SELECT name, cpf, rg, phone, email INTO v_name, v_cpf, v_rg, v_phone, v_email
      FROM public.professors WHERE id = p_professor_id;
  ELSE
    v_source := 'external';
  END IF;

  v_name  := COALESCE(p_candidate_data->>'name', v_name);
  v_cpf   := COALESCE(p_candidate_data->>'cpf', v_cpf);
  v_rg    := COALESCE(p_candidate_data->>'rg', v_rg);
  v_phone := COALESCE(p_candidate_data->>'phone', v_phone);
  v_email := COALESCE(p_candidate_data->>'email', v_email);

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
    v_source, v_user, 'suggested', p_notes
  ) RETURNING id INTO v_candidate_id;

  UPDATE public.teacher_substitution_requests
     SET status = CASE WHEN status IN ('cancelled','substitute_confirmed','in_execution',
                                       'execution_completed','approved_for_payment','payment_completed')
                       THEN status ELSE 'substitute_suggested' END,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  -- notifica candidato interno
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

  INSERT INTO public.teacher_substitution_audit_logs (
    organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, v_user, v_role,
    'candidate_suggested',
    jsonb_build_object('candidate_id', v_candidate_id, 'professor_id', p_professor_id, 'source', v_source)
  );

  RETURN v_candidate_id;
END;
$$;

-- ============ RPC 5: confirm_teacher_substitute ============
CREATE OR REPLACE FUNCTION public.confirm_teacher_substitute(
  p_substitution_request_id uuid,
  p_candidate_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_cand public.teacher_substitution_candidates%ROWTYPE;
  v_payment_id uuid;
  v_gross numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível confirmar substituto em solicitação cancelada';
  END IF;

  SELECT * INTO v_cand FROM public.teacher_substitution_candidates
   WHERE id = p_candidate_id AND substitution_request_id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Candidato não encontrado para esta solicitação'; END IF;

  -- marca os demais como rejeitados; o atual como confirmado
  UPDATE public.teacher_substitution_candidates
     SET confirmation_status = 'rejected', updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND id <> p_candidate_id
     AND confirmation_status NOT IN ('rejected','cancelled');

  UPDATE public.teacher_substitution_candidates
     SET confirmation_status = 'confirmed',
         confirmed_by = v_user,
         confirmed_at = now(),
         updated_at = now()
   WHERE id = p_candidate_id;

  UPDATE public.teacher_substitution_requests
     SET substitute_professor_id = v_cand.professor_id,
         substitute_professor_name = v_cand.candidate_name,
         substitute_professor_cpf = v_cand.candidate_cpf,
         substitute_professor_rg = v_cand.candidate_rg,
         substitute_confirmed_by = v_user,
         substitute_confirmed_at = now(),
         status = 'substitute_confirmed',
         payment_status = CASE WHEN total_class_hours > 0 AND hour_class_value > 0
                               THEN 'calculated' ELSE 'pending_calculation' END,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  -- cria/atualiza pagamento
  v_gross := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);

  SELECT id INTO v_payment_id FROM public.teacher_substitution_payments
   WHERE substitution_request_id = p_substitution_request_id;

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

  -- notifica substituto
  IF v_cand.professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Substituição confirmada',
           format('Você foi confirmado como substituto na solicitação %s', v_req.substitution_code),
           'SUBSTITUTION_SUBSTITUTE_CONFIRMED', p_substitution_request_id
      FROM public.professors p WHERE p.id = v_cand.professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs (
    organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values
  ) VALUES (
    v_req.organization_id, p_substitution_request_id, v_user, v_role,
    'substitute_confirmed',
    jsonb_build_object('candidate_id', p_candidate_id, 'professor_id', v_cand.professor_id,
                       'payment_id', v_payment_id, 'gross_amount', v_gross)
  );

  RETURN v_payment_id;
END;
$$;

-- ============ GRANTS ============
GRANT EXECUTE ON FUNCTION public.create_teacher_substitution_request(uuid,uuid,jsonb,uuid,uuid,uuid,uuid,text,date,numeric,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_substitution_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.route_teacher_substitution_to_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_teacher_substitution_candidate(uuid,uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_teacher_substitute(uuid,uuid) TO authenticated;
