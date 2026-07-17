
-- ============ helper: assert manager OR substitute professor ============
CREATE OR REPLACE FUNCTION public._tsr_is_substitute_professor(_user uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_substitution_requests r
    JOIN public.professors p ON p.id = r.substitute_professor_id
    WHERE r.id = _request_id AND p.user_id = _user
  );
$$;

-- ============ RPC: confirm_teacher_substitution_execution ============
CREATE OR REPLACE FUNCTION public.confirm_teacher_substitution_execution(
  p_substitution_request_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_total numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.substitute_professor_id IS NULL AND v_req.substitute_professor_name IS NULL THEN
    RAISE EXCEPTION 'Substituto não confirmado';
  END IF;

  UPDATE public.teacher_substitution_occurrences
     SET execution_status = 'executed', updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND execution_status NOT IN ('executed','cancelled');

  SELECT COALESCE(SUM(class_hours),0) INTO v_total
    FROM public.teacher_substitution_occurrences
   WHERE substitution_request_id = p_substitution_request_id
     AND execution_status = 'executed';

  UPDATE public.teacher_substitution_requests
     SET status = 'execution_completed',
         workflow_phase = 'phase_2_execution_closure',
         total_class_hours = CASE WHEN v_total > 0 THEN v_total ELSE total_class_hours END,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'pending_documentation', updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'execution_confirmed', jsonb_build_object('total_class_hours', v_total));
END; $$;

-- ============ generic doc creator ============
CREATE OR REPLACE FUNCTION public._tsr_create_document(
  _request_id uuid, _type text, _status text,
  _file_url text, _storage_path text, _file_name text,
  _mime text, _size bigint, _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_id uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.teacher_substitution_requests WHERE id = _request_id;
  INSERT INTO public.teacher_substitution_documents
    (organization_id, substitution_request_id, document_type, document_status,
     file_url, storage_path, file_name, mime_type, file_size_bytes,
     generated_by, uploaded_by, notes)
  VALUES (v_org, _request_id, _type, _status,
          _file_url, _storage_path, _file_name, _mime, _size,
          v_user, v_user, _notes)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ============ RPC: generate declaration ============
CREATE OR REPLACE FUNCTION public.generate_teacher_substitution_declaration(
  p_substitution_request_id uuid,
  p_file_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);
  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  v_id := public._tsr_create_document(p_substitution_request_id, 'declaration', 'generated',
    p_file_url, p_storage_path, COALESCE(p_file_name, 'declaracao_'||v_req.substitution_code||'.pdf'),
    'application/pdf', NULL, NULL);

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'declaration_generated', jsonb_build_object('document_id', v_id));
  RETURN v_id;
END; $$;

-- ============ RPC: generate receipt ============
CREATE OR REPLACE FUNCTION public.generate_teacher_substitution_receipt(
  p_substitution_request_id uuid,
  p_file_url text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_id uuid;
  v_amount numeric;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado: somente Admin/RH';
  END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
  v_role := public._tsr_user_role(v_user);
  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;

  v_amount := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Não é possível gerar recibo com valor zero'; END IF;

  v_id := public._tsr_create_document(p_substitution_request_id, 'receipt', 'generated',
    p_file_url, p_storage_path, COALESCE(p_file_name, 'recibo_'||v_req.substitution_code||'.pdf'),
    'application/pdf', NULL,
    format('Horas: %s x Valor: %s = Total: %s', v_req.total_class_hours, v_req.hour_class_value, v_amount));

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'receipt_generated', jsonb_build_object('document_id', v_id, 'amount', v_amount));
  RETURN v_id;
END; $$;

-- ============ RPC: upload document metadata ============
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
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

  v_is_manager := (
    public.has_role(v_user,'admin'::app_role) OR
    public.has_role(v_user,'coordenador'::app_role) OR
    public.has_role(v_user,'rh'::app_role)
  ) AND public.get_user_organization_id(v_user) = v_req.organization_id;

  v_is_substitute := public._tsr_is_substitute_professor(v_user, p_substitution_request_id);

  IF NOT (v_is_manager OR v_is_substitute) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_document_type NOT IN ('signed_report','supporting_document','payment_proof','declaration','receipt','other') THEN
    RAISE EXCEPTION 'Tipo de documento inválido';
  END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;

  -- professor substituto: só pode subir signed_report ou supporting_document, se permitido
  IF v_is_substitute AND NOT v_is_manager THEN
    IF p_document_type NOT IN ('signed_report','supporting_document') THEN
      RAISE EXCEPTION 'Substituto só pode enviar relatório assinado ou documento de apoio';
    END IF;
    IF COALESCE(v_settings.allow_professor_upload_report, true) = false THEN
      RAISE EXCEPTION 'Envio pelo substituto está desativado';
    END IF;
  END IF;

  -- payment_proof exige Admin/RH
  IF p_document_type = 'payment_proof' AND NOT (
    public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Comprovante de pagamento só pode ser enviado por Admin/RH';
  END IF;

  v_role := public._tsr_user_role(v_user);

  v_id := public._tsr_create_document(p_substitution_request_id, p_document_type,
    CASE WHEN p_document_type = 'signed_report' THEN 'signed' ELSE 'uploaded' END,
    p_file_url, p_storage_path, p_file_name, p_mime_type, p_file_size_bytes, p_notes);

  IF p_document_type = 'signed_report' THEN
    UPDATE public.teacher_substitution_documents
       SET signed_by = v_user, signed_at = now()
     WHERE id = v_id;

    UPDATE public.teacher_substitution_requests
       SET documentation_status = 'signed',
           status = CASE WHEN status IN ('cancelled','approved_for_payment','payment_scheduled','payment_completed')
                         THEN status ELSE 'signed_report_uploaded' END,
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
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'document_uploaded', jsonb_build_object('document_id', v_id, 'document_type', p_document_type));

  RETURN v_id;
END; $$;

-- ============ RPC: approve for payment ============
CREATE OR REPLACE FUNCTION public.approve_teacher_substitution_for_payment(
  p_substitution_request_id uuid,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_settings public.teacher_substitution_settings%ROWTYPE;
  v_amount numeric;
  v_has_receipt boolean;
  v_has_signed boolean;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado: somente Admin/RH';
  END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'cancelled' THEN RAISE EXCEPTION 'Solicitação cancelada'; END IF;
  IF v_req.substitute_professor_id IS NULL AND v_req.substitute_professor_name IS NULL THEN
    RAISE EXCEPTION 'Substituto não confirmado';
  END IF;

  v_amount := COALESCE(v_req.total_class_hours,0) * COALESCE(v_req.hour_class_value,0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Valor total deve ser maior que zero'; END IF;

  SELECT * INTO v_settings FROM public.teacher_substitution_settings WHERE organization_id = v_req.organization_id;

  IF COALESCE(v_settings.require_receipt_for_payment, true) THEN
    SELECT EXISTS(SELECT 1 FROM public.teacher_substitution_documents
                  WHERE substitution_request_id = p_substitution_request_id
                    AND document_type = 'receipt'
                    AND document_status NOT IN ('rejected','cancelled'))
      INTO v_has_receipt;
    IF NOT v_has_receipt THEN RAISE EXCEPTION 'Recibo obrigatório não encontrado'; END IF;
  END IF;

  IF COALESCE(v_settings.require_signed_report_for_payment, true) THEN
    SELECT EXISTS(SELECT 1 FROM public.teacher_substitution_documents
                  WHERE substitution_request_id = p_substitution_request_id
                    AND document_type = 'signed_report'
                    AND document_status IN ('signed','approved'))
      INTO v_has_signed;
    IF NOT v_has_signed THEN RAISE EXCEPTION 'Relatório assinado obrigatório não encontrado'; END IF;
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'approved_for_payment',
         payment_status = 'approved_for_payment',
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'approved_for_payment',
         approved_by = v_user,
         approved_at = now(),
         updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'approved_for_payment', jsonb_build_object('amount', v_amount), p_notes);
END; $$;

-- ============ RPC: mark payment scheduled ============
CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_payment_scheduled(
  p_substitution_request_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_payment_method text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado: somente Admin/RH';
  END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
  v_role := public._tsr_user_role(v_user);

  IF v_req.status <> 'approved_for_payment' THEN
    RAISE EXCEPTION 'Solicitação não está aprovada para pagamento';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'payment_pending',
         payment_status = 'payment_scheduled',
         payment_method = COALESCE(p_payment_method, payment_method),
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'payment_scheduled',
         payment_reference = COALESCE(p_payment_reference, payment_reference),
         payment_method = COALESCE(p_payment_method, payment_method),
         updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'payment_scheduled', jsonb_build_object('reference', p_payment_reference, 'method', p_payment_method));
END; $$;

-- ============ RPC: mark paid ============
CREATE OR REPLACE FUNCTION public.mark_teacher_substitution_paid(
  p_substitution_request_id uuid,
  p_payment_proof_document_id uuid DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado: somente Admin/RH';
  END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
  v_role := public._tsr_user_role(v_user);

  IF v_req.status NOT IN ('approved_for_payment','payment_pending') THEN
    RAISE EXCEPTION 'Solicitação não está aprovada/agendada para pagamento';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'payment_completed',
         payment_status = 'paid',
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'paid',
         paid_by = v_user,
         paid_at = now(),
         payment_reference = COALESCE(p_payment_reference, payment_reference),
         payment_proof_document_id = COALESCE(p_payment_proof_document_id, payment_proof_document_id),
         notes = COALESCE(p_notes, notes),
         updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  -- notifica substituto
  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Pagamento de substituição efetuado',
           format('Substituição %s — pagamento concluído', v_req.substitution_code),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
      FROM public.professors p
     WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, new_values, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'payment_completed',
          jsonb_build_object('reference', p_payment_reference, 'proof_document_id', p_payment_proof_document_id),
          p_notes);
END; $$;

-- ============ RPC: return for correction ============
CREATE OR REPLACE FUNCTION public.return_teacher_substitution_for_correction(
  p_substitution_request_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;

  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  PERFORM public._tsr_assert_manager(v_user, v_req.organization_id);
  v_role := public._tsr_user_role(v_user);

  IF v_req.status IN ('cancelled','payment_completed') THEN
    RAISE EXCEPTION 'Status atual não permite devolução';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'report_pending',
         payment_status = 'returned_for_correction',
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'returned_for_correction', updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status NOT IN ('paid','cancelled');

  -- notifica substituto se houver
  IF v_req.substitute_professor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    SELECT p.user_id, 'Substituição devolvida para correção',
           format('Substituição %s: %s', v_req.substitution_code, p_reason),
           'SUBSTITUTION_GENERAL', p_substitution_request_id
      FROM public.professors p
     WHERE p.id = v_req.substitute_professor_id AND p.user_id IS NOT NULL;
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'returned_for_correction', p_reason);
END; $$;

-- ============ RPC: cancel request ============
CREATE OR REPLACE FUNCTION public.cancel_teacher_substitution_request(
  p_substitution_request_id uuid,
  p_reason text,
  p_force boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role text;
  v_req public.teacher_substitution_requests%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;

  SELECT * INTO v_req FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado: somente Admin/RH';
  END IF;
  IF public.get_user_organization_id(v_user) <> v_req.organization_id THEN
    RAISE EXCEPTION 'Acesso negado: organização não corresponde';
  END IF;
  v_role := public._tsr_user_role(v_user);

  IF v_req.status = 'payment_completed' AND NOT (p_force AND public.has_role(v_user,'admin'::app_role)) THEN
    RAISE EXCEPTION 'Solicitação já paga — somente Admin pode forçar cancelamento';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'cancelled',
         cancelled_by = v_user,
         cancelled_at = now(),
         cancel_reason = p_reason,
         updated_at = now()
   WHERE id = p_substitution_request_id;

  UPDATE public.teacher_substitution_payments
     SET payment_status = 'cancelled', updated_at = now()
   WHERE substitution_request_id = p_substitution_request_id
     AND payment_status <> 'paid';

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason, new_values)
  VALUES (v_req.organization_id, p_substitution_request_id, v_user, v_role,
          'cancelled', p_reason, jsonb_build_object('force', p_force));
END; $$;

-- ============ GRANTS ============
GRANT EXECUTE ON FUNCTION public.confirm_teacher_substitution_execution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_teacher_substitution_declaration(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_teacher_substitution_receipt(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upload_teacher_substitution_document_metadata(uuid,text,text,text,text,text,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_teacher_substitution_for_payment(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_teacher_substitution_payment_scheduled(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_teacher_substitution_paid(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_teacher_substitution_for_correction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_teacher_substitution_request(uuid,text,boolean) TO authenticated;
