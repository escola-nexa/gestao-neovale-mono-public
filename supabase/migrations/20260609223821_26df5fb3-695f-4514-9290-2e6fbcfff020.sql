
CREATE OR REPLACE FUNCTION public.generate_teacher_attendance_monthly_sheet(
  p_organization_id uuid,
  p_professor_id uuid,
  p_reference_year integer,
  p_reference_month integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sheet_id uuid;
  v_uid uuid := auth.uid();
  v_is_self boolean := EXISTS (
    SELECT 1 FROM public.professors pr
    WHERE pr.id = p_professor_id
      AND pr.user_id = v_uid
      AND pr.organization_id = p_organization_id
  );
BEGIN
  IF NOT (
    is_admin(v_uid)
    OR is_coordinator(v_uid, p_organization_id)
    OR is_rh(v_uid, p_organization_id)
    OR v_is_self
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  v_sheet_id := public.generate_teacher_attendance_sheet(p_organization_id, p_professor_id, p_reference_year, p_reference_month);
  PERFORM public.recalculate_teacher_attendance_monthly_sheet(v_sheet_id);

  INSERT INTO public.teacher_attendance_audit_logs (organization_id, monthly_sheet_id, actor_user_id, action, new_values)
  VALUES (p_organization_id, v_sheet_id, v_uid, 'generate_sheet',
    jsonb_build_object('professor_id', p_professor_id, 'year', p_reference_year, 'month', p_reference_month, 'self_service', v_is_self));

  RETURN v_sheet_id;
END;
$function$;
