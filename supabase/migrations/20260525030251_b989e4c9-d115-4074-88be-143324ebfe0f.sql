CREATE OR REPLACE FUNCTION public.get_teacher_attendance_monthly_sheet_details(p_monthly_sheet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sheet record;
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
  v_professor jsonb;
  v_entries jsonb;
  v_adjustments jsonb;
  v_signatures jsonb;
  v_audit jsonb;
BEGIN
  SELECT * INTO v_sheet FROM public.teacher_attendance_monthly_sheets WHERE id = p_monthly_sheet_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'sheet_not_found'); END IF;

  SELECT EXISTS(SELECT 1 FROM public.professors p WHERE p.id = v_sheet.professor_id AND p.user_id = v_uid) INTO v_is_owner;
  IF NOT (is_admin(v_uid) OR is_coordinator(v_uid, v_sheet.organization_id)
          OR is_rh(v_uid, v_sheet.organization_id) OR v_is_owner) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT to_jsonb(p) INTO v_professor
  FROM (SELECT id, full_name, cpf FROM public.professors WHERE id = v_sheet.professor_id) p;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.scheduled_start_at), '[]'::jsonb) INTO v_entries
  FROM (
    SELECT e.*,
           s.nome  AS school_name,
           c.nome  AS course_name,
           cg.nome AS class_group_name,
           sb.nome AS subject_name
    FROM public.teacher_attendance_entries e
    LEFT JOIN public.schools s ON s.id = e.school_id
    LEFT JOIN public.courses c ON c.id = e.course_id
    LEFT JOIN public.class_groups cg ON cg.id = e.class_group_id
    LEFT JOIN public.subjects sb ON sb.id = e.subject_id
    WHERE e.monthly_sheet_id = p_monthly_sheet_id
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_adjustments
  FROM public.teacher_attendance_adjustments a WHERE a.monthly_sheet_id = p_monthly_sheet_id;

  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC), '[]'::jsonb) INTO v_signatures
  FROM public.teacher_attendance_closure_signatures s WHERE s.monthly_sheet_id = p_monthly_sheet_id;

  -- Enriquecido com nome do autor da ação
  SELECT COALESCE(jsonb_agg(row_to_json(l) ORDER BY l.created_at DESC), '[]'::jsonb) INTO v_audit
  FROM (
    SELECT al.*,
           pr.full_name AS actor_name,
           pr.email     AS actor_email
    FROM public.teacher_attendance_audit_logs al
    LEFT JOIN public.profiles pr ON pr.user_id = al.actor_user_id
    WHERE al.monthly_sheet_id = p_monthly_sheet_id
  ) l;

  RETURN jsonb_build_object('ok', true, 'sheet', to_jsonb(v_sheet),
    'professor', v_professor, 'entries', v_entries,
    'adjustments', v_adjustments, 'signatures', v_signatures, 'audit_logs', v_audit);
END;
$function$;