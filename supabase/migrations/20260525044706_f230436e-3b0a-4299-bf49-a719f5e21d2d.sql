-- =====================================================================
-- 1) link_teacher_substitution_to_attendance_entry
-- =====================================================================
CREATE OR REPLACE FUNCTION public.link_teacher_substitution_to_attendance_entry(
  p_substitution_request_id uuid,
  p_teacher_attendance_entry_id uuid,
  p_annual_class_occurrence_id uuid DEFAULT NULL,
  p_mark_as_justified boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_req public.teacher_substitution_requests%ROWTYPE;
  v_entry public.teacher_attendance_entries%ROWTYPE;
  v_occ_id uuid;
BEGIN
  PERFORM public._tsr_assert_manager(p_substitution_request_id);

  SELECT * INTO v_req FROM public.teacher_substitution_requests
   WHERE id = p_substitution_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de substituição não encontrada';
  END IF;

  SELECT * INTO v_entry FROM public.teacher_attendance_entries
   WHERE id = p_teacher_attendance_entry_id
     AND organization_id = v_req.organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada de folha não encontrada na mesma organização';
  END IF;

  -- Cria/atualiza ocorrência
  INSERT INTO public.teacher_substitution_occurrences(
    organization_id, substitution_request_id,
    annual_class_occurrence_id, teacher_attendance_entry_id,
    substituted_professor_id, substitute_professor_id,
    school_id, course_id, class_group_id, subject_id,
    scheduled_date, scheduled_start_at, scheduled_end_at,
    class_hours, hour_class_value, execution_status
  ) VALUES (
    v_req.organization_id, p_substitution_request_id,
    COALESCE(p_annual_class_occurrence_id, v_entry.annual_class_occurrence_id),
    p_teacher_attendance_entry_id,
    v_req.substituted_professor_id, v_req.substitute_professor_id,
    v_entry.school_id, v_entry.course_id, v_entry.class_group_id, v_entry.subject_id,
    v_entry.scheduled_date, v_entry.scheduled_start_at, v_entry.scheduled_end_at,
    1, COALESCE(v_req.hour_class_value, 0), 'pending'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_occ_id;

  IF v_occ_id IS NULL THEN
    SELECT id INTO v_occ_id
      FROM public.teacher_substitution_occurrences
     WHERE substitution_request_id = p_substitution_request_id
       AND teacher_attendance_entry_id = p_teacher_attendance_entry_id
     LIMIT 1;
  END IF;

  -- Marca aula original como falta justificada (substituído), sem duplicar pagamento
  IF p_mark_as_justified THEN
    UPDATE public.teacher_attendance_entries
       SET manual_status = 'justified_absence',
           final_status = 'justified_absence',
           is_manual_adjusted = true,
           adjustment_reason = COALESCE(adjustment_reason,
             'Aula coberta pela substituição ' || v_req.substitution_code),
           metadata = COALESCE(metadata, '{}'::jsonb)
             || jsonb_build_object(
               'substitution_request_id', v_req.id,
               'substitution_code', v_req.substitution_code,
               'linked_at', now()
             )
     WHERE id = p_teacher_attendance_entry_id;
  END IF;

  -- Auditoria
  INSERT INTO public.teacher_substitution_audit_logs(
    organization_id, substitution_request_id, actor_id, action, payload
  ) VALUES (
    v_req.organization_id, v_req.id, auth.uid(),
    'link_attendance_entry',
    jsonb_build_object(
      'teacher_attendance_entry_id', p_teacher_attendance_entry_id,
      'occurrence_id', v_occ_id,
      'marked_as_justified', p_mark_as_justified
    )
  );

  RETURN v_occ_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_teacher_substitution_to_attendance_entry(uuid, uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_teacher_substitution_to_attendance_entry(uuid, uuid, uuid, boolean) TO authenticated;

-- =====================================================================
-- 2) get_teacher_substitution_dashboard_kpis
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_teacher_substitution_dashboard_kpis(
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_result jsonb;
BEGIN
  v_org := public.get_user_organization_id(auth.uid());
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Sem organização';
  END IF;

  WITH base AS (
    SELECT r.*
      FROM public.teacher_substitution_requests r
     WHERE r.organization_id = v_org
       AND (p_month IS NULL OR EXTRACT(MONTH FROM r.absence_date)::int = p_month)
       AND (p_year IS NULL OR EXTRACT(YEAR FROM r.absence_date)::int = p_year)
       AND (p_school_id IS NULL OR r.school_id = p_school_id)
  ),
  pay AS (
    SELECT p.*
      FROM public.teacher_substitution_payments p
      JOIN base b ON b.id = p.substitution_request_id
  )
  SELECT jsonb_build_object(
    'requested', (SELECT COUNT(*) FROM base),
    'confirmed', (SELECT COUNT(*) FROM base WHERE substitute_professor_id IS NOT NULL OR substitute_confirmed_at IS NOT NULL),
    'executed', (SELECT COUNT(*) FROM base WHERE status IN ('execution_completed','signed_report_uploaded','approved_for_payment','payment_scheduled','payment_completed')),
    'pending_signed_report', (SELECT COUNT(*) FROM base WHERE status = 'execution_completed' AND documentation_status <> 'complete'),
    'approved_for_payment', (SELECT COUNT(*) FROM base WHERE status IN ('approved_for_payment','payment_scheduled','payment_completed')),
    'paid', (SELECT COUNT(*) FROM base WHERE status = 'payment_completed'),
    'cancelled', (SELECT COUNT(*) FROM base WHERE status = 'cancelled'),
    'total_calculated', COALESCE((SELECT SUM(total_amount) FROM base WHERE status <> 'cancelled'), 0),
    'total_pending', COALESCE((SELECT SUM(total_amount) FROM base WHERE status NOT IN ('payment_completed','cancelled')), 0),
    'total_paid', COALESCE((SELECT SUM(total_amount) FROM base WHERE status = 'payment_completed'), 0),
    'avg_hours_to_confirmation', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (substitute_confirmed_at - created_at))/3600.0)::numeric, 2)
        FROM base WHERE substitute_confirmed_at IS NOT NULL
    ),
    'avg_hours_to_payment', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (p.paid_at - b.created_at))/3600.0)::numeric, 2)
        FROM pay p JOIN base b ON b.id = p.substitution_request_id
       WHERE p.paid_at IS NOT NULL
    ),
    'filters', jsonb_build_object('month', p_month, 'year', p_year, 'school_id', p_school_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_substitution_dashboard_kpis(integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_substitution_dashboard_kpis(integer, integer, uuid) TO authenticated;

-- =====================================================================
-- 3) get_teacher_substitution_bi_report
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_teacher_substitution_bi_report(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid,
  substitution_code text,
  status text,
  workflow_phase text,
  payment_status text,
  documentation_status text,
  absence_date date,
  school_id uuid,
  school_name text,
  course_name text,
  class_group_name text,
  subject_name text,
  substituted_professor_name text,
  substitute_professor_name text,
  total_class_hours numeric,
  hour_class_value numeric,
  total_amount numeric,
  paid_at timestamptz,
  hours_to_confirmation numeric,
  hours_to_payment numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  v_org := public.get_user_organization_id(auth.uid());
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Sem organização';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.substitution_code,
    r.status,
    r.workflow_phase,
    r.payment_status,
    r.documentation_status,
    r.absence_date,
    r.school_id,
    r.school_name_snapshot,
    r.course_name_snapshot,
    r.class_group_name_snapshot,
    r.subject_name_snapshot,
    r.substituted_professor_name,
    r.substitute_professor_name,
    r.total_class_hours,
    r.hour_class_value,
    r.total_amount,
    p.paid_at,
    CASE WHEN r.substitute_confirmed_at IS NOT NULL
         THEN ROUND(EXTRACT(EPOCH FROM (r.substitute_confirmed_at - r.created_at))/3600.0, 2)
         ELSE NULL END,
    CASE WHEN p.paid_at IS NOT NULL
         THEN ROUND(EXTRACT(EPOCH FROM (p.paid_at - r.created_at))/3600.0, 2)
         ELSE NULL END,
    r.created_at
  FROM public.teacher_substitution_requests r
  LEFT JOIN public.teacher_substitution_payments p ON p.substitution_request_id = r.id
  WHERE r.organization_id = v_org
    AND (p_from IS NULL OR r.absence_date >= p_from)
    AND (p_to   IS NULL OR r.absence_date <= p_to)
    AND (p_school_id IS NULL OR r.school_id = p_school_id)
  ORDER BY r.absence_date DESC, r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_substitution_bi_report(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_substitution_bi_report(date, date, uuid) TO authenticated;