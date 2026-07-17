
-- ============================================================
-- FASE 5: Tesouraria e Conciliação Bancária
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.bank_transaction_status AS ENUM ('PENDING','PARTIALLY_RECONCILED','RECONCILED','IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bank_transaction_direction AS ENUM ('CREDIT','DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.import_batch_status AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED','PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transfer_status AS ENUM ('PENDING','COMPLETED','CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) Import Batches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('OFX','CSV')),
  storage_path TEXT,
  status public.import_batch_status NOT NULL DEFAULT 'PENDING',
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_details JSONB,
  period_start DATE,
  period_end DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_import_batches TO authenticated;
GRANT ALL ON public.financial_import_batches TO service_role;

ALTER TABLE public.financial_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fib_org_isolation" ON public.financial_import_batches
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 2) Bank Transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  import_batch_id UUID REFERENCES public.financial_import_batches(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  posted_at TIMESTAMPTZ,
  amount NUMERIC(18,2) NOT NULL,
  direction public.bank_transaction_direction NOT NULL,
  description TEXT,
  document_number TEXT,
  payer_payee_name TEXT,
  payer_payee_document TEXT,
  fitid TEXT,
  memo TEXT,
  reference TEXT,
  dedupe_hash TEXT NOT NULL,
  status public.bank_transaction_status NOT NULL DEFAULT 'PENDING',
  reconciled_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, dedupe_hash)
);

CREATE INDEX IF NOT EXISTS idx_fbt_account_date ON public.financial_bank_transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_fbt_status ON public.financial_bank_transactions(status) WHERE status <> 'RECONCILED';
CREATE INDEX IF NOT EXISTS idx_fbt_org ON public.financial_bank_transactions(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_bank_transactions TO authenticated;
GRANT ALL ON public.financial_bank_transactions TO service_role;

ALTER TABLE public.financial_bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fbt_org_isolation" ON public.financial_bank_transactions
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE TRIGGER trg_fbt_updated_at BEFORE UPDATE ON public.financial_bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) Reconciliations (N:N entre bank_transactions e installments/payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES public.financial_bank_transactions(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.financial_installments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.financial_payments(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  match_method TEXT NOT NULL CHECK (match_method IN ('AUTO','MANUAL')),
  match_score NUMERIC(5,2),
  notes TEXT,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),
  undo_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_recon_bt ON public.financial_reconciliations(bank_transaction_id) WHERE undone_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recon_inst ON public.financial_reconciliations(installment_id) WHERE undone_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_reconciliations TO authenticated;
GRANT ALL ON public.financial_reconciliations TO service_role;

ALTER TABLE public.financial_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fr_org_isolation" ON public.financial_reconciliations
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 4) Transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  destination_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference TEXT,
  status public.transfer_status NOT NULL DEFAULT 'COMPLETED',
  source_payment_id UUID REFERENCES public.financial_payments(id),
  destination_payment_id UUID REFERENCES public.financial_payments(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  CHECK (source_account_id <> destination_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ft_org ON public.financial_transfers(organization_id, transfer_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transfers TO authenticated;
GRANT ALL ON public.financial_transfers TO service_role;

ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ft_org_isolation" ON public.financial_transfers
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 5) Helper: recompute bank transaction status
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_bank_transaction_status(_bt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
  v_reconciled NUMERIC;
  v_status public.bank_transaction_status;
BEGIN
  SELECT ABS(amount) INTO v_total FROM public.financial_bank_transactions WHERE id = _bt_id;
  SELECT COALESCE(SUM(amount),0) INTO v_reconciled
    FROM public.financial_reconciliations
    WHERE bank_transaction_id = _bt_id AND undone_at IS NULL;

  IF v_reconciled <= 0 THEN
    v_status := 'PENDING';
  ELSIF v_reconciled >= v_total THEN
    v_status := 'RECONCILED';
  ELSE
    v_status := 'PARTIALLY_RECONCILED';
  END IF;

  UPDATE public.financial_bank_transactions
    SET reconciled_amount = v_reconciled,
        status = v_status,
        updated_at = now()
    WHERE id = _bt_id;
END $$;

-- ============================================================
-- 6) RPC: import_bank_transactions (dedupe by hash)
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_bank_transactions(
  _account_id UUID,
  _file_name TEXT,
  _file_format TEXT,
  _transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_batch_id UUID;
  v_tx JSONB;
  v_hash TEXT;
  v_inserted INT := 0;
  v_dupes INT := 0;
  v_failed INT := 0;
  v_total INT := 0;
  v_min_date DATE;
  v_max_date DATE;
  v_amount NUMERIC;
  v_date DATE;
  v_direction public.bank_transaction_direction;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.importar') THEN
    RAISE EXCEPTION 'Sem permissão para importar extratos';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.financial_accounts WHERE id = _account_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;

  INSERT INTO public.financial_import_batches(organization_id, account_id, file_name, file_format, status, created_by)
  VALUES (v_org_id, _account_id, _file_name, _file_format, 'PROCESSING', auth.uid())
  RETURNING id INTO v_batch_id;

  FOR v_tx IN SELECT * FROM jsonb_array_elements(_transactions) LOOP
    v_total := v_total + 1;
    BEGIN
      v_amount := (v_tx->>'amount')::NUMERIC;
      v_date := (v_tx->>'transaction_date')::DATE;
      v_direction := CASE WHEN v_amount >= 0 THEN 'CREDIT'::public.bank_transaction_direction
                          ELSE 'DEBIT'::public.bank_transaction_direction END;

      -- hash: account+date+amount+fitid/memo
      v_hash := encode(digest(
        _account_id::TEXT || '|' || v_date::TEXT || '|' || v_amount::TEXT || '|' ||
        COALESCE(v_tx->>'fitid', v_tx->>'memo', v_tx->>'description', ''),
        'sha256'
      ), 'hex');

      IF v_min_date IS NULL OR v_date < v_min_date THEN v_min_date := v_date; END IF;
      IF v_max_date IS NULL OR v_date > v_max_date THEN v_max_date := v_date; END IF;

      BEGIN
        INSERT INTO public.financial_bank_transactions(
          organization_id, account_id, import_batch_id, transaction_date,
          amount, direction, description, document_number,
          payer_payee_name, payer_payee_document, fitid, memo, reference,
          dedupe_hash, raw_data
        ) VALUES (
          v_org_id, _account_id, v_batch_id, v_date,
          v_amount, v_direction, v_tx->>'description', v_tx->>'document_number',
          v_tx->>'payer_payee_name', v_tx->>'payer_payee_document',
          v_tx->>'fitid', v_tx->>'memo', v_tx->>'reference',
          v_hash, v_tx
        );
        v_inserted := v_inserted + 1;
      EXCEPTION WHEN unique_violation THEN
        v_dupes := v_dupes + 1;
      END;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.financial_import_batches
    SET status = CASE WHEN v_failed > 0 AND v_inserted = 0 THEN 'FAILED'
                      WHEN v_failed > 0 THEN 'PARTIAL'
                      ELSE 'COMPLETED' END,
        total_rows = v_total,
        imported_rows = v_inserted,
        duplicate_rows = v_dupes,
        failed_rows = v_failed,
        period_start = v_min_date,
        period_end = v_max_date,
        completed_at = now()
    WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'total', v_total,
    'imported', v_inserted,
    'duplicates', v_dupes,
    'failed', v_failed
  );
END $$;

-- ============================================================
-- 7) RPC: reconcile_bank_transaction (manual, supports 1:N partial)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reconcile_bank_transaction(
  _bank_transaction_id UUID,
  _matches JSONB,  -- [{installment_id, amount, payment_id?}]
  _method TEXT DEFAULT 'MANUAL',
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_bt_total NUMERIC;
  v_already NUMERIC;
  v_new_total NUMERIC := 0;
  v_match JSONB;
  v_count INT := 0;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.conciliar') THEN
    RAISE EXCEPTION 'Sem permissão para conciliar';
  END IF;

  SELECT organization_id, ABS(amount) INTO v_org_id, v_bt_total
    FROM public.financial_bank_transactions WHERE id = _bank_transaction_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Transação não encontrada'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_already
    FROM public.financial_reconciliations
    WHERE bank_transaction_id = _bank_transaction_id AND undone_at IS NULL;

  FOR v_match IN SELECT * FROM jsonb_array_elements(_matches) LOOP
    v_new_total := v_new_total + (v_match->>'amount')::NUMERIC;
  END LOOP;

  IF v_already + v_new_total > v_bt_total + 0.01 THEN
    RAISE EXCEPTION 'Valor concilia excede o valor da transação (% > %)', v_already + v_new_total, v_bt_total;
  END IF;

  FOR v_match IN SELECT * FROM jsonb_array_elements(_matches) LOOP
    INSERT INTO public.financial_reconciliations(
      organization_id, bank_transaction_id, installment_id, payment_id,
      amount, match_method, match_score, notes, reconciled_by
    ) VALUES (
      v_org_id, _bank_transaction_id,
      NULLIF(v_match->>'installment_id','')::UUID,
      NULLIF(v_match->>'payment_id','')::UUID,
      (v_match->>'amount')::NUMERIC,
      _method,
      NULLIF(v_match->>'match_score','')::NUMERIC,
      _notes,
      auth.uid()
    );
    v_count := v_count + 1;
  END LOOP;

  PERFORM public.recompute_bank_transaction_status(_bank_transaction_id);

  RETURN jsonb_build_object('matches', v_count);
END $$;

-- ============================================================
-- 8) RPC: unreconcile (com justificativa)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unreconcile_bank_transaction(
  _reconciliation_id UUID,
  _reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bt_id UUID;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.conciliar') THEN
    RAISE EXCEPTION 'Sem permissão para desfazer conciliação';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)';
  END IF;

  UPDATE public.financial_reconciliations
    SET undone_at = now(),
        undone_by = auth.uid(),
        undo_reason = _reason
    WHERE id = _reconciliation_id AND undone_at IS NULL
    RETURNING bank_transaction_id INTO v_bt_id;

  IF v_bt_id IS NULL THEN RAISE EXCEPTION 'Conciliação não encontrada ou já desfeita'; END IF;
  PERFORM public.recompute_bank_transaction_status(v_bt_id);
END $$;

-- ============================================================
-- 9) RPC: auto_reconcile (Estrito: valor exato + data ±3 dias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_reconcile_bank_transactions(
  _account_id UUID,
  _date_from DATE DEFAULT NULL,
  _date_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_bt RECORD;
  v_inst_id UUID;
  v_matches INT := 0;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.conciliar') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.financial_accounts WHERE id = _account_id;

  FOR v_bt IN
    SELECT * FROM public.financial_bank_transactions
    WHERE account_id = _account_id
      AND status = 'PENDING'
      AND (_date_from IS NULL OR transaction_date >= _date_from)
      AND (_date_to IS NULL OR transaction_date <= _date_to)
  LOOP
    -- procura exatamente UMA parcela com valor igual e vencimento ±3 dias, ainda aberta
    SELECT i.id INTO v_inst_id
      FROM public.financial_installments i
      JOIN public.financial_entries e ON e.id = i.entry_id
     WHERE e.organization_id = v_org_id
       AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
       AND ABS(i.amount - i.paid_amount) = ABS(v_bt.amount)
       AND i.due_date BETWEEN v_bt.transaction_date - INTERVAL '3 days'
                          AND v_bt.transaction_date + INTERVAL '3 days'
       AND NOT EXISTS (
         SELECT 1 FROM public.financial_reconciliations r
         WHERE r.installment_id = i.id AND r.undone_at IS NULL
       )
     LIMIT 2;

    -- só auto-concilia se houver match único
    IF FOUND AND (SELECT COUNT(*) FROM (
      SELECT i.id FROM public.financial_installments i
        JOIN public.financial_entries e ON e.id = i.entry_id
       WHERE e.organization_id = v_org_id
         AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
         AND ABS(i.amount - i.paid_amount) = ABS(v_bt.amount)
         AND i.due_date BETWEEN v_bt.transaction_date - INTERVAL '3 days'
                            AND v_bt.transaction_date + INTERVAL '3 days'
       LIMIT 2
    ) x) = 1 THEN
      INSERT INTO public.financial_reconciliations(
        organization_id, bank_transaction_id, installment_id,
        amount, match_method, match_score, reconciled_by
      ) VALUES (
        v_org_id, v_bt.id, v_inst_id,
        ABS(v_bt.amount), 'AUTO', 100, auth.uid()
      );
      PERFORM public.recompute_bank_transaction_status(v_bt.id);
      v_matches := v_matches + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('auto_matched', v_matches);
END $$;

-- ============================================================
-- 10) RPC: create_financial_transfer (2 movimentações vinculadas, neutro no resultado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_financial_transfer(
  _source_account_id UUID,
  _destination_account_id UUID,
  _amount NUMERIC,
  _transfer_date DATE,
  _description TEXT DEFAULT NULL,
  _reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_transfer_id UUID;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.transferir') THEN
    RAISE EXCEPTION 'Sem permissão para transferir';
  END IF;
  IF _source_account_id = _destination_account_id THEN
    RAISE EXCEPTION 'Conta origem e destino devem ser diferentes';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  SELECT organization_id INTO v_org_id FROM public.financial_accounts WHERE id = _source_account_id;

  INSERT INTO public.financial_transfers(
    organization_id, source_account_id, destination_account_id,
    amount, transfer_date, description, reference, status, created_by
  ) VALUES (
    v_org_id, _source_account_id, _destination_account_id,
    _amount, _transfer_date, _description, _reference, 'COMPLETED', auth.uid()
  ) RETURNING id INTO v_transfer_id;

  -- atualiza saldos (saída + entrada)
  UPDATE public.financial_accounts SET current_balance = current_balance - _amount WHERE id = _source_account_id;
  UPDATE public.financial_accounts SET current_balance = current_balance + _amount WHERE id = _destination_account_id;

  RETURN v_transfer_id;
END $$;

-- ============================================================
-- 11) RPC: cancel transfer (estorno)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_financial_transfer(
  _transfer_id UUID,
  _reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_t RECORD;
BEGIN
  IF NOT public.has_financial_permission(auth.uid(), 'financeiro.tesouraria.transferir') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Justificativa obrigatória';
  END IF;

  SELECT * INTO v_t FROM public.financial_transfers WHERE id = _transfer_id AND status = 'COMPLETED';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada ou já cancelada'; END IF;

  UPDATE public.financial_transfers
    SET status = 'CANCELED',
        canceled_at = now(),
        canceled_by = auth.uid(),
        cancel_reason = _reason
    WHERE id = _transfer_id;

  UPDATE public.financial_accounts SET current_balance = current_balance + v_t.amount WHERE id = v_t.source_account_id;
  UPDATE public.financial_accounts SET current_balance = current_balance - v_t.amount WHERE id = v_t.destination_account_id;
END $$;

-- ============================================================
-- 12) RPC: get_account_balances (atual + conciliado + projetado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_account_balances(
  _horizon_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  account_id UUID,
  account_name TEXT,
  current_balance NUMERIC,
  reconciled_balance NUMERIC,
  pending_in NUMERIC,
  pending_out NUMERIC,
  projected_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := public.get_user_organization_id(auth.uid());
  v_horizon DATE := CURRENT_DATE + (_horizon_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.current_balance,
    a.current_balance - COALESCE((
      SELECT SUM(ABS(bt.amount)) FROM public.financial_bank_transactions bt
      WHERE bt.account_id = a.id AND bt.status <> 'RECONCILED'
    ),0) AS reconciled_balance,
    COALESCE((
      SELECT SUM(i.amount - i.paid_amount)
      FROM public.financial_installments i
      JOIN public.financial_entries e ON e.id = i.entry_id
      WHERE e.organization_id = v_org_id
        AND e.kind = 'RECEIVABLE'
        AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
        AND i.due_date <= v_horizon
    ),0) AS pending_in,
    COALESCE((
      SELECT SUM(i.amount - i.paid_amount)
      FROM public.financial_installments i
      JOIN public.financial_entries e ON e.id = i.entry_id
      WHERE e.organization_id = v_org_id
        AND e.kind = 'PAYABLE'
        AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
        AND i.due_date <= v_horizon
    ),0) AS pending_out,
    a.current_balance
      + COALESCE((
          SELECT SUM(i.amount - i.paid_amount)
          FROM public.financial_installments i
          JOIN public.financial_entries e ON e.id = i.entry_id
          WHERE e.organization_id = v_org_id
            AND e.kind = 'RECEIVABLE'
            AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
            AND i.due_date <= v_horizon
        ),0)
      - COALESCE((
          SELECT SUM(i.amount - i.paid_amount)
          FROM public.financial_installments i
          JOIN public.financial_entries e ON e.id = i.entry_id
          WHERE e.organization_id = v_org_id
            AND e.kind = 'PAYABLE'
            AND i.status IN ('OPEN','PARTIALLY_PAID','OVERDUE')
            AND i.due_date <= v_horizon
        ),0) AS projected_balance
  FROM public.financial_accounts a
  WHERE a.organization_id = v_org_id
    AND a.is_active = true
  ORDER BY a.name;
END $$;

GRANT EXECUTE ON FUNCTION public.import_bank_transactions(UUID,TEXT,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_transaction(UUID,JSONB,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unreconcile_bank_transaction(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_reconcile_bank_transactions(UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_financial_transfer(UUID,UUID,NUMERIC,DATE,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_financial_transfer(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_balances(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_bank_transaction_status(UUID) TO authenticated;
