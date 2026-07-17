
-- =================== ENUMS ===================
ALTER TYPE public.financial_entry_status ADD VALUE IF NOT EXISTS 'renegotiated';
ALTER TYPE public.financial_payment_kind ADD VALUE IF NOT EXISTS 'receipt';

-- =================== FINANCIAL_SETTINGS: defaults de recebível ===================
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS default_late_fee_percent numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS default_daily_interest_percent numeric NOT NULL DEFAULT 0.033,
  ADD COLUMN IF NOT EXISTS default_early_discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_early_discount_days integer NOT NULL DEFAULT 0;

-- =================== FINANCIAL_ENTRIES: regras por título + renegociação ===================
ALTER TABLE public.financial_entries
  ADD COLUMN IF NOT EXISTS late_fee_percent numeric,
  ADD COLUMN IF NOT EXISTS daily_interest_percent numeric,
  ADD COLUMN IF NOT EXISTS early_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS early_discount_days integer,
  ADD COLUMN IF NOT EXISTS renegotiated_from_id uuid REFERENCES public.financial_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renegotiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS renegotiated_by uuid,
  ADD COLUMN IF NOT EXISTS renegotiation_reason text;

CREATE INDEX IF NOT EXISTS idx_fin_entries_renegotiated_from ON public.financial_entries(renegotiated_from_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_kind_status_due ON public.financial_entries(kind, status, due_date);

-- =================== FINANCIAL_INSTALLMENTS: snapshot dos encargos ===================
ALTER TABLE public.financial_installments
  ADD COLUMN IF NOT EXISTS interest_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- =================== FINANCIAL_PAYMENTS: encargos por baixa ===================
ALTER TABLE public.financial_payments
  ADD COLUMN IF NOT EXISTS interest_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- =================== FUNÇÃO: cálculo de encargos ===================
CREATE OR REPLACE FUNCTION public.calculate_receivable_charges(
  p_installment_id uuid,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  days_overdue integer,
  base_amount numeric,
  late_fee numeric,
  interest numeric,
  discount numeric,
  total_due numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst RECORD;
  v_entry RECORD;
  v_settings RECORD;
  v_late_pct numeric;
  v_daily_pct numeric;
  v_disc_pct numeric;
  v_disc_days integer;
  v_remaining numeric;
  v_days integer;
  v_late numeric := 0;
  v_int numeric := 0;
  v_disc numeric := 0;
BEGIN
  SELECT i.*, e.organization_id AS org_id, e.kind AS entry_kind,
         e.late_fee_percent AS e_late, e.daily_interest_percent AS e_int,
         e.early_discount_percent AS e_disc, e.early_discount_days AS e_disc_days
    INTO v_inst
    FROM financial_installments i JOIN financial_entries e ON e.id=i.entry_id
    WHERE i.id = p_installment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;

  SELECT * INTO v_settings FROM financial_settings WHERE organization_id = v_inst.org_id;

  v_late_pct := COALESCE(v_inst.e_late, v_settings.default_late_fee_percent, 0);
  v_daily_pct := COALESCE(v_inst.e_int, v_settings.default_daily_interest_percent, 0);
  v_disc_pct := COALESCE(v_inst.e_disc, v_settings.default_early_discount_percent, 0);
  v_disc_days := COALESCE(v_inst.e_disc_days, v_settings.default_early_discount_days, 0);

  v_remaining := GREATEST(v_inst.amount - COALESCE(v_inst.paid_amount, 0), 0);
  v_days := (p_payment_date - v_inst.due_date);

  IF v_days > 0 THEN
    v_late := round(v_remaining * v_late_pct / 100.0, 2);
    v_int := round(v_remaining * v_daily_pct / 100.0 * v_days, 2);
  ELSIF v_days < 0 AND v_disc_days > 0 AND ABS(v_days) >= v_disc_days AND v_disc_pct > 0 THEN
    v_disc := round(v_remaining * v_disc_pct / 100.0, 2);
  END IF;

  RETURN QUERY SELECT v_days, v_remaining, v_late, v_int, v_disc,
                      GREATEST(v_remaining + v_late + v_int - v_disc, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.calculate_receivable_charges(uuid, date) TO authenticated;

-- =================== FUNÇÃO: baixa de recebível ===================
CREATE OR REPLACE FUNCTION public.register_financial_receipt(
  p_installment_id uuid,
  p_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_account_id uuid DEFAULT NULL,
  p_payment_method_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_interest numeric DEFAULT 0,
  p_late_fee numeric DEFAULT 0,
  p_discount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry uuid;
  v_org uuid;
  v_kind text;
  v_remaining numeric;
  v_paid_total numeric;
  v_total numeric;
  v_status financial_entry_status;
  v_inst_status financial_installment_status;
  v_payment_id uuid;
BEGIN
  SELECT i.entry_id, e.organization_id, e.kind::text, i.amount - COALESCE(i.paid_amount,0)
    INTO v_entry, v_org, v_kind, v_remaining
    FROM financial_installments i JOIN financial_entries e ON e.id=i.entry_id
    WHERE i.id = p_installment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;
  IF v_kind <> 'receivable' THEN RAISE EXCEPTION 'Parcela não é de contas a receber'; END IF;

  IF NOT public.has_financial_permission(auth.uid(), v_org, 'financeiro.contas_receber.baixar') THEN
    RAISE EXCEPTION 'Sem permissão para baixar recebível';
  END IF;

  IF p_amount <= 0 THEN RAISE EXCEPTION 'Valor deve ser positivo'; END IF;
  IF p_amount > v_remaining + 0.01 THEN
    RAISE EXCEPTION 'Valor (%) excede saldo (%)', p_amount, v_remaining;
  END IF;

  INSERT INTO financial_payments (
    organization_id, installment_id, entry_id, kind, amount, payment_date,
    account_id, payment_method_id, reference, notes,
    interest_amount, late_fee_amount, discount_amount, created_by
  ) VALUES (
    v_org, p_installment_id, v_entry, 'receipt', p_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    p_account_id, p_payment_method_id, p_reference, p_notes,
    COALESCE(p_interest, 0), COALESCE(p_late_fee, 0), COALESCE(p_discount, 0),
    auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- atualiza parcela
  UPDATE financial_installments
    SET paid_amount = COALESCE(paid_amount,0) + p_amount,
        interest_amount = interest_amount + COALESCE(p_interest,0),
        late_fee_amount = late_fee_amount + COALESCE(p_late_fee,0),
        discount_amount = discount_amount + COALESCE(p_discount,0),
        paid_at = CASE WHEN amount - (COALESCE(paid_amount,0) + p_amount) <= 0.01 THEN now() ELSE paid_at END,
        status = CASE
                   WHEN amount - (COALESCE(paid_amount,0) + p_amount) <= 0.01 THEN 'paid'::financial_installment_status
                   ELSE 'partially_paid'::financial_installment_status
                 END,
        updated_at = now()
    WHERE id = p_installment_id;

  -- atualiza saldo da conta
  IF p_account_id IS NOT NULL THEN
    UPDATE financial_accounts SET current_balance = current_balance + p_amount, updated_at=now()
      WHERE id = p_account_id;
  END IF;

  -- recalcula status do título
  SELECT total_amount INTO v_total FROM financial_entries WHERE id=v_entry;
  SELECT COALESCE(SUM(GREATEST(paid_amount,0)),0) INTO v_paid_total FROM financial_installments WHERE entry_id=v_entry;
  v_status := CASE
    WHEN v_paid_total >= v_total - 0.01 THEN 'paid'::financial_entry_status
    WHEN v_paid_total > 0 THEN 'partially_paid'::financial_entry_status
    ELSE 'approved'::financial_entry_status
  END;
  UPDATE financial_entries SET status = v_status, updated_at=now() WHERE id=v_entry;

  RETURN v_payment_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_financial_receipt(uuid,numeric,date,uuid,uuid,text,text,numeric,numeric,numeric) TO authenticated;

-- =================== FUNÇÃO: renegociação (novo título vinculado) ===================
CREATE OR REPLACE FUNCTION public.renegotiate_receivable_entry(
  p_entry_id uuid,
  p_reason text,
  p_total_amount numeric,
  p_first_due_date date,
  p_installments_count integer DEFAULT 1,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old RECORD;
  v_new uuid;
  v_each numeric;
  i integer;
BEGIN
  SELECT * INTO v_old FROM financial_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  IF v_old.kind <> 'receivable' THEN RAISE EXCEPTION 'Apenas títulos de recebível podem ser renegociados'; END IF;
  IF v_old.status IN ('paid','cancelled','reversed','renegotiated') THEN
    RAISE EXCEPTION 'Título no status % não pode ser renegociado', v_old.status;
  END IF;
  IF NOT public.has_financial_permission(auth.uid(), v_old.organization_id, 'financeiro.contas_receber.renegociar') THEN
    RAISE EXCEPTION 'Sem permissão para renegociar';
  END IF;
  IF p_installments_count < 1 THEN RAISE EXCEPTION 'Número de parcelas inválido'; END IF;
  IF p_total_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Motivo da renegociação é obrigatório (mín. 5 caracteres)';
  END IF;

  -- novo título
  INSERT INTO financial_entries (
    organization_id, kind, status, description, document_number,
    party_id, account_id, category_id, payment_method_id,
    competence_date, issue_date, due_date, total_amount, installments_count,
    notes, late_fee_percent, daily_interest_percent, early_discount_percent, early_discount_days,
    renegotiated_from_id, created_by
  ) VALUES (
    v_old.organization_id, 'receivable', 'approved',
    'Renegociação: ' || v_old.description,
    v_old.document_number,
    v_old.party_id, v_old.account_id, v_old.category_id, v_old.payment_method_id,
    CURRENT_DATE, CURRENT_DATE, p_first_due_date, p_total_amount, p_installments_count,
    p_notes, v_old.late_fee_percent, v_old.daily_interest_percent,
    v_old.early_discount_percent, v_old.early_discount_days,
    p_entry_id, auth.uid()
  ) RETURNING id INTO v_new;

  -- parcelas
  v_each := round(p_total_amount / p_installments_count, 2);
  FOR i IN 1..p_installments_count LOOP
    INSERT INTO financial_installments (
      entry_id, organization_id, installment_number, due_date, amount, status
    ) VALUES (
      v_new, v_old.organization_id, i,
      (p_first_due_date + ((i-1) || ' months')::interval)::date,
      CASE WHEN i = p_installments_count
           THEN p_total_amount - (v_each * (p_installments_count - 1))
           ELSE v_each END,
      'pending'::financial_installment_status
    );
  END LOOP;

  -- marca o original como renegociado e cancela parcelas em aberto
  UPDATE financial_entries
    SET status = 'renegotiated'::financial_entry_status,
        renegotiated_at = now(), renegotiated_by = auth.uid(),
        renegotiation_reason = p_reason, updated_at = now()
    WHERE id = p_entry_id;

  UPDATE financial_installments
    SET status = 'cancelled'::financial_installment_status, updated_at = now()
    WHERE entry_id = p_entry_id
      AND status IN ('pending','scheduled','partially_paid','overdue');

  RETURN v_new;
END;
$$;
GRANT EXECUTE ON FUNCTION public.renegotiate_receivable_entry(uuid,text,numeric,date,integer,text) TO authenticated;

-- =================== FUNÇÃO: recalcular vencidos (callable + idempotente) ===================
CREATE OR REPLACE FUNCTION public.recalculate_overdue_installments(p_organization uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE financial_installments i
      SET status = 'overdue'::financial_installment_status, updated_at = now()
      WHERE i.due_date < CURRENT_DATE
        AND i.status IN ('pending','scheduled','partially_paid')
        AND (p_organization IS NULL OR i.organization_id = p_organization)
      RETURNING entry_id
  ), upd_e AS (
    UPDATE financial_entries e
      SET status = 'overdue'::financial_entry_status, updated_at = now()
      WHERE e.id IN (SELECT DISTINCT entry_id FROM upd)
        AND e.status IN ('approved','scheduled','partially_paid')
      RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recalculate_overdue_installments(uuid) TO authenticated;
