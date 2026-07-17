
-- 1) Novos campos
ALTER TABLE public.financial_accounts
  ADD COLUMN IF NOT EXISTS account_subtype text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS account_digit text,
  ADD COLUMN IF NOT EXISTS initial_balance_date date,
  ADD COLUMN IF NOT EXISTS allows_negative_balance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reconcilable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 2) Subtipo válido
ALTER TABLE public.financial_accounts
  DROP CONSTRAINT IF EXISTS financial_accounts_account_subtype_check;
ALTER TABLE public.financial_accounts
  ADD CONSTRAINT financial_accounts_account_subtype_check
  CHECK (account_subtype IS NULL OR account_subtype IN
    ('checking','savings','cash','digital_wallet','investment'));

-- Backfill account_subtype a partir do account_type legado
UPDATE public.financial_accounts
   SET account_subtype = CASE account_type
     WHEN 'BANK'   THEN 'checking'
     WHEN 'CASH'   THEN 'cash'
     WHEN 'WALLET' THEN 'digital_wallet'
     ELSE 'checking'
   END
 WHERE account_subtype IS NULL;

-- 3) Apenas uma conta padrão por organização
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_accounts_default_per_org
  ON public.financial_accounts (organization_id)
  WHERE is_default = true;

-- 4) Bloquear edição direta do saldo atual
--    Movimentações autorizadas devem invocar SET LOCAL app.allow_balance_update = 'on'.
CREATE OR REPLACE FUNCTION public.guard_financial_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow text;
BEGIN
  IF NEW.current_balance IS DISTINCT FROM OLD.current_balance THEN
    v_allow := current_setting('app.allow_balance_update', true);
    IF v_allow IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Saldo atual da conta não pode ser editado diretamente. Use pagamentos, recebimentos, transferências, ajustes ou conciliações.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_accounts_balance_guard ON public.financial_accounts;
CREATE TRIGGER trg_fin_accounts_balance_guard
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_account_balance();
