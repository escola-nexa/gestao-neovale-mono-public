
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS accounting_basis text NOT NULL DEFAULT 'accrual',
  ADD COLUMN IF NOT EXISTS fiscal_year_start_day smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS default_cost_center_id uuid REFERENCES public.financial_cost_centers(id),
  ADD COLUMN IF NOT EXISTS default_substitution_category_id uuid REFERENCES public.financial_categories(id),
  ADD COLUMN IF NOT EXISTS default_route_category_id uuid REFERENCES public.financial_categories(id),
  ADD COLUMN IF NOT EXISTS require_document_for_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_receipt_for_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_partial_payment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_negative_bank_balance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enforce_segregation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_budget_control boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_exceed_action text NOT NULL DEFAULT 'warn',
  ADD COLUMN IF NOT EXISTS overdue_grace_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_number_entries boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS entry_prefix text NOT NULL DEFAULT 'FIN',
  ADD COLUMN IF NOT EXISTS batch_prefix text NOT NULL DEFAULT 'LOT',
  ADD COLUMN IF NOT EXISTS require_monthly_closure boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_import_formats text[] NOT NULL DEFAULT ARRAY['OFX','CSV','CNAB240','CNAB400']::text[];

CREATE UNIQUE INDEX IF NOT EXISTS uniq_financial_settings_org
  ON public.financial_settings(organization_id);

CREATE OR REPLACE FUNCTION public.validate_financial_settings()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.accounting_basis NOT IN ('cash','accrual') THEN
    RAISE EXCEPTION 'accounting_basis deve ser cash ou accrual';
  END IF;
  IF NEW.budget_exceed_action NOT IN ('block','warn','allow') THEN
    RAISE EXCEPTION 'budget_exceed_action deve ser block, warn ou allow';
  END IF;
  IF NEW.fiscal_year_start_month < 1 OR NEW.fiscal_year_start_month > 12 THEN
    RAISE EXCEPTION 'fiscal_year_start_month inválido';
  END IF;
  IF NEW.fiscal_year_start_day < 1 OR NEW.fiscal_year_start_day > 28 THEN
    RAISE EXCEPTION 'fiscal_year_start_day inválido';
  END IF;
  IF NEW.overdue_grace_days < 0 THEN
    RAISE EXCEPTION 'overdue_grace_days não pode ser negativo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_financial_settings ON public.financial_settings;
CREATE TRIGGER trg_validate_financial_settings
  BEFORE INSERT OR UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_settings();

CREATE TABLE IF NOT EXISTS public.financial_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  settings_id uuid,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  justification text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT ON public.financial_settings_audit TO authenticated;
GRANT ALL ON public.financial_settings_audit TO service_role;

ALTER TABLE public.financial_settings_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view org settings audit" ON public.financial_settings_audit;
CREATE POLICY "Admins view org settings audit"
  ON public.financial_settings_audit FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin')
         OR public.has_financial_permission(auth.uid(), 'financial_settings_manage', '{}'::jsonb))
  );

DROP POLICY IF EXISTS "System inserts settings audit" ON public.financial_settings_audit;
CREATE POLICY "System inserts settings audit"
  ON public.financial_settings_audit FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_financial_settings_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_old jsonb;
  v_new jsonb;
  v_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_settings_audit(organization_id, settings_id, changed_by, action, diff)
    VALUES (NEW.organization_id, NEW.id, auth.uid(), 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
  FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
    IF v_key IN ('updated_at') THEN CONTINUE; END IF;
    IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
      v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old->v_key, 'new', v_new->v_key));
    END IF;
  END LOOP;
  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO public.financial_settings_audit(organization_id, settings_id, changed_by, action, diff)
    VALUES (NEW.organization_id, NEW.id, auth.uid(), 'UPDATE', v_diff);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_financial_settings ON public.financial_settings;
CREATE TRIGGER trg_audit_financial_settings
  AFTER INSERT OR UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_settings_changes();
