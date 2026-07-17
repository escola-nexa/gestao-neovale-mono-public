
-- 1) Add new operational-flow columns (idempotent)
ALTER TABLE public.teacher_substitution_requests
  ADD COLUMN IF NOT EXISTS attended_by uuid,
  ADD COLUMN IF NOT EXISTS attended_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_by uuid,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_notes text,
  ADD COLUMN IF NOT EXISTS return_attachment_url text,
  ADD COLUMN IF NOT EXISTS school_notified_by uuid,
  ADD COLUMN IF NOT EXISTS school_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS school_notification_channel text,
  ADD COLUMN IF NOT EXISTS school_notification_recipient text,
  ADD COLUMN IF NOT EXISTS school_notification_proof_url text,
  ADD COLUMN IF NOT EXISTS school_notification_message text,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

-- 2) Helper to log status transitions (uses existing history table)
CREATE OR REPLACE FUNCTION public._tsr_log_status(
  p_id uuid, p_from text, p_to text, p_actor uuid, p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.teacher_substitution_status_history
    (substitution_request_id, from_status, to_status, changed_by, notes, created_at)
  VALUES (p_id, p_from, p_to, p_actor, p_notes, now());
EXCEPTION WHEN undefined_column OR undefined_table THEN
  -- Fallback if columns differ; ignore to not block the flow
  NULL;
END;
$$;

-- 3) RPC: R.H. assume o atendimento
CREATE OR REPLACE FUNCTION public.tsr_rh_take(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile uuid;
  v_role text;
  v_org uuid;
  v_status text;
BEGIN
  SELECT organization_id, status INTO v_org, v_status
  FROM public.teacher_substitution_requests WHERE id = p_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  PERFORM public._tsr_assert_manager(v_user, v_org);
  v_profile := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_role NOT IN ('admin','rh') THEN
    RAISE EXCEPTION 'Apenas R.H. ou administrador pode assumir o atendimento';
  END IF;
  IF v_status NOT IN ('request_created','rh_in_progress') THEN
    RAISE EXCEPTION 'Status inválido para assumir (atual: %)', v_status;
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'rh_in_progress',
         attended_by = COALESCE(attended_by, v_profile),
         attended_at = COALESCE(attended_at, now()),
         updated_at = now()
   WHERE id = p_id;

  PERFORM public._tsr_log_status(p_id, v_status, 'rh_in_progress', v_profile, 'R.H. assumiu o atendimento');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action)
  VALUES (v_org, p_id, v_profile, v_role, 'rh_take');
END;
$$;

-- 4) RPC: R.H. devolve à coordenação com dados do substituto
CREATE OR REPLACE FUNCTION public.tsr_rh_return(
  p_id uuid,
  p_substitute_professor_id uuid DEFAULT NULL,
  p_substitute_name text DEFAULT NULL,
  p_substitute_cpf text DEFAULT NULL,
  p_substitute_rg text DEFAULT NULL,
  p_substitute_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_attachment_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile uuid; v_role text; v_org uuid; v_status text;
  v_name text := p_substitute_name;
  v_cpf text := p_substitute_cpf;
  v_rg text := p_substitute_rg;
BEGIN
  SELECT organization_id, status INTO v_org, v_status
  FROM public.teacher_substitution_requests WHERE id = p_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  PERFORM public._tsr_assert_manager(v_user, v_org);
  v_profile := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_role NOT IN ('admin','rh') THEN
    RAISE EXCEPTION 'Apenas R.H. ou administrador pode devolver';
  END IF;
  IF v_status NOT IN ('rh_in_progress','request_created') THEN
    RAISE EXCEPTION 'Status inválido para devolução (atual: %)', v_status;
  END IF;

  IF p_substitute_professor_id IS NOT NULL THEN
    SELECT COALESCE(v_name, full_name), COALESCE(v_cpf, cpf)
      INTO v_name, v_cpf
      FROM public.professors WHERE id = p_substitute_professor_id;
  END IF;

  IF COALESCE(NULLIF(v_name,''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Nome do substituto é obrigatório';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'returned_to_coordinator',
         substitute_professor_id = COALESCE(p_substitute_professor_id, substitute_professor_id),
         substitute_professor_name = v_name,
         substitute_professor_cpf = COALESCE(v_cpf, substitute_professor_cpf),
         substitute_professor_rg = COALESCE(v_rg, substitute_professor_rg),
         returned_by = v_profile,
         returned_at = now(),
         return_notes = NULLIF(p_notes,''),
         return_attachment_url = NULLIF(p_attachment_url,''),
         attended_by = COALESCE(attended_by, v_profile),
         attended_at = COALESCE(attended_at, now()),
         updated_at = now()
   WHERE id = p_id;

  PERFORM public._tsr_log_status(p_id, v_status, 'returned_to_coordinator', v_profile,
    COALESCE(NULLIF(p_notes,''), 'R.H. devolveu com dados do substituto'));

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_org, p_id, v_profile, v_role, 'rh_return',
          jsonb_build_object('substitute', v_name, 'phone', p_substitute_phone));
END;
$$;

-- 5) RPC: Coordenação devolve ao R.H.
CREATE OR REPLACE FUNCTION public.tsr_coord_return_to_rh(
  p_id uuid, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile uuid; v_role text; v_org uuid; v_status text;
BEGIN
  IF COALESCE(NULLIF(p_reason,''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Motivo da devolução é obrigatório';
  END IF;

  SELECT organization_id, status INTO v_org, v_status
  FROM public.teacher_substitution_requests WHERE id = p_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  PERFORM public._tsr_assert_manager(v_user, v_org);
  v_profile := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_role NOT IN ('admin','coordenador') THEN
    RAISE EXCEPTION 'Apenas coordenação ou administrador pode devolver ao R.H.';
  END IF;
  IF v_status NOT IN ('returned_to_coordinator') THEN
    RAISE EXCEPTION 'Status inválido para devolução ao R.H. (atual: %)', v_status;
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'rh_in_progress',
         return_notes = NULL,
         updated_at = now()
   WHERE id = p_id;

  PERFORM public._tsr_log_status(p_id, v_status, 'rh_in_progress', v_profile, p_reason);

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason)
  VALUES (v_org, p_id, v_profile, v_role, 'coord_return_to_rh', p_reason);
END;
$$;

-- 6) RPC: Coordenação informa escola e finaliza
CREATE OR REPLACE FUNCTION public.tsr_coord_notify_school(
  p_id uuid,
  p_channel text,
  p_recipient text DEFAULT NULL,
  p_proof_url text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_notified_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile uuid; v_role text; v_org uuid; v_status text;
BEGIN
  SELECT organization_id, status INTO v_org, v_status
  FROM public.teacher_substitution_requests WHERE id = p_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  PERFORM public._tsr_assert_manager(v_user, v_org);
  v_profile := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_role NOT IN ('admin','coordenador') THEN
    RAISE EXCEPTION 'Apenas coordenação ou administrador pode informar a escola';
  END IF;
  IF v_status <> 'returned_to_coordinator' THEN
    RAISE EXCEPTION 'Status inválido para informar a escola (atual: %)', v_status;
  END IF;
  IF COALESCE(NULLIF(p_channel,''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Canal de comunicação é obrigatório';
  END IF;
  IF COALESCE(NULLIF(p_proof_url,''), NULLIF(p_message,'')) IS NULL THEN
    RAISE EXCEPTION 'Forneça anexo de comprovação ou o texto da mensagem enviada';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'substitution_completed',
         school_notified_by = v_profile,
         school_notified_at = COALESCE(p_notified_at, now()),
         school_notification_channel = p_channel,
         school_notification_recipient = NULLIF(p_recipient,''),
         school_notification_proof_url = NULLIF(p_proof_url,''),
         school_notification_message = NULLIF(p_message,''),
         finalized_at = now(),
         workflow_phase = 'completed',
         updated_at = now()
   WHERE id = p_id;

  PERFORM public._tsr_log_status(p_id, v_status, 'substitution_completed', v_profile,
    format('Escola informada via %s', p_channel));

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_org, p_id, v_profile, v_role, 'coord_notify_school',
          jsonb_build_object('channel', p_channel, 'recipient', p_recipient,
                             'has_proof', p_proof_url IS NOT NULL,
                             'has_message', p_message IS NOT NULL));
END;
$$;
