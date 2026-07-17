
DO $$ BEGIN CREATE TYPE public.financial_entry_kind AS ENUM ('payable','receivable'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_entry_status AS ENUM ('draft','pending_approval','approved','scheduled','partially_paid','paid','overdue','cancelled','reversed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_installment_status AS ENUM ('pending','scheduled','partially_paid','paid','overdue','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_approval_action AS ENUM ('submitted','approved','returned','cancelled','reversed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  kind public.financial_entry_kind NOT NULL DEFAULT 'payable',
  status public.financial_entry_status NOT NULL DEFAULT 'draft',
  document_number text, description text NOT NULL, notes text,
  party_id uuid REFERENCES public.financial_parties(id) ON DELETE RESTRICT,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  payment_method_id uuid REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
  competence_date date NOT NULL, issue_date date NOT NULL DEFAULT CURRENT_DATE, due_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
  installments_count int NOT NULL DEFAULT 1 CHECK (installments_count > 0),
  recurrence jsonb, source_kind text, source_id uuid,
  created_by uuid NOT NULL,
  submitted_by uuid, submitted_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  cancelled_by uuid, cancelled_at timestamptz, cancellation_reason text,
  reversed_by uuid, reversed_at timestamptz, reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fin_entries_org ON public.financial_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_status ON public.financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_fin_entries_due ON public.financial_entries(due_date);

CREATE TABLE IF NOT EXISTS public.financial_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  installment_number int NOT NULL, due_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.financial_installment_status NOT NULL DEFAULT 'pending',
  scheduled_for date, paid_at timestamptz,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, installment_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_installments TO authenticated;
GRANT ALL ON public.financial_installments TO service_role;
ALTER TABLE public.financial_installments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fin_inst_entry ON public.financial_installments(entry_id);
CREATE INDEX IF NOT EXISTS idx_fin_inst_due ON public.financial_installments(due_date);

CREATE TABLE IF NOT EXISTS public.financial_entry_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.financial_projects(id) ON DELETE RESTRICT,
  school_id uuid REFERENCES public.schools(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  percentage numeric(6,3), notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entry_allocations TO authenticated;
GRANT ALL ON public.financial_entry_allocations TO service_role;
ALTER TABLE public.financial_entry_allocations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fin_alloc_entry ON public.financial_entry_allocations(entry_id);

CREATE TABLE IF NOT EXISTS public.financial_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  entry_id uuid REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.financial_installments(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'document',
  file_name text NOT NULL, file_path text NOT NULL,
  mime_type text, size_bytes int,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_attachments TO authenticated;
GRANT ALL ON public.financial_attachments TO service_role;
ALTER TABLE public.financial_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fin_attach_entry ON public.financial_attachments(entry_id);

CREATE TABLE IF NOT EXISTS public.financial_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  action public.financial_approval_action NOT NULL,
  actor_id uuid NOT NULL,
  reason text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_approvals TO authenticated;
GRANT ALL ON public.financial_approvals TO service_role;
ALTER TABLE public.financial_approvals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fin_appr_entry ON public.financial_approvals(entry_id);

CREATE TABLE IF NOT EXISTS public.financial_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.financial_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  source_kind text NOT NULL, source_id uuid NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_kind, source_id, entry_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_source_links TO authenticated;
GRANT ALL ON public.financial_source_links TO service_role;
ALTER TABLE public.financial_source_links ENABLE ROW LEVEL SECURITY;

INSERT INTO public.financial_permissions (key, name, category, action, description, is_sensitive)
VALUES
  ('financeiro.contas_pagar.visualizar', 'Visualizar contas a pagar', 'contas_pagar', 'view', 'Ver títulos e parcelas', false),
  ('financeiro.contas_pagar.criar', 'Criar contas a pagar', 'contas_pagar', 'create', 'Criar títulos manuais', false),
  ('financeiro.contas_pagar.editar', 'Editar contas a pagar', 'contas_pagar', 'edit', 'Editar títulos não pagos', false),
  ('financeiro.contas_pagar.aprovar', 'Aprovar contas a pagar', 'contas_pagar', 'approve', 'Aprovar títulos por alçada', true),
  ('financeiro.contas_pagar.cancelar', 'Cancelar contas a pagar', 'contas_pagar', 'cancel', 'Cancelar com justificativa', true),
  ('financeiro.contas_pagar.estornar', 'Estornar contas a pagar', 'contas_pagar', 'reverse', 'Reverter títulos pagos', true)
ON CONFLICT (key) DO NOTHING;

CREATE POLICY "fin_entries_select" ON public.financial_entries FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')));

CREATE POLICY "fin_entries_insert" ON public.financial_entries FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.criar')));

CREATE POLICY "fin_entries_update" ON public.financial_entries FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.editar')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.aprovar')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.cancelar')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.estornar')));

CREATE POLICY "fin_entries_delete" ON public.financial_entries FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(),'admin') AND status = 'draft');

CREATE POLICY "fin_inst_all" ON public.financial_installments FOR ALL TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')))
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "fin_alloc_all" ON public.financial_entry_allocations FOR ALL TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')))
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "fin_attach_all" ON public.financial_attachments FOR ALL TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')))
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "fin_appr_select" ON public.financial_approvals FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid())
  AND (public.has_role(auth.uid(),'admin')
       OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.visualizar')));

CREATE POLICY "fin_appr_insert" ON public.financial_approvals FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND actor_id = auth.uid());

CREATE POLICY "fin_src_all" ON public.financial_source_links FOR ALL TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE TRIGGER fin_entries_updated BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER fin_inst_updated BEFORE UPDATE ON public.financial_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_block_paid_entry_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.status = 'paid' AND (
    OLD.total_amount IS DISTINCT FROM NEW.total_amount
    OR OLD.party_id IS DISTINCT FROM NEW.party_id
    OR OLD.due_date IS DISTINCT FROM NEW.due_date
    OR OLD.category_id IS DISTINCT FROM NEW.category_id
  ) AND NEW.status NOT IN ('reversed') THEN
    RAISE EXCEPTION 'Título pago não pode ser editado diretamente. Use estorno.';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER fin_entries_block_paid BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_paid_entry_edit();

CREATE OR REPLACE FUNCTION public.fn_validate_entry_allocations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_total numeric(14,2); v_sum numeric(14,2); v_entry_id uuid;
BEGIN
  v_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT total_amount INTO v_total FROM public.financial_entries WHERE id = v_entry_id;
  IF v_total IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_sum FROM public.financial_entry_allocations WHERE entry_id = v_entry_id;
  IF v_sum > 0 AND v_sum <> v_total THEN
    RAISE EXCEPTION 'Soma dos rateios (%) difere do total do título (%).', v_sum, v_total;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE CONSTRAINT TRIGGER fin_alloc_validate
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_entry_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_entry_allocations();

CREATE OR REPLACE FUNCTION public.fn_audit_financial_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_events (event_type, entity_type, entity_id, user_id, organization_id, payload)
  VALUES (TG_OP, 'financial_entry',
    COALESCE(NEW.id, OLD.id), auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status,
                       'old_total', OLD.total_amount, 'new_total', NEW.total_amount));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER fin_entries_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_financial_entry();

CREATE OR REPLACE FUNCTION public.generate_entry_installments(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries; v_amount numeric(14,2); v_remaining numeric(14,2); v_per numeric(14,2); i int;
BEGIN
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.id IS NULL THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  DELETE FROM public.financial_installments WHERE entry_id = _entry_id;
  v_per := round(v_entry.total_amount / v_entry.installments_count, 2);
  v_remaining := v_entry.total_amount;
  FOR i IN 1..v_entry.installments_count LOOP
    v_amount := CASE WHEN i = v_entry.installments_count THEN v_remaining ELSE v_per END;
    v_remaining := v_remaining - v_amount;
    INSERT INTO public.financial_installments(entry_id, organization_id, installment_number, due_date, amount, status)
    VALUES (_entry_id, v_entry.organization_id, i,
      (v_entry.due_date + ((i-1) || ' month')::interval)::date, v_amount, 'pending');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_financial_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries;
BEGIN
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.id IS NULL THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  IF v_entry.status <> 'draft' THEN RAISE EXCEPTION 'Apenas rascunhos podem ser enviados para aprovação'; END IF;
  IF v_entry.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  UPDATE public.financial_entries SET status='pending_approval', submitted_by=auth.uid(), submitted_at=now() WHERE id=_entry_id;
  INSERT INTO public.financial_approvals(entry_id, organization_id, action, actor_id)
  VALUES (_entry_id, v_entry.organization_id, 'submitted', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.approve_financial_entry(_entry_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries; v_limit numeric(14,2);
BEGIN
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.id IS NULL THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  IF v_entry.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF v_entry.status <> 'pending_approval' THEN RAISE EXCEPTION 'Título não está pendente de aprovação'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
          OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.aprovar')) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar';
  END IF;
  IF v_entry.created_by = auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Quem cria o título não pode aprová-lo (segregação de função)';
  END IF;
  SELECT max_amount INTO v_limit FROM public.financial_approval_limits
   WHERE user_id = auth.uid() AND permission_key = 'financeiro.contas_pagar.aprovar' LIMIT 1;
  IF v_limit IS NOT NULL AND v_entry.total_amount > v_limit AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Valor do título (%) excede sua alçada de aprovação (%)', v_entry.total_amount, v_limit;
  END IF;
  UPDATE public.financial_entries SET status='approved', approved_by=auth.uid(), approved_at=now() WHERE id=_entry_id;
  IF NOT EXISTS (SELECT 1 FROM public.financial_installments WHERE entry_id = _entry_id) THEN
    PERFORM public.generate_entry_installments(_entry_id);
  END IF;
  INSERT INTO public.financial_approvals(entry_id, organization_id, action, actor_id, reason)
  VALUES (_entry_id, v_entry.organization_id, 'approved', auth.uid(), _notes);
END $$;

CREATE OR REPLACE FUNCTION public.return_financial_entry(_entry_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)'; END IF;
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF v_entry.status <> 'pending_approval' THEN RAISE EXCEPTION 'Apenas títulos pendentes podem ser devolvidos'; END IF;
  UPDATE public.financial_entries SET status='draft' WHERE id=_entry_id;
  INSERT INTO public.financial_approvals(entry_id, organization_id, action, actor_id, reason)
  VALUES (_entry_id, v_entry.organization_id, 'returned', auth.uid(), _reason);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_financial_entry(_entry_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
          OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.cancelar')) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar';
  END IF;
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF v_entry.status IN ('paid','reversed','cancelled') THEN
    RAISE EXCEPTION 'Título não pode ser cancelado no estado atual (%)', v_entry.status;
  END IF;
  UPDATE public.financial_entries SET status='cancelled', cancelled_by=auth.uid(), cancelled_at=now(), cancellation_reason=_reason WHERE id=_entry_id;
  UPDATE public.financial_installments SET status='cancelled' WHERE entry_id=_entry_id AND status NOT IN ('paid');
  INSERT INTO public.financial_approvals(entry_id, organization_id, action, actor_id, reason)
  VALUES (_entry_id, v_entry.organization_id, 'cancelled', auth.uid(), _reason);
END $$;

CREATE OR REPLACE FUNCTION public.reverse_financial_entry(_entry_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.financial_entries;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
          OR public.has_financial_permission(auth.uid(),'financeiro.contas_pagar.estornar')) THEN
    RAISE EXCEPTION 'Sem permissão para estornar';
  END IF;
  SELECT * INTO v_entry FROM public.financial_entries WHERE id = _entry_id;
  IF v_entry.organization_id <> public.get_user_organization_id(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF v_entry.status NOT IN ('paid','partially_paid') THEN
    RAISE EXCEPTION 'Apenas títulos pagos/parcialmente pagos podem ser estornados';
  END IF;
  UPDATE public.financial_entries SET status='reversed', reversed_by=auth.uid(), reversed_at=now(), reversal_reason=_reason WHERE id=_entry_id;
  INSERT INTO public.financial_approvals(entry_id, organization_id, action, actor_id, reason)
  VALUES (_entry_id, v_entry.organization_id, 'reversed', auth.uid(), _reason);
END $$;
