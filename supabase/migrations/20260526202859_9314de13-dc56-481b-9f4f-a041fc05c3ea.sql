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