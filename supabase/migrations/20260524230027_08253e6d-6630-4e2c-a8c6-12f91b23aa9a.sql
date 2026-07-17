CREATE OR REPLACE FUNCTION public.submit_teacher_attendance_sheet_for_review(
  p_monthly_sheet_id uuid,
  p_notes text DEFAULT NULL::text,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet public.teacher_attendance_monthly_sheets;
  v_entries int;
  v_pending int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_sheet := public._tap_assert_sheet_open(p_monthly_sheet_id);
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id) OR is_rh(v_uid, v_sheet.organization_id)) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT count(*), coalesce(sum(case when final_status = 'pending' then 1 else 0 end), 0)
    INTO v_entries, v_pending
  FROM public.teacher_attendance_entries
  WHERE monthly_sheet_id = p_monthly_sheet_id;

  IF v_entries = 0 THEN
    RAISE EXCEPTION 'sheet_has_no_entries';
  END IF;

  IF v_pending > 0 AND NOT p_force THEN
    RAISE EXCEPTION 'sheet_has_pending_items';
  END IF;

  IF p_force AND (p_notes IS NULL OR length(btrim(p_notes)) < 5) THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.teacher_attendance_monthly_sheets
  SET status = 'under_review',
      submitted_for_review_at = now(),
      closure_notes = COALESCE(p_notes, closure_notes),
      updated_at = now()
  WHERE id = p_monthly_sheet_id;

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, reason)
  VALUES (
    v_sheet.organization_id,
    p_monthly_sheet_id,
    v_uid,
    'submit_for_review',
    CASE WHEN p_force THEN coalesce(p_notes, '') || ' [forçado com ' || v_pending || ' pendência(s)]' ELSE p_notes END
  );

  BEGIN
    INSERT INTO public.notifications (organization_id, recipient_id, type, title, body, data)
    SELECT v_sheet.organization_id, ur.user_id, 'info',
      'Folha de presença em revisão',
      'Uma folha mensal de presença docente foi enviada para revisão.',
      jsonb_build_object(
        'sheet_id', p_monthly_sheet_id,
        'pending_items', v_pending,
        'forced', p_force
      )
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','coordenador','rh')
      AND ur.organization_id = v_sheet.organization_id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'under_review',
    'entries', v_entries,
    'pending', v_pending,
    'forced', p_force
  );
END $function$;