
-- ============================================================
-- Fase 0B — Endurecimento do Financeiro de Substituições
-- ============================================================

-- Coluna opcional para data prevista de pagamento (agendamento)
ALTER TABLE public.teacher_substitution_payments
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- ------------------------------------------------------------
-- 1) APROVAR PAGAMENTO — requer financial access
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_teacher_substitution_for_payment(
  p_substitution_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_settings public.teacher_substitution_settings%ROWTYPE;
  v_amount numeric;
  v_has_receipt boolean;
  v_has_signed boolean;
  v_old jsonb;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada' USING ERRCODE='42704'; END IF;

  IF NOT public.can_access_teacher_substitution_financial(v_user, v_req.organization_id) THEN
    RAISE EXCEPTION 'Acesso negado: acesso financeiro não autorizado.' USING ERRCODE='42501';
  END IF;

  v_profile_id := public._tsr_profile_id(v_user);
  v_role       := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.substitute_professor_id IS NULL AND v_req.substitute_professor_name IS NULL THEN
    RAISE EXCEPTION 'Substituto não confirmado';
  END IF;

  v_amount := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Valor total deve ser maior que zero'; END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings
   WHERE organization_id = v_req.organization_id;

  IF COALESCE(v_settings.require_receipt_for_payment, true) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teacher_substitution_documents
       WHERE substitution_request_id = p_substitution_request_id
         AND document_type = 'receipt'
         AND document_status NOT IN ('rejected','cancelled')
    ) INTO v_has_receipt;
    IF NOT v_has_receipt THEN RAISE EXCEPTION 'Recibo obrigatório não encontrado'; END IF;
  END IF;

  IF COALESCE(v_settings.require_signed_report_for_payment, true) THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teacher_substitution_documents
       WHERE substitution_request_id = p_substitution_request_id
         AND document_type = 'signed_report'
         AND document_status IN ('signed','approved')
    ) INTO v_has_signed;
    IF NOT v_has_signed THEN RAISE EXCEPTION 'Relatório assinado obrigatório não encontrado'; END IF;
  END IF;

  v_old := jsonb_build_object('status', v_req.status, 'payment_status', v_req.payment_status);

  UPDATE public.teacher_substitution_requests
     SET status='approved_for_payment', payment_status='approved_for_payment', updated_at=now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status='approved_for_payment',
         approved_by=v_profile_id,
         approved_at=now(),
         updated_at=now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, old_values, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'approved_for_payment',
          v_old,
          jsonb_build_object('status','approved_for_payment','payment_status','approved_for_payment','amount',v_amount),
          p_notes);
END;
$function$;

-- ------------------------------------------------------------
-- 2) AGENDAR PAGAMENTO — requer financial access; aceita data prevista
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_payment_scheduled(
  p_substitution_request_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_scheduled_for timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid; v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_old jsonb;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada' USING ERRCODE='42704'; END IF;

  IF NOT public.can_access_teacher_substitution_financial(v_user, v_req.organization_id) THEN
    RAISE EXCEPTION 'Acesso negado: acesso financeiro não autorizado.' USING ERRCODE='42501';
  END IF;

  v_profile_id := public._tsr_profile_id(v_user);
  v_role       := public._tsr_user_role(v_user);

  IF v_req.status <> 'approved_for_payment' THEN
    RAISE EXCEPTION 'Solicitação não está aprovada para pagamento';
  END IF;

  v_old := jsonb_build_object('status', v_req.status, 'payment_status', v_req.payment_status,
                              'payment_method', v_req.payment_method);

  UPDATE public.teacher_substitution_requests
     SET status='payment_pending', payment_status='payment_scheduled',
         payment_method = COALESCE(p_payment_method, payment_method), updated_at=now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status='payment_scheduled',
         payment_reference=COALESCE(p_payment_reference, payment_reference),
         payment_method=COALESCE(p_payment_method, payment_method),
         scheduled_for=COALESCE(p_scheduled_for, scheduled_for),
         notes = CASE WHEN p_notes IS NULL OR length(trim(p_notes))=0 THEN notes
                      ELSE COALESCE(notes,'') || E'\n[' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || p_notes END,
         updated_at=now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, old_values, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'payment_scheduled', v_old,
          jsonb_build_object('payment_status','payment_scheduled',
                             'reference', p_payment_reference,
                             'method', p_payment_method,
                             'scheduled_for', p_scheduled_for),
          p_notes);
END;
$function$;

-- ------------------------------------------------------------
-- 3) MARCAR COMO PAGO — requer financial access; aceita método/data/comprovante
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_paid(
  p_substitution_request_id uuid,
  p_payment_proof_document_id uuid DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid; v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_settings public.teacher_substitution_settings%ROWTYPE;
  v_pay public.teacher_substitution_payments%ROWTYPE;
  v_has_proof boolean;
  v_when timestamptz := COALESCE(p_paid_at, now());
  v_old jsonb;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada' USING ERRCODE='42704'; END IF;

  IF NOT public.can_access_teacher_substitution_financial(v_user, v_req.organization_id) THEN
    RAISE EXCEPTION 'Acesso negado: acesso financeiro não autorizado.' USING ERRCODE='42501';
  END IF;

  v_profile_id := public._tsr_profile_id(v_user);
  v_role       := public._tsr_user_role(v_user);

  IF v_req.status NOT IN ('approved_for_payment','payment_pending') THEN
    RAISE EXCEPTION 'Solicitação não está aprovada/agendada para pagamento';
  END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings
   WHERE organization_id = v_req.organization_id;

  -- Comprovante obrigatório quando a organização exige recibo OU quando a função recebeu doc
  IF COALESCE(v_settings.require_receipt_for_payment, true) THEN
    IF p_payment_proof_document_id IS NULL THEN
      -- aceitar se já existe um payment_proof anexado anteriormente
      SELECT EXISTS(
        SELECT 1 FROM public.teacher_substitution_documents
         WHERE substitution_request_id = p_substitution_request_id
           AND document_type = 'payment_proof'
           AND document_status NOT IN ('rejected','cancelled')
      ) INTO v_has_proof;
      IF NOT v_has_proof THEN
        RAISE EXCEPTION 'Comprovante de pagamento obrigatório.' USING ERRCODE='22023';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_pay FROM public.teacher_substitution_payments
    WHERE substitution_request_id = p_substitution_request_id LIMIT 1;
  v_old := to_jsonb(v_pay) - 'updated_at';

  UPDATE public.teacher_substitution_requests
     SET status='payment_completed', payment_status='paid', updated_at=now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status='paid',
         paid_by=v_profile_id,
         paid_at=v_when,
         payment_method=COALESCE(p_payment_method, payment_method),
         payment_reference=COALESCE(p_payment_reference, payment_reference),
         payment_proof_document_id=COALESCE(p_payment_proof_document_id, payment_proof_document_id),
         notes = CASE WHEN p_notes IS NULL OR length(trim(p_notes))=0 THEN notes
                      ELSE COALESCE(notes,'') || E'\n[' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || p_notes END,
         updated_at=now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Pagamento de substituição efetuado',
           format('Substituição %s — pagamento concluído', v_req.substitution_code),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
    FROM public.professors p WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, old_values, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'payment_completed',
          v_old,
          jsonb_build_object('payment_status','paid',
                             'paid_at', v_when,
                             'method', p_payment_method,
                             'reference', p_payment_reference,
                             'proof_document_id', p_payment_proof_document_id),
          p_notes);
END;
$function$;

-- ------------------------------------------------------------
-- 4) DEVOLVER PARA CORREÇÃO — Admin sempre; Coord (operacional) ok; R.H. precisa de financial access
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.return_teacher_substitution_for_correction(
  p_substitution_request_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid; v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_is_financial_phase boolean;
  v_old jsonb;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada' USING ERRCODE='42704'; END IF;

  -- Etapas onde devolução já é financeira (pós-validação R.H.)
  v_is_financial_phase := v_req.status IN ('pending_rh_validation','approved_for_payment','payment_pending');

  IF v_is_financial_phase OR public.has_role(v_user,'rh'::app_role) THEN
    -- exige acesso financeiro ativo
    IF NOT public.can_access_teacher_substitution_financial(v_user, v_req.organization_id) THEN
      -- coord pode devolver fases operacionais (não financeiras)
      IF v_is_financial_phase OR NOT public.has_role(v_user,'coordenador'::app_role) THEN
        RAISE EXCEPTION 'Acesso negado: acesso financeiro não autorizado.' USING ERRCODE='42501';
      END IF;
    END IF;
  ELSE
    PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  END IF;

  v_profile_id := public._tsr_profile_id(v_user);
  v_role       := public._tsr_user_role(v_user);

  IF v_req.status IN ('cancelled','payment_completed') THEN
    RAISE EXCEPTION 'Status atual não permite devolução';
  END IF;

  v_old := jsonb_build_object('status', v_req.status, 'payment_status', v_req.payment_status);

  UPDATE public.teacher_substitution_requests
     SET status='report_pending', payment_status='returned_for_correction', updated_at=now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status='returned_for_correction', updated_at=now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Substituição devolvida para correção',
           format('Substituição %s: %s', v_req.substitution_code, p_reason),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
    FROM public.professors p WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, old_values, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_profile_id, v_role,
          'returned_for_correction', v_old,
          jsonb_build_object('status','report_pending','payment_status','returned_for_correction'),
          p_reason);
END;
$function$;
