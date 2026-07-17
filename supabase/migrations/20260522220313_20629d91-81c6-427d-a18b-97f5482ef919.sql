
ALTER TABLE public.teacher_attendance_monthly_sheets
  ADD COLUMN IF NOT EXISTS professor_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS professor_acknowledged_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.teacher_attendance_settings
  ADD COLUMN IF NOT EXISTS require_professor_acknowledgement boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.acknowledge_teacher_attendance_monthly_sheet(
  p_monthly_sheet_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sheet RECORD;
  v_prof_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_sheet FROM teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sheet_not_found'; END IF;

  SELECT id INTO v_prof_id FROM professors
    WHERE auth_user_id = v_uid AND organization_id = v_sheet.organization_id
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
$$;

REVOKE ALL ON FUNCTION public.acknowledge_teacher_attendance_monthly_sheet(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.acknowledge_teacher_attendance_monthly_sheet(uuid) TO authenticated;
