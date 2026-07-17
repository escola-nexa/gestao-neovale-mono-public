-- CFG-09: financial_charge_rules
CREATE TABLE IF NOT EXISTS public.financial_charge_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  direction text NOT NULL DEFAULT 'BOTH' CHECK (direction IN ('IN','OUT','BOTH')),
  fine_type text NOT NULL DEFAULT 'percentage' CHECK (fine_type IN ('none','fixed','percentage')),
  fine_value numeric(14,4) NOT NULL DEFAULT 0,
  interest_type text NOT NULL DEFAULT 'monthly_percentage'
    CHECK (interest_type IN ('none','fixed','percentage','daily_percentage','monthly_percentage')),
  interest_value numeric(14,4) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none','fixed','percentage')),
  discount_value numeric(14,4) NOT NULL DEFAULT 0,
  discount_until_days integer NOT NULL DEFAULT 0,
  grace_period_days integer NOT NULL DEFAULT 0,
  calculation_basis text NOT NULL DEFAULT 'principal'
    CHECK (calculation_basis IN ('principal','principal_plus_fine')),
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_charge_rule_per_org
  ON public.financial_charge_rules (organization_id)
  WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_charge_rules TO authenticated;
GRANT ALL ON public.financial_charge_rules TO service_role;

ALTER TABLE public.financial_charge_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read charge rules"
  ON public.financial_charge_rules FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Financial admins manage charge rules"
  ON public.financial_charge_rules FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin')
         OR public.has_financial_permission(auth.uid(),'financial_settings_manage'))
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin')
         OR public.has_financial_permission(auth.uid(),'financial_settings_manage'))
  );

CREATE TRIGGER trg_fin_charge_rules_updated_at
  BEFORE UPDATE ON public.financial_charge_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calculation function (returns principal, fine, interest, discount, total + memo)
CREATE OR REPLACE FUNCTION public.calc_financial_charges(
  _rule_id uuid,
  _principal numeric,
  _due_date date,
  _reference_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.financial_charge_rules;
  v_days int;
  v_fine numeric := 0;
  v_interest numeric := 0;
  v_discount numeric := 0;
  v_base numeric;
  v_total numeric;
  v_memo jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO r FROM public.financial_charge_rules WHERE id = _rule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra de cobrança não encontrada';
  END IF;

  v_days := (_reference_date - _due_date);

  -- Desconto (se ainda dentro do prazo configurado)
  IF v_days <= 0 AND r.discount_type <> 'none' THEN
    IF r.discount_until_days = 0 OR abs(v_days) <= r.discount_until_days THEN
      IF r.discount_type = 'fixed' THEN
        v_discount := r.discount_value;
      ELSE
        v_discount := round(_principal * r.discount_value / 100.0, 2);
      END IF;
      v_memo := v_memo || jsonb_build_object('item','desconto','tipo',r.discount_type,'valor',v_discount);
    END IF;
  END IF;

  -- Multa e juros: só após vencimento + tolerância
  IF v_days > r.grace_period_days THEN
    IF r.fine_type = 'fixed' THEN
      v_fine := r.fine_value;
    ELSIF r.fine_type = 'percentage' THEN
      v_fine := round(_principal * r.fine_value / 100.0, 2);
    END IF;
    IF v_fine > 0 THEN
      v_memo := v_memo || jsonb_build_object('item','multa','tipo',r.fine_type,'valor',v_fine);
    END IF;

    v_base := CASE WHEN r.calculation_basis = 'principal_plus_fine'
                   THEN _principal + v_fine ELSE _principal END;

    IF r.interest_type = 'fixed' THEN
      v_interest := r.interest_value;
    ELSIF r.interest_type = 'percentage' THEN
      v_interest := round(v_base * r.interest_value / 100.0, 2);
    ELSIF r.interest_type = 'daily_percentage' THEN
      v_interest := round(v_base * r.interest_value / 100.0 * v_days, 2);
    ELSIF r.interest_type = 'monthly_percentage' THEN
      v_interest := round(v_base * r.interest_value / 100.0 / 30.0 * v_days, 2);
    END IF;
    IF v_interest > 0 THEN
      v_memo := v_memo || jsonb_build_object(
        'item','juros','tipo',r.interest_type,'dias',v_days,
        'base',v_base,'valor',v_interest);
    END IF;
  END IF;

  v_total := round(_principal + v_fine + v_interest - v_discount, 2);

  RETURN jsonb_build_object(
    'rule_id', r.id,
    'rule_name', r.name,
    'principal', round(_principal,2),
    'fine', v_fine,
    'interest', v_interest,
    'discount', v_discount,
    'total', v_total,
    'days_overdue', v_days,
    'reference_date', _reference_date,
    'due_date', _due_date,
    'memo', v_memo
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calc_financial_charges(uuid,numeric,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_financial_charges(uuid,numeric,date,date) TO authenticated, service_role;

-- Seed default rules per organization
INSERT INTO public.financial_charge_rules
  (organization_id, name, direction, fine_type, fine_value,
   interest_type, interest_value, discount_type, discount_value,
   discount_until_days, grace_period_days, calculation_basis, is_default)
SELECT o.id, 'Padrão (2% multa + 1% a.m. juros)', 'BOTH',
       'percentage', 2.0, 'monthly_percentage', 1.0,
       'none', 0, 0, 0, 'principal', true
FROM public.organizations o
ON CONFLICT (organization_id, name) DO NOTHING;