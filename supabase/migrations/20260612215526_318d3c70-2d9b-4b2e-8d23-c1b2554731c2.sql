
-- ============================================================
-- 1) Estende financial_payment_methods
-- ============================================================
ALTER TABLE public.financial_payment_methods
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'BOTH',
  ADD COLUMN IF NOT EXISTS requires_bank_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_reference boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_proof boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_installments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_days integer NOT NULL DEFAULT 0;

ALTER TABLE public.financial_payment_methods
  DROP CONSTRAINT IF EXISTS financial_payment_methods_direction_check;
ALTER TABLE public.financial_payment_methods
  ADD CONSTRAINT financial_payment_methods_direction_check
  CHECK (direction IN ('IN','OUT','BOTH'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_pm_org_code
  ON public.financial_payment_methods (organization_id, lower(code))
  WHERE code IS NOT NULL;

-- ============================================================
-- 2) Cria financial_payment_terms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  installment_count integer NOT NULL DEFAULT 1 CHECK (installment_count BETWEEN 1 AND 60),
  first_due_days integer NOT NULL DEFAULT 0,
  interval_days integer NOT NULL DEFAULT 30,
  percentage_distribution numeric(7,4)[] NOT NULL DEFAULT ARRAY[100]::numeric(7,4)[],
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payment_terms TO authenticated;
GRANT ALL ON public.financial_payment_terms TO service_role;

ALTER TABLE public.financial_payment_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_pt_select ON public.financial_payment_terms;
CREATE POLICY fin_pt_select ON public.financial_payment_terms
  FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));

DROP POLICY IF EXISTS fin_pt_modify ON public.financial_payment_terms;
CREATE POLICY fin_pt_modify ON public.financial_payment_terms
  FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));

DROP POLICY IF EXISTS fin_pt_delete_admin ON public.financial_payment_terms;
CREATE POLICY fin_pt_delete_admin ON public.financial_payment_terms
  FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_fin_pt_org ON public.financial_payment_terms (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_pt_org_code
  ON public.financial_payment_terms (organization_id, lower(code))
  WHERE code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_fin_pt_updated_at ON public.financial_payment_terms;
CREATE TRIGGER trg_fin_pt_updated_at BEFORE UPDATE ON public.financial_payment_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação: soma dos percentuais = 100 e tamanho = installment_count
CREATE OR REPLACE FUNCTION public.validate_payment_term()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sum numeric;
BEGIN
  IF array_length(NEW.percentage_distribution, 1) IS DISTINCT FROM NEW.installment_count THEN
    RAISE EXCEPTION 'A distribuição de percentuais deve ter % itens (uma por parcela).', NEW.installment_count;
  END IF;
  SELECT COALESCE(SUM(p), 0) INTO v_sum FROM unnest(NEW.percentage_distribution) AS p;
  IF round(v_sum, 2) <> 100.00 THEN
    RAISE EXCEPTION 'A soma dos percentuais das parcelas deve ser 100%% (atual: %).', v_sum;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_pt_validate ON public.financial_payment_terms;
CREATE TRIGGER trg_fin_pt_validate BEFORE INSERT OR UPDATE ON public.financial_payment_terms
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_term();

-- ============================================================
-- 3) Seed de métodos iniciais
-- ============================================================
INSERT INTO public.financial_payment_methods
  (organization_id, name, method_type, code, direction,
   requires_bank_account, requires_reference, requires_proof,
   supports_batch, supports_installments, settlement_days, active)
SELECT o.id, x.name, x.method_type, x.code, x.direction,
       x.requires_bank_account, x.requires_reference, x.requires_proof,
       x.supports_batch, x.supports_installments, x.settlement_days, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('Pix',                  'PIX',            'PIX',   'BOTH', true,  false, false, true,  false, 0),
  ('Transferência bancária','TRANSFERENCIA', 'TRANSF','BOTH', true,  true,  true,  true,  false, 1),
  ('Boleto',               'BOLETO',         'BOL',   'BOTH', false, true,  false, true,  true,  2),
  ('Cartão de crédito',    'CARTAO_CREDITO', 'CC',    'BOTH', false, true,  false, false, true,  30),
  ('Cartão de débito',     'CARTAO_DEBITO',  'CD',    'BOTH', false, false, false, false, false, 1),
  ('Dinheiro',             'DINHEIRO',       'CASH',  'BOTH', false, false, true,  false, false, 0),
  ('Débito automático',    'TED',            'DA',    'OUT',  true,  true,  false, true,  false, 1),
  ('Cheque',               'OUTRO',          'CHQ',   'BOTH', true,  true,  true,  false, false, 3),
  ('Depósito bancário',    'DOC',            'DEP',   'BOTH', true,  true,  true,  false, false, 1),
  ('Outro',                'OUTRO',          'OUT',   'BOTH', false, false, false, false, false, 0)
) AS x(name, method_type, code, direction,
       requires_bank_account, requires_reference, requires_proof,
       supports_batch, supports_installments, settlement_days)
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_payment_methods pm
  WHERE pm.organization_id = o.id
);

-- ============================================================
-- 4) Seed de condições iniciais
-- ============================================================
INSERT INTO public.financial_payment_terms
  (organization_id, name, code, installment_count, first_due_days, interval_days, percentage_distribution)
SELECT o.id, x.name, x.code, x.installment_count, x.first_due_days, x.interval_days, x.dist
FROM public.organizations o
CROSS JOIN (VALUES
  ('À vista',         'AVISTA', 1,  0, 0,  ARRAY[100]::numeric(7,4)[]),
  ('7 dias',          'D7',     1,  7, 0,  ARRAY[100]::numeric(7,4)[]),
  ('15 dias',         'D15',    1, 15, 0,  ARRAY[100]::numeric(7,4)[]),
  ('30 dias',         'D30',    1, 30, 0,  ARRAY[100]::numeric(7,4)[]),
  ('30/60 dias',      'D3060',  2, 30, 30, ARRAY[50,50]::numeric(7,4)[]),
  ('30/60/90 dias',   'D306090',3, 30, 30, ARRAY[33.34,33.33,33.33]::numeric(7,4)[]),
  ('Mensal',          'MENSAL', 12,30, 30,
     ARRAY[8.34,8.33,8.33,8.33,8.33,8.33,8.34,8.33,8.33,8.34,8.33,8.34]::numeric(7,4)[]),
  ('Personalizada',   'CUSTOM', 1,  0, 30, ARRAY[100]::numeric(7,4)[])
) AS x(name, code, installment_count, first_due_days, interval_days, dist)
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_payment_terms pt
  WHERE pt.organization_id = o.id
);
