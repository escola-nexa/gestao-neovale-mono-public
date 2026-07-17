CREATE OR REPLACE FUNCTION public.log_teacher_attendance_pdf_generated(p_monthly_sheet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet RECORD;
  v_prof_uid uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;

  SELECT user_id INTO v_prof_uid FROM professors WHERE id = v_sheet.professor_id;

  IF v_prof_uid = v_uid THEN
    v_role := 'professor';
  ELSIF has_role(v_uid, 'admin'::app_role) THEN
    v_role := 'admin';
  ELSIF has_role(v_uid, 'coordenador'::app_role) THEN
    v_role := 'coordenador';
  ELSIF has_role(v_uid, 'rh'::app_role) THEN
    v_role := 'rh';
  ELSE
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF v_role <> 'professor' AND NOT has_organization_access(v_uid, v_sheet.organization_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  INSERT INTO teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, actor_role, action, reason)
  VALUES (v_sheet.organization_id, p_monthly_sheet_id, v_uid, v_role, 'pdf_generated', 'PDF da folha mensal gerado');

  RETURN jsonb_build_object('ok', true);
END;
$function$;