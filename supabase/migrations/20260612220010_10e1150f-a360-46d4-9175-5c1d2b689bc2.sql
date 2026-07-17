
-- ========================================================
-- 1) Novos campos em financial_parties
-- ========================================================
ALTER TABLE public.financial_parties
  ADD COLUMN IF NOT EXISTS person_type text NOT NULL DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS party_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS state_registration text,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_payment_method_id uuid REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_by uuid;

ALTER TABLE public.financial_parties
  DROP CONSTRAINT IF EXISTS financial_parties_person_type_check;
ALTER TABLE public.financial_parties
  ADD CONSTRAINT financial_parties_person_type_check
  CHECK (person_type IN ('PF','PJ'));

-- Expande party_type incluindo PROFESSOR e GOVERNMENT
ALTER TABLE public.financial_parties
  DROP CONSTRAINT IF EXISTS financial_parties_party_type_check;
ALTER TABLE public.financial_parties
  ADD CONSTRAINT financial_parties_party_type_check
  CHECK (party_type IN ('SUPPLIER','CUSTOMER','BENEFICIARY','EMPLOYEE','PROFESSOR','GOVERNMENT','OTHER'));

-- Backfill party_types com o party_type principal e legal_name=name
UPDATE public.financial_parties
   SET party_types = ARRAY[party_type]
 WHERE party_types = ARRAY[]::text[];
UPDATE public.financial_parties
   SET legal_name = name
 WHERE legal_name IS NULL;

-- Unicidade de documento por organização
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_parties_org_document
  ON public.financial_parties (organization_id, regexp_replace(document,'\D','','g'))
  WHERE document IS NOT NULL AND document <> '';

-- ========================================================
-- 2) Validação de CPF/CNPJ + sincronização de nome
-- ========================================================
CREATE OR REPLACE FUNCTION public.is_valid_cpf(_doc text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE d text; s int; r int; i int;
BEGIN
  d := regexp_replace(coalesce(_doc,''), '\D', '', 'g');
  IF length(d) <> 11 OR d ~ '^(\d)\1{10}$' THEN RETURN false; END IF;
  s := 0;
  FOR i IN 1..9 LOOP s := s + (substr(d,i,1)::int * (11 - i)); END LOOP;
  r := (s * 10) % 11; IF r = 10 THEN r := 0; END IF;
  IF r <> substr(d,10,1)::int THEN RETURN false; END IF;
  s := 0;
  FOR i IN 1..10 LOOP s := s + (substr(d,i,1)::int * (12 - i)); END LOOP;
  r := (s * 10) % 11; IF r = 10 THEN r := 0; END IF;
  RETURN r = substr(d,11,1)::int;
END $$;

CREATE OR REPLACE FUNCTION public.is_valid_cnpj(_doc text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE d text; s int; r int; i int;
  w1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  w2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
BEGIN
  d := regexp_replace(coalesce(_doc,''), '\D', '', 'g');
  IF length(d) <> 14 OR d ~ '^(\d)\1{13}$' THEN RETURN false; END IF;
  s := 0;
  FOR i IN 1..12 LOOP s := s + (substr(d,i,1)::int * w1[i]); END LOOP;
  r := s % 11; r := CASE WHEN r < 2 THEN 0 ELSE 11 - r END;
  IF r <> substr(d,13,1)::int THEN RETURN false; END IF;
  s := 0;
  FOR i IN 1..13 LOOP s := s + (substr(d,i,1)::int * w2[i]); END LOOP;
  r := s % 11; r := CASE WHEN r < 2 THEN 0 ELSE 11 - r END;
  RETURN r = substr(d,14,1)::int;
END $$;

CREATE OR REPLACE FUNCTION public.validate_financial_party()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Mantém name sincronizado com legal_name
  IF NEW.legal_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.legal_name;
  END IF;
  IF NEW.name IS NOT NULL AND (NEW.legal_name IS NULL OR NEW.legal_name = '') THEN
    NEW.legal_name := NEW.name;
  END IF;

  -- party_types contém pelo menos o principal
  IF NEW.party_types IS NULL OR array_length(NEW.party_types,1) IS NULL THEN
    NEW.party_types := ARRAY[NEW.party_type];
  ELSIF NOT (NEW.party_type = ANY (NEW.party_types)) THEN
    NEW.party_types := NEW.party_types || NEW.party_type;
  END IF;

  -- Validação CPF/CNPJ
  IF NEW.document IS NOT NULL AND NEW.document <> '' THEN
    IF NEW.document_type = 'CPF' AND NOT public.is_valid_cpf(NEW.document) THEN
      RAISE EXCEPTION 'CPF inválido: %', NEW.document;
    END IF;
    IF NEW.document_type = 'CNPJ' AND NOT public.is_valid_cnpj(NEW.document) THEN
      RAISE EXCEPTION 'CNPJ inválido: %', NEW.document;
    END IF;
  END IF;

  -- Carimba quem bloqueou
  IF NEW.is_blocked AND (OLD.is_blocked IS DISTINCT FROM NEW.is_blocked) THEN
    NEW.blocked_at := now();
    NEW.blocked_by := auth.uid();
  ELSIF NOT NEW.is_blocked THEN
    NEW.blocked_at := NULL;
    NEW.blocked_by := NULL;
    NEW.block_reason := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_parties_validate ON public.financial_parties;
CREATE TRIGGER trg_fin_parties_validate
  BEFORE INSERT OR UPDATE ON public.financial_parties
  FOR EACH ROW EXECUTE FUNCTION public.validate_financial_party();

-- ========================================================
-- 3) Contas bancárias por parte (múltiplas)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.financial_party_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.financial_parties(id) ON DELETE CASCADE,
  label text,
  bank_name text,
  bank_code text,
  agency text,
  account_number text,
  account_digit text,
  pix_key text,
  pix_key_type text CHECK (pix_key_type IS NULL OR pix_key_type IN ('CPF','CNPJ','EMAIL','PHONE','RANDOM')),
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_party_bank_accounts TO authenticated;
GRANT ALL ON public.financial_party_bank_accounts TO service_role;
ALTER TABLE public.financial_party_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_pba_select ON public.financial_party_bank_accounts;
CREATE POLICY fin_pba_select ON public.financial_party_bank_accounts FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
DROP POLICY IF EXISTS fin_pba_modify ON public.financial_party_bank_accounts;
CREATE POLICY fin_pba_modify ON public.financial_party_bank_accounts FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
DROP POLICY IF EXISTS fin_pba_delete_admin ON public.financial_party_bank_accounts;
CREATE POLICY fin_pba_delete_admin ON public.financial_party_bank_accounts FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_fin_pba_party ON public.financial_party_bank_accounts (party_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_pba_primary
  ON public.financial_party_bank_accounts (party_id) WHERE is_primary;

DROP TRIGGER IF EXISTS trg_fin_pba_updated_at ON public.financial_party_bank_accounts;
CREATE TRIGGER trg_fin_pba_updated_at BEFORE UPDATE ON public.financial_party_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================
-- 4) Histórico/auditoria de dados bancários
-- ========================================================
CREATE TABLE IF NOT EXISTS public.financial_party_bank_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_id uuid NOT NULL,
  bank_account_id uuid,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  changed_by uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.financial_party_bank_history TO authenticated;
GRANT ALL ON public.financial_party_bank_history TO service_role;
ALTER TABLE public.financial_party_bank_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_pbh_select ON public.financial_party_bank_history;
CREATE POLICY fin_pbh_select ON public.financial_party_bank_history FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
DROP POLICY IF EXISTS fin_pbh_insert ON public.financial_party_bank_history;
CREATE POLICY fin_pbh_insert ON public.financial_party_bank_history FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fin_pbh_party ON public.financial_party_bank_history (party_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_party_bank_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_party_bank_history(organization_id, party_id, bank_account_id, operation, changed_by, new_data)
      VALUES (NEW.organization_id, NEW.party_id, NEW.id, 'INSERT', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.financial_party_bank_history(organization_id, party_id, bank_account_id, operation, changed_by, old_data, new_data)
      VALUES (NEW.organization_id, NEW.party_id, NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_party_bank_history(organization_id, party_id, bank_account_id, operation, changed_by, old_data)
      VALUES (OLD.organization_id, OLD.party_id, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_fin_pba_audit ON public.financial_party_bank_accounts;
CREATE TRIGGER trg_fin_pba_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_party_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_party_bank_change();

-- Audita também alterações dos campos bancários direto em financial_parties
CREATE OR REPLACE FUNCTION public.audit_party_inline_bank_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_changed boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_changed :=
      (OLD.bank_name IS DISTINCT FROM NEW.bank_name) OR
      (OLD.bank_agency IS DISTINCT FROM NEW.bank_agency) OR
      (OLD.bank_account IS DISTINCT FROM NEW.bank_account) OR
      (OLD.pix_key IS DISTINCT FROM NEW.pix_key) OR
      (OLD.pix_key_type IS DISTINCT FROM NEW.pix_key_type);
    IF v_changed THEN
      INSERT INTO public.financial_party_bank_history(organization_id, party_id, operation, changed_by, old_data, new_data)
        VALUES (
          NEW.organization_id, NEW.id, 'UPDATE', auth.uid(),
          jsonb_build_object('bank_name',OLD.bank_name,'bank_agency',OLD.bank_agency,'bank_account',OLD.bank_account,'pix_key',OLD.pix_key,'pix_key_type',OLD.pix_key_type),
          jsonb_build_object('bank_name',NEW.bank_name,'bank_agency',NEW.bank_agency,'bank_account',NEW.bank_account,'pix_key',NEW.pix_key,'pix_key_type',NEW.pix_key_type)
        );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_parties_inline_bank_audit ON public.financial_parties;
CREATE TRIGGER trg_fin_parties_inline_bank_audit
  AFTER UPDATE ON public.financial_parties
  FOR EACH ROW EXECUTE FUNCTION public.audit_party_inline_bank_change();

-- ========================================================
-- 5) Bloqueio de pagamentos para parte inativa/bloqueada
-- ========================================================
CREATE OR REPLACE FUNCTION public.guard_payment_party_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_party_id uuid;
  v_active boolean;
  v_blocked boolean;
  v_reason text;
BEGIN
  SELECT party_id INTO v_party_id
    FROM public.financial_entries
   WHERE id = NEW.entry_id;

  IF v_party_id IS NULL THEN RETURN NEW; END IF;

  SELECT active, is_blocked, block_reason
    INTO v_active, v_blocked, v_reason
    FROM public.financial_parties WHERE id = v_party_id;

  IF v_active IS FALSE THEN
    RAISE EXCEPTION 'Parte financeira inativa — pagamento bloqueado.';
  END IF;
  IF v_blocked IS TRUE THEN
    RAISE EXCEPTION 'Parte financeira bloqueada: %', COALESCE(v_reason,'sem motivo informado');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_payments_party_guard ON public.financial_payments;
CREATE TRIGGER trg_fin_payments_party_guard
  BEFORE INSERT OR UPDATE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_party_status();
