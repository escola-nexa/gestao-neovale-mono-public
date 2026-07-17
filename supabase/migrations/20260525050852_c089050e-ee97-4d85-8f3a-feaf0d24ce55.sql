
CREATE OR REPLACE FUNCTION public.get_teacher_substitution_dashboard_kpis(
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_school_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org uuid;
  v_can_fin boolean;
  v_result jsonb;
BEGIN
  v_org := public.get_user_organization_id(auth.uid());
  IF v_org IS NULL THEN RAISE EXCEPTION 'Sem organização'; END IF;
  v_can_fin := public.can_access_teacher_substitution_financial(auth.uid(), v_org);

  WITH base AS (
    SELECT r.*
      FROM public.teacher_substitution_requests r
     WHERE r.organization_id = v_org
       AND (p_month IS NULL OR EXTRACT(MONTH FROM r.absence_date)::int = p_month)
       AND (p_year  IS NULL OR EXTRACT(YEAR  FROM r.absence_date)::int = p_year)
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
    'executed',  (SELECT COUNT(*) FROM base WHERE status IN ('execution_completed','signed_report_uploaded','approved_for_payment','payment_scheduled','payment_completed')),
    'pending_signed_report', (SELECT COUNT(*) FROM base WHERE status = 'execution_completed' AND documentation_status <> 'complete'),
    'approved_for_payment',  (SELECT COUNT(*) FROM base WHERE status IN ('approved_for_payment','payment_scheduled','payment_completed')),
    'paid',      (SELECT COUNT(*) FROM base WHERE status = 'payment_completed'),
    'cancelled', (SELECT COUNT(*) FROM base WHERE status = 'cancelled'),
    'total_calculated', CASE WHEN v_can_fin THEN COALESCE((SELECT SUM(total_amount) FROM base WHERE status <> 'cancelled'), 0) ELSE NULL END,
    'total_pending',    CASE WHEN v_can_fin THEN COALESCE((SELECT SUM(total_amount) FROM base WHERE status NOT IN ('payment_completed','cancelled')), 0) ELSE NULL END,
    'total_paid',       CASE WHEN v_can_fin THEN COALESCE((SELECT SUM(total_amount) FROM base WHERE status = 'payment_completed'), 0) ELSE NULL END,
    'avg_hours_to_confirmation', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (substitute_confirmed_at - created_at))/3600.0)::numeric, 2)
        FROM base WHERE substitute_confirmed_at IS NOT NULL
    ),
    'avg_hours_to_payment', CASE WHEN v_can_fin THEN (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (p.paid_at - b.created_at))/3600.0)::numeric, 2)
        FROM pay p JOIN base b ON b.id = p.substitution_request_id
       WHERE p.paid_at IS NOT NULL
    ) ELSE NULL END,
    'can_access_financial', v_can_fin,
    'filters', jsonb_build_object('month', p_month, 'year', p_year, 'school_id', p_school_id)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
