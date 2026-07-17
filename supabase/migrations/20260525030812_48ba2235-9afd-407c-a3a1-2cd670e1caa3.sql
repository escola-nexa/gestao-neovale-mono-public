CREATE OR REPLACE FUNCTION public._emit_teacher_attendance_notifications(p_sheet_id uuid, p_type text, p_title text, p_message text, p_audience text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sheet RECORD;
  v_user uuid;
  v_prof_uid uuid;
BEGIN
  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_sheet_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF cardinality(p_audience) > 0 THEN
    FOR v_user IN
      SELECT DISTINCT ur.user_id
        FROM user_roles ur
       WHERE ur.organization_id = v_sheet.organization_id
         AND ur.role::text = ANY(p_audience)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (v_user, p_title, p_message, p_type, p_sheet_id);
    END LOOP;
  END IF;

  IF 'professor' = ANY(p_audience) THEN
    SELECT user_id INTO v_prof_uid FROM professors WHERE id = v_sheet.professor_id;
    IF v_prof_uid IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, reference_id)
      VALUES (v_prof_uid, p_title, p_message, p_type, p_sheet_id);
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.acknowledge_teacher_attendance_monthly_sheet(p_monthly_sheet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet RECORD;
  v_prof_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;

  SELECT id INTO v_prof_id FROM professors
    WHERE user_id = v_uid AND organization_id = v_sheet.organization_id
    LIMIT 1;
  IF v_prof_id IS NULL OR v_prof_id <> v_sheet.professor_id THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  UPDATE teacher_attendance_monthly_sheets
     SET professor_acknowledged_at = now(),
         professor_acknowledged_by = v_uid,
         updated_at = now()
   WHERE id = p_monthly_sheet_id;

  INSERT INTO teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, actor_role, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, 'professor', 'professor_acknowledged', 'Ciência registrada pelo professor');

  RETURN jsonb_build_object('ok', true, 'acknowledged_at', now());
END;
$function$;