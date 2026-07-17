
-- =========================================================
-- Fase 3B: Integração Substituição × Contas a Pagar
-- =========================================================

-- 1) Settings: nova flag + defaults financeiros
ALTER TABLE public.teacher_substitution_settings
  ADD COLUMN IF NOT EXISTS use_financial_module boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_financial_category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_financial_cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_financial_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_financial_payment_method_id uuid REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL;

-- 2) Vínculo do pagamento ao título financeiro (1:1)
ALTER TABLE public.teacher_substitution_payments
  ADD COLUMN IF NOT EXISTS financial_entry_id uuid REFERENCES public.financial_entries(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tsp_financial_entry
  ON public.teacher_substitution_payments(financial_entry_id)
  WHERE financial_entry_id IS NOT NULL;

-- 3) Garante professor_id único por org em financial_parties (upsert idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_parties_org_professor
  ON public.financial_parties(organization_id, professor_id)
  WHERE professor_id IS NOT NULL;

-- 4) Função: cria (ou retorna) título financeiro para um pagamento de substituição
CREATE OR REPLACE FUNCTION public.create_payable_for_substitution_payment(p_payment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment   public.teacher_substitution_payments;
  v_request   public.teacher_substitution_requests;
  v_settings  public.teacher_substitution_settings;
  v_prof      public.professors;
  v_party_id  uuid;
  v_entry_id  uuid;
  v_due       date;
  v_desc      text;
BEGIN
  SELECT * INTO v_payment FROM public.teacher_substitution_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento % não encontrado', p_payment_id; END IF;

  -- idempotência
  IF v_payment.financial_entry_id IS NOT NULL THEN
    RETURN v_payment.financial_entry_id;
  END IF;

  SELECT * INTO v_request FROM public.teacher_substitution_requests WHERE id = v_payment.substitution_request_id;
  SELECT * INTO v_settings FROM public.teacher_substitution_settings WHERE organization_id = v_payment.organization_id;

  IF v_settings IS NULL OR COALESCE(v_settings.use_financial_module, false) = false THEN
    RETURN NULL; -- módulo financeiro desligado para a org
  END IF;

  -- Beneficiário: upsert em financial_parties pelo professor substituto (quando houver)
  IF v_payment.substitute_professor_id IS NOT NULL THEN
    SELECT * INTO v_prof FROM public.professors WHERE id = v_payment.substitute_professor_id;
    INSERT INTO public.financial_parties (
      organization_id, party_type, name, document_type, document,
      pix_key, professor_id, active, created_by
    ) VALUES (
      v_payment.organization_id, 'professor',
      COALESCE(v_payment.payee_name, v_prof.full_name, 'Professor'),
      'CPF',
      COALESCE(v_payment.payee_cpf, v_prof.cpf),
      COALESCE(v_payment.bank_data->>'pix_key', v_prof.cpf),
      v_payment.substitute_professor_id,
      true,
      COALESCE(v_payment.approved_by, v_payment.paid_by)
    )
    ON CONFLICT (organization_id, professor_id) WHERE professor_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      document = COALESCE(EXCLUDED.document, public.financial_parties.document),
      pix_key = COALESCE(EXCLUDED.pix_key, public.financial_parties.pix_key),
      active = true,
      updated_at = now()
    RETURNING id INTO v_party_id;
  END IF;

  v_due := COALESCE(v_payment.scheduled_for::date, CURRENT_DATE + INTERVAL '7 days');
  v_desc := 'Substituição '
         || COALESCE(v_request.substitution_code, v_request.id::text)
         || ' — ' || COALESCE(v_payment.payee_name, 'Professor substituto');

  INSERT INTO public.financial_entries (
    organization_id, kind, status, description, party_id,
    account_id, category_id, payment_method_id,
    competence_date, issue_date, due_date, total_amount,
    installments_count, source_kind, source_id, created_by
  ) VALUES (
    v_payment.organization_id, 'payable', 'pending_approval', v_desc, v_party_id,
    v_settings.default_financial_account_id,
    v_settings.default_financial_category_id,
    v_settings.default_financial_payment_method_id,
    COALESCE(v_request.absence_date, CURRENT_DATE),
    CURRENT_DATE,
    v_due,
    v_payment.net_amount,
    1,
    'substitution_payment',
    v_payment.id,
    COALESCE(v_payment.approved_by, v_payment.paid_by, auth.uid())
  ) RETURNING id INTO v_entry_id;

  -- Auditoria bidirecional
  INSERT INTO public.financial_source_links (entry_id, organization_id, source_kind, source_id, metadata)
  VALUES
    (v_entry_id, v_payment.organization_id, 'substitution_payment', v_payment.id, jsonb_build_object('request_id', v_request.id)),
    (v_entry_id, v_payment.organization_id, 'substitution_request', v_request.id, jsonb_build_object('payment_id', v_payment.id))
  ON CONFLICT DO NOTHING;

  -- Centro de custo padrão (alocação 100%)
  IF v_settings.default_financial_cost_center_id IS NOT NULL THEN
    INSERT INTO public.financial_entry_allocations (entry_id, organization_id, cost_center_id, percentage, amount)
    VALUES (v_entry_id, v_payment.organization_id, v_settings.default_financial_cost_center_id, 100, v_payment.net_amount)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Marca o pagamento como agendado e linka
  UPDATE public.teacher_substitution_payments
     SET financial_entry_id = v_entry_id,
         payment_status = 'payment_scheduled',
         updated_at = now()
   WHERE id = v_payment.id;

  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_payable_for_substitution_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payable_for_substitution_payment(uuid) TO authenticated, service_role;

-- 5) Trigger: aprovar pagamento → gera título financeiro
CREATE OR REPLACE FUNCTION public.trg_tsp_approved_to_payable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'approved_for_payment'
     AND COALESCE(OLD.payment_status, '') <> 'approved_for_payment'
     AND NEW.financial_entry_id IS NULL
  THEN
    PERFORM public.create_payable_for_substitution_payment(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tsp_approved_to_payable ON public.teacher_substitution_payments;
CREATE TRIGGER tsp_approved_to_payable
AFTER UPDATE OF payment_status ON public.teacher_substitution_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_tsp_approved_to_payable();

-- 6) Trigger inverso: título financeiro pago → atualiza pagamento e requisição
CREATE OR REPLACE FUNCTION public.trg_fin_entry_paid_syncs_tsp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status::text, '') <> 'paid' THEN
    UPDATE public.teacher_substitution_payments p
       SET payment_status = 'paid',
           paid_at = COALESCE(p.paid_at, now()),
           paid_by = COALESCE(p.paid_by, NEW.approved_by),
           updated_at = now()
     WHERE p.financial_entry_id = NEW.id;

    UPDATE public.teacher_substitution_requests r
       SET payment_status = 'paid',
           status = CASE WHEN r.status IN ('approved_for_payment','payment_pending','payment_scheduled')
                         THEN 'payment_completed' ELSE r.status END,
           updated_at = now()
      FROM public.teacher_substitution_payments p
     WHERE p.financial_entry_id = NEW.id
       AND r.id = p.substitution_request_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fin_entry_paid_syncs_tsp ON public.financial_entries;
CREATE TRIGGER fin_entry_paid_syncs_tsp
AFTER UPDATE OF status ON public.financial_entries
FOR EACH ROW
WHEN (NEW.source_kind = 'substitution_payment')
EXECUTE FUNCTION public.trg_fin_entry_paid_syncs_tsp();
