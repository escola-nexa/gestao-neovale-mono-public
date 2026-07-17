
DO $$ BEGIN CREATE TYPE public.financial_payment_kind AS ENUM ('payment','reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_batch_status AS ENUM ('draft','sent','processed','partially_processed','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_batch_item_status AS ENUM ('pending','success','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ financial_payments ============
CREATE TABLE IF NOT EXISTS public.financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  installment_id uuid NOT NULL REFERENCES public.financial_installments(id) ON DELETE RESTRICT,
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  kind public.financial_payment_kind NOT NULL DEFAULT 'payment',
  amount numeric(14,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  account_id uuid REFERENCES public.financial_accounts(id),
  payment_method_id uuid REFERENCES public.financial_payment_methods(id),
  reference text,
  notes text,
  reversal_of_id uuid REFERENCES public.financial_payments(id),
  reversal_reason text,
  batch_item_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payments TO authenticated;
GRANT ALL ON public.financial_payments TO service_role;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select_org" ON public.financial_payments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "fp_modify_admin_or_perm" ON public.financial_payments FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin')
      OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')
      OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.estornar'))
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin')
      OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')
      OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.estornar'))
  );

CREATE INDEX IF NOT EXISTS idx_fp_installment ON public.financial_payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_fp_entry ON public.financial_payments(entry_id);
CREATE INDEX IF NOT EXISTS idx_fp_reversal_of ON public.financial_payments(reversal_of_id);
CREATE INDEX IF NOT EXISTS idx_fp_org_date ON public.financial_payments(organization_id, payment_date DESC);

ALTER TABLE public.financial_attachments
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.financial_payments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_fa_payment ON public.financial_attachments(payment_id);

-- ============ batches ============
CREATE TABLE IF NOT EXISTS public.financial_payment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  method_type text NOT NULL DEFAULT 'pix',
  status public.financial_batch_status NOT NULL DEFAULT 'draft',
  account_id uuid REFERENCES public.financial_accounts(id),
  scheduled_for date,
  sent_at timestamptz,
  processed_at timestamptz,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payment_batches TO authenticated;
GRANT ALL ON public.financial_payment_batches TO service_role;
ALTER TABLE public.financial_payment_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpb_select_org" ON public.financial_payment_batches FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "fpb_modify" ON public.financial_payment_batches FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')));

CREATE TABLE IF NOT EXISTS public.financial_payment_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.financial_payment_batches(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  installment_id uuid NOT NULL REFERENCES public.financial_installments(id) ON DELETE RESTRICT,
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE RESTRICT,
  party_id uuid REFERENCES public.financial_parties(id),
  amount numeric(14,2) NOT NULL,
  pix_key text,
  pix_key_type text,
  pix_key_override boolean NOT NULL DEFAULT false,
  status public.financial_batch_item_status NOT NULL DEFAULT 'pending',
  error_message text,
  payment_id uuid REFERENCES public.financial_payments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, installment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payment_batch_items TO authenticated;
GRANT ALL ON public.financial_payment_batch_items TO service_role;
ALTER TABLE public.financial_payment_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpbi_select_org" ON public.financial_payment_batch_items FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "fpbi_modify" ON public.financial_payment_batch_items FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')));

ALTER TABLE public.financial_payments
  ADD CONSTRAINT financial_payments_batch_item_fk
  FOREIGN KEY (batch_item_id) REFERENCES public.financial_payment_batch_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fpbi_batch ON public.financial_payment_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_fpbi_installment ON public.financial_payment_batch_items(installment_id);
CREATE INDEX IF NOT EXISTS idx_fpb_org_status ON public.financial_payment_batches(organization_id, status);

-- ============ Recalc + trigger ============
CREATE OR REPLACE FUNCTION public._recalc_installment_and_entry(p_installment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry uuid; v_amount numeric; v_paid numeric;
  v_total_entry numeric; v_paid_entry numeric;
  v_inst_status public.financial_installment_status;
  v_entry_status public.financial_entry_status;
  v_current public.financial_entry_status;
BEGIN
  SELECT entry_id, amount INTO v_entry, v_amount FROM financial_installments WHERE id = p_installment;
  IF v_entry IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM financial_payments WHERE installment_id = p_installment;
  IF v_paid <= 0 THEN v_inst_status := 'pending';
  ELSIF v_paid >= v_amount THEN v_inst_status := 'paid';
  ELSE v_inst_status := 'partially_paid';
  END IF;
  UPDATE financial_installments
    SET paid_amount = GREATEST(v_paid,0), status = v_inst_status,
        paid_at = CASE WHEN v_inst_status='paid' THEN now() ELSE NULL END, updated_at = now()
    WHERE id = p_installment;
  SELECT total_amount, status INTO v_total_entry, v_current FROM financial_entries WHERE id = v_entry;
  SELECT COALESCE(SUM(GREATEST(paid_amount,0)),0) INTO v_paid_entry FROM financial_installments WHERE entry_id = v_entry;
  IF v_current IN ('cancelled','reversed','draft','pending_approval') THEN RETURN; END IF;
  IF v_paid_entry <= 0 THEN v_entry_status := 'approved';
  ELSIF v_paid_entry >= v_total_entry THEN v_entry_status := 'paid';
  ELSE v_entry_status := 'partially_paid';
  END IF;
  UPDATE financial_entries SET status = v_entry_status, updated_at = now() WHERE id = v_entry;
END $$;

CREATE OR REPLACE FUNCTION public._tg_fp_recalc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._recalc_installment_and_entry(COALESCE(NEW.installment_id, OLD.installment_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_fp_recalc ON public.financial_payments;
CREATE TRIGGER trg_fp_recalc AFTER INSERT OR UPDATE OR DELETE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public._tg_fp_recalc();

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.register_financial_payment(
  p_installment_id uuid, p_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE, p_account_id uuid DEFAULT NULL,
  p_payment_method_id uuid DEFAULT NULL, p_reference text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_entry uuid; v_inst_amount numeric; v_paid numeric;
  v_status public.financial_entry_status; v_pay_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Valor deve ser maior que zero'; END IF;
  SELECT i.organization_id, i.entry_id, i.amount,
         COALESCE((SELECT SUM(amount) FROM financial_payments WHERE installment_id=i.id),0)
    INTO v_org, v_entry, v_inst_amount, v_paid
  FROM financial_installments i WHERE i.id = p_installment_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Parcela não encontrada'; END IF;
  IF v_org <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')) THEN
    RAISE EXCEPTION 'Sem permissão para pagar contas';
  END IF;
  SELECT status INTO v_status FROM financial_entries WHERE id = v_entry;
  IF v_status NOT IN ('approved','scheduled','partially_paid','overdue') THEN
    RAISE EXCEPTION 'Título precisa estar aprovado (status atual: %)', v_status;
  END IF;
  IF (v_paid + p_amount) > v_inst_amount + 0.005 THEN
    RAISE EXCEPTION 'Pagamento excede o saldo da parcela (saldo: %)', (v_inst_amount - v_paid);
  END IF;
  INSERT INTO financial_payments(organization_id, installment_id, entry_id, kind, amount,
    payment_date, account_id, payment_method_id, reference, notes, created_by)
  VALUES (v_org, p_installment_id, v_entry, 'payment', p_amount,
    COALESCE(p_payment_date, CURRENT_DATE), p_account_id, p_payment_method_id, p_reference, p_notes, auth.uid())
  RETURNING id INTO v_pay_id;
  RETURN v_pay_id;
END $$;

CREATE OR REPLACE FUNCTION public.reverse_financial_payment(p_payment_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_orig record; v_existing uuid; v_new_id uuid;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  SELECT * INTO v_orig FROM financial_payments WHERE id = p_payment_id;
  IF v_orig.id IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF v_orig.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.estornar')) THEN
    RAISE EXCEPTION 'Sem permissão para estornar';
  END IF;
  IF v_orig.kind = 'reversal' THEN RAISE EXCEPTION 'Não é possível estornar um estorno'; END IF;
  SELECT id INTO v_existing FROM financial_payments WHERE reversal_of_id = p_payment_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'Pagamento já estornado'; END IF;
  INSERT INTO financial_payments(organization_id, installment_id, entry_id, kind, amount,
    payment_date, account_id, payment_method_id, reference, notes, reversal_of_id, reversal_reason, created_by)
  VALUES (v_orig.organization_id, v_orig.installment_id, v_orig.entry_id, 'reversal', -v_orig.amount,
    CURRENT_DATE, v_orig.account_id, v_orig.payment_method_id, v_orig.reference,
    'Estorno do pagamento ' || v_orig.id::text, p_payment_id, p_reason, auth.uid())
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_financial_payment_batch(
  p_name text, p_method_type text, p_installment_ids uuid[],
  p_account_id uuid DEFAULT NULL, p_scheduled_for date DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid := public.get_user_organization_id(auth.uid()); v_batch uuid; v_inst RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF p_installment_ids IS NULL OR array_length(p_installment_ids,1) = 0 THEN RAISE EXCEPTION 'Nenhuma parcela informada'; END IF;
  INSERT INTO financial_payment_batches(organization_id,name,method_type,account_id,scheduled_for,notes,created_by)
  VALUES (v_org, p_name, COALESCE(p_method_type,'pix'), p_account_id, p_scheduled_for, p_notes, auth.uid())
  RETURNING id INTO v_batch;
  FOR v_inst IN
    SELECT i.id AS installment_id, i.entry_id, i.amount, i.paid_amount,
           e.party_id, e.status AS entry_status, p.pix_key, p.pix_key_type
    FROM financial_installments i
    JOIN financial_entries e ON e.id = i.entry_id
    LEFT JOIN financial_parties p ON p.id = e.party_id
    WHERE i.id = ANY(p_installment_ids) AND i.organization_id = v_org
  LOOP
    IF v_inst.entry_status NOT IN ('approved','scheduled','partially_paid','overdue') THEN
      RAISE EXCEPTION 'Título da parcela % não está aprovado (status %)', v_inst.installment_id, v_inst.entry_status;
    END IF;
    INSERT INTO financial_payment_batch_items(batch_id,organization_id,installment_id,entry_id,party_id,amount,pix_key,pix_key_type)
    VALUES (v_batch, v_org, v_inst.installment_id, v_inst.entry_id, v_inst.party_id,
      GREATEST(v_inst.amount - COALESCE(v_inst.paid_amount,0),0), v_inst.pix_key, v_inst.pix_key_type);
  END LOOP;
  RETURN v_batch;
END $$;

CREATE OR REPLACE FUNCTION public.update_batch_item_pix_override(p_item_id uuid, p_pix_key text, p_pix_key_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE financial_payment_batch_items
    SET pix_key=p_pix_key, pix_key_type=p_pix_key_type, pix_key_override=true, updated_at=now()
    WHERE id=p_item_id AND organization_id = public.get_user_organization_id(auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.mark_financial_payment_batch_sent(p_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE financial_payment_batches
    SET status='sent', sent_at=now(), updated_at=now()
    WHERE id=p_batch_id AND organization_id = public.get_user_organization_id(auth.uid()) AND status='draft';
END $$;

CREATE OR REPLACE FUNCTION public.process_financial_payment_batch_item(
  p_item_id uuid, p_success boolean, p_error_message text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE, p_reference text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item RECORD; v_batch RECORD; v_pay_id uuid;
  v_total int; v_ok int; v_fail int; v_pending int; v_status public.financial_batch_status;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.pagar')) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO v_item FROM financial_payment_batch_items
    WHERE id=p_item_id AND organization_id = public.get_user_organization_id(auth.uid());
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Item não encontrado'; END IF;
  IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'Item já processado'; END IF;
  SELECT * INTO v_batch FROM financial_payment_batches WHERE id = v_item.batch_id;
  IF p_success THEN
    v_pay_id := public.register_financial_payment(
      v_item.installment_id, v_item.amount, COALESCE(p_payment_date, CURRENT_DATE),
      v_batch.account_id, NULL, p_reference, 'Pagamento via lote ' || v_batch.name);
    UPDATE financial_payments SET batch_item_id = p_item_id WHERE id = v_pay_id;
    UPDATE financial_payment_batch_items SET status='success', payment_id=v_pay_id, error_message=NULL, updated_at=now() WHERE id=p_item_id;
  ELSE
    UPDATE financial_payment_batch_items SET status='failed', error_message=COALESCE(p_error_message,'Falha no processamento'), updated_at=now() WHERE id=p_item_id;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE status='success'), count(*) FILTER (WHERE status='failed'), count(*) FILTER (WHERE status='pending')
    INTO v_total, v_ok, v_fail, v_pending
    FROM financial_payment_batch_items WHERE batch_id = v_item.batch_id;
  IF v_pending > 0 THEN v_status := v_batch.status;
  ELSIF v_ok = v_total THEN v_status := 'processed';
  ELSIF v_fail = v_total THEN v_status := 'rejected';
  ELSE v_status := 'partially_processed';
  END IF;
  UPDATE financial_payment_batches
    SET status = v_status,
        processed_at = CASE WHEN v_pending=0 THEN now() ELSE processed_at END,
        updated_at = now()
    WHERE id = v_item.batch_id;
  RETURN v_pay_id;
END $$;
