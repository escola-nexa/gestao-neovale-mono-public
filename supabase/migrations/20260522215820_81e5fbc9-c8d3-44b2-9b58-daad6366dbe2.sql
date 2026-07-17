
-- ============================================================================
-- Helper: garante folha NÃO fechada
-- ============================================================================
CREATE OR REPLACE FUNCTION public._tap_assert_sheet_open(p_sheet_id uuid)
RETURNS public.teacher_attendance_monthly_sheets
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sheet public.teacher_attendance_monthly_sheets;
BEGIN
  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;
  IF v_sheet.status IN ('closed','approved_by_rh') THEN RAISE EXCEPTION 'sheet_closed'; END IF;
  RETURN v_sheet;
END $$;

-- ============================================================================
-- 1) REQUEST ADJUSTMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_teacher_attendance_adjustment(
  p_entry_id uuid,
  p_request_type text,
  p_requested_status text,
  p_reason text,
  p_evidence_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entry record;
  v_sheet public.teacher_attendance_monthly_sheets;
  v_is_owner boolean := false;
  v_role text;
  v_adj_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_entry FROM public.teacher_attendance_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'entry_not_found'; END IF;

  v_sheet := public._tap_assert_sheet_open(v_entry.monthly_sheet_id);

  SELECT EXISTS(SELECT 1 FROM public.professors p WHERE p.id = v_sheet.professor_id AND p.user_id = v_uid)
    INTO v_is_owner;

  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id)
          OR is_rh(v_uid, v_sheet.organization_id) OR v_is_owner) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  v_role := CASE
    WHEN is_admin(v_uid) THEN 'admin'
    WHEN is_rh(v_uid, v_sheet.organization_id) THEN 'rh'
    WHEN is_coordinator(v_uid, v_sheet.organization_id) THEN 'coordinator'
    ELSE 'professor'
  END;

  INSERT INTO public.teacher_attendance_adjustments (
    organization_id, entry_id, monthly_sheet_id, requested_by, requested_by_role,
    request_type, previous_status, requested_status, reason, evidence_url
  ) VALUES (
    v_sheet.organization_id, p_entry_id, v_sheet.id, v_uid, v_role,
    p_request_type, v_entry.final_status, p_requested_status, p_reason, p_evidence_url
  ) RETURNING id INTO v_adj_id;

  INSERT INTO public.teacher_attendance_audit_logs (
    organization_id, monthly_sheet_id, entry_id, actor_user_id, actor_role, action, reason, new_values
  ) VALUES (
    v_sheet.organization_id, v_sheet.id, p_entry_id, v_uid, v_role,
    'request_adjustment', p_reason,
    jsonb_build_object('adjustment_id', v_adj_id, 'requested_status', p_requested_status, 'request_type', p_request_type)
  );

  RETURN jsonb_build_object('ok', true, 'adjustment_id', v_adj_id);
END $$;

-- ============================================================================
-- 2) REVIEW ADJUSTMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.review_teacher_attendance_adjustment(
  p_adjustment_id uuid,
  p_decision text,
  p_review_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_adj record;
  v_sheet public.teacher_attendance_monthly_sheets;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;

  SELECT * INTO v_adj FROM public.teacher_attendance_adjustments WHERE id = p_adjustment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'adjustment_not_found'; END IF;
  IF v_adj.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  v_sheet := public._tap_assert_sheet_open(v_adj.monthly_sheet_id);

  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  v_role := CASE WHEN is_admin(v_uid) THEN 'admin'
                 WHEN is_rh(v_uid, v_sheet.organization_id) THEN 'rh'
                 ELSE 'coordinator' END;

  UPDATE public.teacher_attendance_adjustments
  SET status = p_decision, reviewed_by = v_uid, reviewed_at = now(),
      review_notes = p_review_notes, updated_at = now()
  WHERE id = p_adjustment_id;

  IF p_decision = 'approved' THEN
    UPDATE public.teacher_attendance_entries
    SET manual_status      = v_adj.requested_status,
        final_status       = v_adj.requested_status,
        is_manual_adjusted = true,
        adjustment_reason  = v_adj.reason,
        adjusted_by        = v_uid,
        adjusted_at        = now(),
        updated_at         = now()
    WHERE id = v_adj.entry_id;

    PERFORM public.recalculate_teacher_attendance_monthly_sheet(v_sheet.id);
  END IF;

  INSERT INTO public.teacher_attendance_audit_logs (
    organization_id, monthly_sheet_id, entry_id, actor_user_id, actor_role,
    action, reason, new_values
  ) VALUES (
    v_sheet.organization_id, v_sheet.id, v_adj.entry_id, v_uid, v_role,
    'review_adjustment_' || p_decision, p_review_notes,
    jsonb_build_object('adjustment_id', p_adjustment_id, 'decision', p_decision)
  );

  RETURN jsonb_build_object('ok', true, 'adjustment_id', p_adjustment_id, 'decision', p_decision);
END $$;

-- ============================================================================
-- 3) SUBMIT FOR REVIEW
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_teacher_attendance_sheet_for_review(
  p_monthly_sheet_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_sheet := public._tap_assert_sheet_open(p_monthly_sheet_id);
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'under_review',
      submitted_for_review_at = now(),
      closure_notes = COALESCE(p_notes, closure_notes),
      updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'submit_for_review', p_notes);

  -- Notificação (best effort)
  BEGIN
    INSERT INTO public.notifications (organization_id, recipient_id, type, title, body, data)
    SELECT v_sheet.organization_id, ur.user_id, 'info',
      'Folha de presença em revisão',
      'Uma folha mensal de presença docente foi enviada para revisão.',
      jsonb_build_object('sheet_id', p_monthly_sheet_id)
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','coordenador','rh');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('ok', true, 'status', 'under_review');
END $$;

-- ============================================================================
-- 4) APPROVE COORDINATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_teacher_attendance_sheet_coordination(
  p_monthly_sheet_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_sheet := public._tap_assert_sheet_open(p_monthly_sheet_id);
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  INSERT INTO public.teacher_attendance_closure_signatures (
    organization_id, monthly_sheet_id, signed_by, signed_by_role, signature_type, notes
  ) VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid,
    CASE WHEN is_admin(v_uid) THEN 'admin' ELSE 'coordinator' END,
    'coordination_review', p_notes);

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'approved_by_coordination', updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'approve_coordination', p_notes);

  RETURN jsonb_build_object('ok', true, 'status', 'approved_by_coordination');
END $$;

-- ============================================================================
-- 5) APPROVE RH
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_teacher_attendance_sheet_rh(
  p_monthly_sheet_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;
  IF v_sheet.status = 'closed' THEN RAISE EXCEPTION 'sheet_closed'; END IF;
  IF NOT (is_admin(v_uid) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  INSERT INTO public.teacher_attendance_closure_signatures (
    organization_id, monthly_sheet_id, signed_by, signed_by_role, signature_type, notes
  ) VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid,
    CASE WHEN is_admin(v_uid) THEN 'admin' ELSE 'rh' END,
    'rh_review', p_notes);

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'approved_by_rh', updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'approve_rh', p_notes);

  RETURN jsonb_build_object('ok', true, 'status', 'approved_by_rh');
END $$;

-- ============================================================================
-- 6) CLOSE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.close_teacher_attendance_monthly_sheet(
  p_monthly_sheet_id uuid,
  p_closure_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
  v_pending int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;
  IF v_sheet.status = 'closed' THEN RAISE EXCEPTION 'sheet_already_closed'; END IF;
  IF NOT (is_admin(v_uid) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT COUNT(*) INTO v_pending
  FROM public.teacher_attendance_entries
  WHERE monthly_sheet_id = p_monthly_sheet_id
    AND final_status IN ('pending','manual_review_required');

  IF v_pending > 0 AND NOT is_admin(v_uid) THEN
    RAISE EXCEPTION 'sheet_has_pending_items: %', v_pending;
  END IF;

  IF v_pending > 0 AND is_admin(v_uid)
     AND (p_closure_notes IS NULL OR length(trim(p_closure_notes)) = 0) THEN
    RAISE EXCEPTION 'override_reason_required';
  END IF;

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'closed', closed_by = v_uid, closed_at = now(),
      closure_notes = COALESCE(p_closure_notes, closure_notes), updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_closure_signatures (
    organization_id, monthly_sheet_id, signed_by, signed_by_role, signature_type, notes
  ) VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid,
    CASE WHEN is_admin(v_uid) THEN 'admin' ELSE 'rh' END,
    'admin_closure', p_closure_notes);

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason, new_values)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'close_sheet', p_closure_notes,
          jsonb_build_object('pending_at_closure', v_pending));

  RETURN jsonb_build_object('ok', true, 'status', 'closed', 'pending_at_closure', v_pending);
END $$;

-- ============================================================================
-- 7) REOPEN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reopen_teacher_attendance_monthly_sheet(
  p_monthly_sheet_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;
  IF v_sheet.status <> 'closed' THEN RAISE EXCEPTION 'sheet_not_closed'; END IF;
  IF NOT (is_admin(v_uid) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'reopened', reopened_by = v_uid, reopened_at = now(),
      closure_notes = p_reason, updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_closure_signatures (
    organization_id, monthly_sheet_id, signed_by, signed_by_role, signature_type, notes
  ) VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid,
    CASE WHEN is_admin(v_uid) THEN 'admin' ELSE 'rh' END,
    'reopening_authorization', p_reason);

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'reopen_sheet', p_reason);

  RETURN jsonb_build_object('ok', true, 'status', 'reopened');
END $$;

-- Revoga acesso anônimo
REVOKE EXECUTE ON FUNCTION public.request_teacher_attendance_adjustment(uuid,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_teacher_attendance_adjustment(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_teacher_attendance_sheet_for_review(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_teacher_attendance_sheet_coordination(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_teacher_attendance_sheet_rh(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_teacher_attendance_monthly_sheet(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reopen_teacher_attendance_monthly_sheet(uuid,text) FROM anon;
