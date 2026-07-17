
-- ============================================================
-- FASE 2A — Fundação cadastral do módulo financeiro
-- ============================================================

-- 0) Permissões novas no catálogo
INSERT INTO public.financial_permissions (key, category, action, name, description, is_sensitive)
VALUES
  ('financeiro.cadastros.visualizar', 'cadastros', 'visualizar', 'Visualizar cadastros financeiros', 'Permite consultar contas, beneficiários, plano de contas, centros de custo, projetos e métodos de pagamento.', false),
  ('financeiro.cadastros.gerenciar',  'cadastros', 'gerenciar',  'Gerenciar cadastros financeiros', 'Permite criar, editar e inativar cadastros financeiros.', true)
ON CONFLICT (key) DO NOTHING;

-- 1) Helpers
CREATE OR REPLACE FUNCTION public.is_admin_of_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_financial_registers(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_of_org(_user_id, _org_id)
      OR public.has_financial_permission(_user_id, 'financeiro.cadastros.visualizar', '{}'::jsonb)
      OR public.has_financial_permission(_user_id, 'financeiro.cadastros.gerenciar',  '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_financial_registers(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_of_org(_user_id, _org_id)
      OR public.has_financial_permission(_user_id, 'financeiro.cadastros.gerenciar', '{}'::jsonb);
$$;

-- Trigger genérico de updated_at já existe: public.update_updated_at_column

-- Trigger de auditoria genérica para cadastros financeiros
CREATE OR REPLACE FUNCTION public.audit_financial_register_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_action text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_org := NEW.organization_id;
    v_action := 'create';
    v_details := jsonb_build_object('id', NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := NEW.organization_id;
    v_action := CASE
      WHEN COALESCE(OLD.active, true) IS DISTINCT FROM COALESCE(NEW.active, true) THEN
        CASE WHEN NEW.active THEN 'reactivate' ELSE 'deactivate' END
      ELSE 'update'
    END;
    v_details := jsonb_build_object('id', NEW.id);
  ELSE
    v_org := OLD.organization_id;
    v_action := 'delete';
    v_details := jsonb_build_object('id', OLD.id);
  END IF;

  BEGIN
    INSERT INTO public.audit_events (
      organization_id, user_id, module, action, action_result, details
    ) VALUES (
      v_org, auth.uid(), 'financeiro.' || TG_TABLE_NAME, v_action, 'success', v_details
    );
  EXCEPTION WHEN OTHERS THEN
    -- nunca quebra a operação por falha de auditoria
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- 2) financial_accounts
-- ============================================================
CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('BANK','CASH','WALLET')),
  bank_name TEXT,
  bank_code TEXT,
  agency TEXT,
  account_number TEXT,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('CPF','CNPJ','EMAIL','PHONE','RANDOM')),
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_accounts_org ON public.financial_accounts(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_accounts_select ON public.financial_accounts FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_accounts_modify ON public.financial_accounts FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_accounts_delete_admin ON public.financial_accounts FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_accounts_updated_at BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_accounts_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 3) financial_parties (fornecedores/clientes/beneficiários)
-- ============================================================
CREATE TABLE public.financial_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('SUPPLIER','CUSTOMER','BENEFICIARY','EMPLOYEE','OTHER')),
  name TEXT NOT NULL,
  trade_name TEXT,
  document_type TEXT CHECK (document_type IN ('CPF','CNPJ','PASSPORT','OTHER')),
  document TEXT,
  email TEXT,
  phone TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_district TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('CPF','CNPJ','EMAIL','PHONE','RANDOM')),
  professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, professor_id, party_type)
);
CREATE INDEX idx_fin_parties_org ON public.financial_parties(organization_id);
CREATE INDEX idx_fin_parties_prof ON public.financial_parties(professor_id);
CREATE INDEX idx_fin_parties_doc ON public.financial_parties(organization_id, document);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_parties TO authenticated;
GRANT ALL ON public.financial_parties TO service_role;
ALTER TABLE public.financial_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_parties_select ON public.financial_parties FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_parties_modify ON public.financial_parties FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_parties_delete_admin ON public.financial_parties FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_parties_updated_at BEFORE UPDATE ON public.financial_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_parties_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_parties
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 4) financial_categories (plano de contas hierárquico)
-- ============================================================
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  code TEXT,
  name TEXT NOT NULL,
  nature TEXT NOT NULL CHECK (nature IN ('RECEITA','DESPESA')),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_fin_categories_org ON public.financial_categories(organization_id);
CREATE INDEX idx_fin_categories_parent ON public.financial_categories(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_categories_select ON public.financial_categories FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_categories_modify ON public.financial_categories FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_categories_delete_admin ON public.financial_categories FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_categories_updated_at BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_categories_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 5) financial_projects
-- ============================================================
CREATE TABLE public.financial_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(14,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_fin_projects_org ON public.financial_projects(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_projects TO authenticated;
GRANT ALL ON public.financial_projects TO service_role;
ALTER TABLE public.financial_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_projects_select ON public.financial_projects FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_projects_modify ON public.financial_projects FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_projects_delete_admin ON public.financial_projects FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_projects_updated_at BEFORE UPDATE ON public.financial_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_projects_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 6) financial_cost_centers (com vínculo opcional a escola/cidade/projeto)
-- ============================================================
CREATE TABLE public.financial_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.financial_cost_centers(id) ON DELETE RESTRICT,
  code TEXT,
  name TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.financial_projects(id) ON DELETE SET NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_fin_cc_org ON public.financial_cost_centers(organization_id);
CREATE INDEX idx_fin_cc_parent ON public.financial_cost_centers(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_cost_centers TO authenticated;
GRANT ALL ON public.financial_cost_centers TO service_role;
ALTER TABLE public.financial_cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_cc_select ON public.financial_cost_centers FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_cc_modify ON public.financial_cost_centers FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_cc_delete_admin ON public.financial_cost_centers FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_cc_updated_at BEFORE UPDATE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_cc_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 7) financial_payment_methods
-- ============================================================
CREATE TABLE public.financial_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('PIX','TED','DOC','BOLETO','DINHEIRO','CARTAO_CREDITO','CARTAO_DEBITO','TRANSFERENCIA','OUTRO')),
  default_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_pm_org ON public.financial_payment_methods(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payment_methods TO authenticated;
GRANT ALL ON public.financial_payment_methods TO service_role;
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_pm_select ON public.financial_payment_methods FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_pm_modify ON public.financial_payment_methods FOR ALL TO authenticated
  USING (public.can_manage_financial_registers(auth.uid(), organization_id))
  WITH CHECK (public.can_manage_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_pm_delete_admin ON public.financial_payment_methods FOR DELETE TO authenticated
  USING (public.is_admin_of_org(auth.uid(), organization_id));
CREATE TRIGGER trg_fin_pm_updated_at BEFORE UPDATE ON public.financial_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fin_pm_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_register_change();

-- ============================================================
-- 8) financial_settings (1 linha por organização)
-- ============================================================
CREATE TABLE public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'BRL',
  fiscal_year_start_month SMALLINT NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  approval_required_above NUMERIC(14,2),
  default_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  default_payment_method_id UUID REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
  allow_physical_delete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_settings TO authenticated;
GRANT ALL ON public.financial_settings TO service_role;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_settings_select ON public.financial_settings FOR SELECT TO authenticated
  USING (public.can_view_financial_registers(auth.uid(), organization_id));
CREATE POLICY fin_settings_modify ON public.financial_settings FOR ALL TO authenticated
  USING (
    public.is_admin_of_org(auth.uid(), organization_id)
    OR public.has_financial_permission(auth.uid(), 'financeiro.configuracoes.editar', '{}'::jsonb)
  )
  WITH CHECK (
    public.is_admin_of_org(auth.uid(), organization_id)
    OR public.has_financial_permission(auth.uid(), 'financeiro.configuracoes.editar', '{}'::jsonb)
  );
CREATE TRIGGER trg_fin_settings_updated_at BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
