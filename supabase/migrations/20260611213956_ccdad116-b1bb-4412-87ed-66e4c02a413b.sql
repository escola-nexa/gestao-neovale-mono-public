
CREATE OR REPLACE FUNCTION public.get_financial_dashboard(
  _org uuid,
  _start date DEFAULT NULL,
  _end date DEFAULT NULL,
  _school_id uuid DEFAULT NULL,
  _cost_center_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_start date := COALESCE(_start, (date_trunc('month', now()) - interval '5 months')::date);
  v_end   date := COALESCE(_end,   (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date);

  v_can boolean;

  v_sub_pending_count   int := 0;
  v_sub_pending_amount  numeric := 0;
  v_sub_overdue_count   int := 0;
  v_sub_overdue_amount  numeric := 0;
  v_sub_paid_amount     numeric := 0;
  v_account_balance     numeric := 0;

  v_flow         jsonb := '[]'::jsonb;
  v_by_category  jsonb := '[]'::jsonb;
  v_by_cc        jsonb := '[]'::jsonb;
  v_upcoming     jsonb := '[]'::jsonb;
  v_alerts       jsonb := '[]'::jsonb;
BEGIN
  -- Permissão
  v_can := public.is_admin_of_org(v_uid, _org)
        OR public.has_financial_permission(v_uid, 'financeiro.cadastros.visualizar', '{}'::jsonb)
        OR public.has_financial_permission(v_uid, 'financeiro.cadastros.gerenciar',  '{}'::jsonb);

  IF NOT v_can THEN
    RETURN jsonb_build_object('error', 'permission_denied');
  END IF;

  -- Substituições — pendentes (qualquer status que NÃO seja PAID/CANCELLED)
  SELECT COALESCE(count(*),0), COALESCE(sum(p.net_amount),0)
  INTO v_sub_pending_count, v_sub_pending_amount
  FROM public.teacher_substitution_payments p
  LEFT JOIN public.teacher_substitution_requests r ON r.id = p.substitution_request_id
  WHERE p.organization_id = _org
    AND COALESCE(p.payment_status,'PENDING') NOT IN ('PAID','PAGO','CANCELLED','CANCELADO')
    AND (_school_id IS NULL OR r.school_id = _school_id);

  -- Substituições — vencidas (scheduled_for < today e ainda não pagas)
  SELECT COALESCE(count(*),0), COALESCE(sum(p.net_amount),0)
  INTO v_sub_overdue_count, v_sub_overdue_amount
  FROM public.teacher_substitution_payments p
  LEFT JOIN public.teacher_substitution_requests r ON r.id = p.substitution_request_id
  WHERE p.organization_id = _org
    AND COALESCE(p.payment_status,'PENDING') NOT IN ('PAID','PAGO','CANCELLED','CANCELADO')
    AND p.scheduled_for IS NOT NULL
    AND p.scheduled_for::date < CURRENT_DATE
    AND (_school_id IS NULL OR r.school_id = _school_id);

  -- Substituições — pagas no período
  SELECT COALESCE(sum(p.net_amount),0)
  INTO v_sub_paid_amount
  FROM public.teacher_substitution_payments p
  LEFT JOIN public.teacher_substitution_requests r ON r.id = p.substitution_request_id
  WHERE p.organization_id = _org
    AND p.payment_status IN ('PAID','PAGO')
    AND p.paid_at IS NOT NULL
    AND p.paid_at::date BETWEEN v_start AND v_end
    AND (_school_id IS NULL OR r.school_id = _school_id);

  -- Saldo agregado de contas ativas
  SELECT COALESCE(sum(current_balance),0)
  INTO v_account_balance
  FROM public.financial_accounts
  WHERE organization_id = _org AND active = true;

  -- Série mensal: saídas = pagamentos pagos por mês (substituições)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
  INTO v_flow
  FROM (
    SELECT
      to_char(date_trunc('month', m), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN p.payment_status IN ('PAID','PAGO') THEN p.net_amount ELSE 0 END), 0) AS expense,
      0::numeric AS income
    FROM generate_series(date_trunc('month', v_start), date_trunc('month', v_end), interval '1 month') m
    LEFT JOIN public.teacher_substitution_payments p
      ON p.organization_id = _org
     AND date_trunc('month', p.paid_at) = m
     AND p.payment_status IN ('PAID','PAGO')
    GROUP BY m
  ) t;

  -- Próximos vencimentos (substituições com scheduled_for nos próximos 30 dias)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.due_at), '[]'::jsonb)
  INTO v_upcoming
  FROM (
    SELECT
      p.id,
      p.payee_name AS title,
      p.net_amount AS amount,
      p.scheduled_for AS due_at,
      COALESCE(p.payment_status,'PENDING') AS status,
      'substitution'::text AS source
    FROM public.teacher_substitution_payments p
    LEFT JOIN public.teacher_substitution_requests r ON r.id = p.substitution_request_id
    WHERE p.organization_id = _org
      AND COALESCE(p.payment_status,'PENDING') NOT IN ('PAID','PAGO','CANCELLED','CANCELADO')
      AND p.scheduled_for IS NOT NULL
      AND p.scheduled_for::date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE + 30
      AND (_school_id IS NULL OR r.school_id = _school_id)
    ORDER BY p.scheduled_for ASC
    LIMIT 10
  ) t;

  -- Alertas: pagamentos sem comprovante e vencidos
  v_alerts := jsonb_build_array();

  IF v_sub_overdue_count > 0 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'severity','high',
      'title','Substituições vencidas',
      'message', v_sub_overdue_count || ' pagamento(s) com data passada e ainda não pagos.',
      'amount', v_sub_overdue_amount
    );
  END IF;

  DECLARE
    v_no_proof int;
  BEGIN
    SELECT COUNT(*) INTO v_no_proof
    FROM public.teacher_substitution_payments
    WHERE organization_id = _org
      AND payment_status IN ('PAID','PAGO')
      AND payment_proof_document_id IS NULL;

    IF v_no_proof > 0 THEN
      v_alerts := v_alerts || jsonb_build_object(
        'severity','medium',
        'title','Pagamentos sem comprovante',
        'message', v_no_proof || ' pagamento(s) concluído(s) sem comprovante anexado.'
      );
    END IF;
  END;

  -- Estrutura final
  RETURN jsonb_build_object(
    'period', jsonb_build_object('start', v_start, 'end', v_end),
    'kpis', jsonb_build_object(
      'total_a_pagar',     v_sub_pending_amount,
      'vencido',           v_sub_overdue_amount,
      'a_receber',         0,
      'recebido',          0,
      'pago_periodo',      v_sub_paid_amount,
      'saldo_projetado',   v_account_balance - v_sub_pending_amount,
      'saldo_contas',      v_account_balance
    ),
    'substitutions', jsonb_build_object(
      'pending_count',  v_sub_pending_count,
      'pending_amount', v_sub_pending_amount,
      'overdue_count',  v_sub_overdue_count,
      'overdue_amount', v_sub_overdue_amount
    ),
    'flow_by_month',       v_flow,
    'expenses_by_category', v_by_category,
    'expenses_by_cost_center', v_by_cc,
    'upcoming',            v_upcoming,
    'alerts',              v_alerts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_financial_dashboard(uuid, date, date, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, date, date, uuid, uuid, uuid) TO authenticated;
