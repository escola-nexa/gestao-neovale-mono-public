
-- =========================================================
-- Fase 0A — Estabilizar Financeiro de Substituições
-- Estados oficiais: not_applicable, pending_calculation, calculated,
-- pending_documentation, pending_rh_validation, approved_for_payment,
-- payment_scheduled, paid, returned_for_correction, cancelled.
-- =========================================================

-- 1) Mapeamento defensivo de eventuais valores legados (no-op em base zerada)
UPDATE public.teacher_substitution_payments SET payment_status = CASE payment_status
  WHEN 'draft'     THEN 'pending_calculation'
  WHEN 'pending'   THEN 'pending_rh_validation'
  WHEN 'approved'  THEN 'approved_for_payment'
  WHEN 'scheduled' THEN 'payment_scheduled'
  WHEN 'returned'  THEN 'returned_for_correction'
  WHEN 'canceled'  THEN 'cancelled'
  ELSE payment_status
END
WHERE payment_status IN ('draft','pending','approved','scheduled','returned','canceled');

-- 2) Consolida duplicidades antes do índice único (mantém o pagamento mais "avançado")
WITH ranked AS (
  SELECT id, substitution_request_id, payment_status,
         row_number() OVER (
           PARTITION BY substitution_request_id
           ORDER BY CASE payment_status
             WHEN 'paid' THEN 0
             WHEN 'payment_scheduled' THEN 1
             WHEN 'approved_for_payment' THEN 2
             WHEN 'pending_rh_validation' THEN 3
             WHEN 'pending_documentation' THEN 4
             WHEN 'calculated' THEN 5
             WHEN 'pending_calculation' THEN 6
             WHEN 'returned_for_correction' THEN 7
             WHEN 'not_applicable' THEN 8
             WHEN 'cancelled' THEN 9
             ELSE 10
           END,
           created_at DESC) AS rn
  FROM public.teacher_substitution_payments
)
UPDATE public.teacher_substitution_payments p
SET payment_status = 'cancelled',
    notes = COALESCE(p.notes,'') || E'\n[auto 0A] duplicidade consolidada',
    updated_at = now()
FROM ranked
WHERE ranked.id = p.id
  AND ranked.rn > 1
  AND p.payment_status <> 'paid';

-- 3) CHECK constraint com os 10 estados oficiais
ALTER TABLE public.teacher_substitution_payments
  DROP CONSTRAINT IF EXISTS teacher_substitution_payments_status_check;
ALTER TABLE public.teacher_substitution_payments
  ADD CONSTRAINT teacher_substitution_payments_status_check
  CHECK (payment_status IN (
    'not_applicable','pending_calculation','calculated','pending_documentation',
    'pending_rh_validation','approved_for_payment','payment_scheduled','paid',
    'returned_for_correction','cancelled'
  ));

-- 4) Índice único: 1 pagamento por substitution_request_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_tsp_one_per_request
  ON public.teacher_substitution_payments(substitution_request_id);

-- 5) KPIs corrigidos para os estados oficiais
CREATE OR REPLACE FUNCTION public.get_teacher_substitution_financial_dashboard_kpis(
  p_year integer DEFAULT NULL, p_month integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_org uuid; v_result jsonb;
BEGIN
  v_org := get_user_organization_id(auth.uid());
  IF NOT can_access_teacher_substitution_financial(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501';
  END IF;

  WITH base AS (
    SELECT p.*
    FROM public.teacher_substitution_payments p
    WHERE p.organization_id = v_org
      AND (p_year  IS NULL OR EXTRACT(YEAR  FROM COALESCE(p.paid_at,p.approved_at,p.created_at))::int = p_year)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM COALESCE(p.paid_at,p.approved_at,p.created_at))::int = p_month)
  )
  SELECT jsonb_build_object(
    'count_not_applicable',        (SELECT count(*) FROM base WHERE payment_status='not_applicable'),
    'count_pending_calculation',   (SELECT count(*) FROM base WHERE payment_status='pending_calculation'),
    'count_calculated',            (SELECT count(*) FROM base WHERE payment_status='calculated'),
    'count_pending_documentation', (SELECT count(*) FROM base WHERE payment_status='pending_documentation'),
    'count_pending_rh_validation', (SELECT count(*) FROM base WHERE payment_status='pending_rh_validation'),
    'count_approved',              (SELECT count(*) FROM base WHERE payment_status='approved_for_payment'),
    'count_scheduled',             (SELECT count(*) FROM base WHERE payment_status='payment_scheduled'),
    'count_paid',                  (SELECT count(*) FROM base WHERE payment_status='paid'),
    'count_returned',              (SELECT count(*) FROM base WHERE payment_status='returned_for_correction'),
    'count_cancelled',             (SELECT count(*) FROM base WHERE payment_status='cancelled'),
    'count_pending', (
      SELECT count(*) FROM base WHERE payment_status IN
       ('pending_calculation','calculated','pending_documentation','pending_rh_validation',
        'approved_for_payment','payment_scheduled')
    ),
    'total_calculated', COALESCE((
      SELECT sum(net_amount) FROM base WHERE payment_status NOT IN ('not_applicable','cancelled')
    ), 0),
    'total_pending', COALESCE((
      SELECT sum(net_amount) FROM base WHERE payment_status IN
       ('calculated','pending_documentation','pending_rh_validation','approved_for_payment','payment_scheduled')
    ), 0),
    'total_paid', COALESCE((
      SELECT sum(net_amount) FROM base WHERE payment_status='paid'
    ), 0),
    'by_status', (
      SELECT COALESCE(jsonb_object_agg(payment_status, c), '{}'::jsonb)
      FROM (SELECT payment_status, count(*) c FROM base GROUP BY payment_status) s
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- 6) RPC paginada com filtros server-side (ano, mês, status, escola, beneficiário, CPF, período)
CREATE OR REPLACE FUNCTION public.list_teacher_substitution_payments_paged(
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_payee_search text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_org uuid; v_total bigint; v_rows jsonb; v_cpf text;
BEGIN
  v_org := get_user_organization_id(auth.uid());
  IF NOT can_access_teacher_substitution_financial(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501';
  END IF;

  v_cpf := NULLIF(regexp_replace(COALESCE(p_cpf,''), '\D', '', 'g'), '');

  WITH base AS (
    SELECT
      p.*,
      r.school_id              AS request_school_id,
      r.school_name_snapshot   AS request_school_name,
      r.substitution_code      AS request_code,
      r.substituted_professor_name,
      r.substitute_professor_name,
      r.request_date,
      r.absence_date,
      r.status                 AS request_status,
      COALESCE(p.paid_at, p.approved_at, p.created_at) AS ref_date
    FROM public.teacher_substitution_payments p
    LEFT JOIN public.teacher_substitution_requests r ON r.id = p.substitution_request_id
    WHERE p.organization_id = v_org
      AND (p_year  IS NULL OR EXTRACT(YEAR  FROM COALESCE(p.paid_at,p.approved_at,p.created_at))::int = p_year)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM COALESCE(p.paid_at,p.approved_at,p.created_at))::int = p_month)
      AND (p_status IS NULL OR p.payment_status = p_status)
      AND (p_school_id IS NULL OR r.school_id = p_school_id)
      AND (p_payee_search IS NULL OR p_payee_search = '' OR p.payee_name ILIKE '%'||p_payee_search||'%')
      AND (v_cpf IS NULL OR regexp_replace(COALESCE(p.payee_cpf,''), '\D', '', 'g') LIKE '%'||v_cpf||'%')
      AND (p_date_from IS NULL OR COALESCE(p.paid_at,p.approved_at,p.created_at)::date >= p_date_from)
      AND (p_date_to   IS NULL OR COALESCE(p.paid_at,p.approved_at,p.created_at)::date <= p_date_to)
  )
  SELECT count(*) INTO v_total FROM base;

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM base ORDER BY ref_date DESC NULLS LAST
    LIMIT  GREATEST(COALESCE(p_limit, 25), 0)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) b;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_teacher_substitution_payments_paged(
  integer,integer,text,uuid,text,text,date,date,integer,integer
) TO authenticated;
