CREATE OR REPLACE FUNCTION public.tg_teacher_substitution_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_changed_by uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_changed_by
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.teacher_substitution_status_history(
      organization_id, substitution_request_id,
      old_status, new_status,
      old_payment_status, new_payment_status,
      changed_by
    ) VALUES (
      NEW.organization_id, NEW.id,
      NULL, NEW.status,
      NULL, NEW.payment_status,
      COALESCE(v_changed_by, NEW.requested_by)
    );
  ELSIF TG_OP = 'UPDATE' AND (
        NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
  ) THEN
    INSERT INTO public.teacher_substitution_status_history(
      organization_id, substitution_request_id,
      old_status, new_status,
      old_payment_status, new_payment_status,
      changed_by
    ) VALUES (
      NEW.organization_id, NEW.id,
      OLD.status, NEW.status,
      OLD.payment_status, NEW.payment_status,
      COALESCE(v_changed_by, NEW.requested_by, OLD.requested_by)
    );
  END IF;
  RETURN NEW;
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
    SELECT full_name, cpf, NULL::text, phone INTO v_name, v_cpf, v_rg, v_phone
    FROM public.professors WHERE id = p_professor_id;
  ELSE
    v_source := 'external';
  END IF;

  v_name := COALESCE(NULLIF(p_candidate_data->>'name', ''), v_name);
  v_cpf := COALESCE(NULLIF(p_candidate_data->>'cpf', ''), v_cpf);
  v_rg := COALESCE(NULLIF(p_candidate_data->>'rg', ''), v_rg);
  v_phone := COALESCE(NULLIF(p_candidate_data->>'phone', ''), v_phone);
  v_email := NULLIF(p_candidate_data->>'email', '');

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

GRANT EXECUTE ON FUNCTION public.suggest_teacher_substitution_candidate(uuid,uuid,jsonb,text) TO authenticated;