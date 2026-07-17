
-- =====================================================================
-- FASE 1B: AUTORIZAÇÃO GRANULAR DO MÓDULO FINANCEIRO
-- =====================================================================

-- ---------- ENUMS ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.financial_scope_type AS ENUM (
    'organization', 'city', 'school', 'cost_center', 'project', 'bank_account'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_permission_audit_action AS ENUM (
    'grant', 'revoke', 'template_applied', 'scope_added', 'scope_removed',
    'limit_set', 'limit_removed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1) CATÁLOGO DE PERMISSÕES --------------------------------
CREATE TABLE IF NOT EXISTS public.financial_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,         -- ex: financeiro.contas_pagar.aprovar
  category    TEXT NOT NULL,                -- ex: contas_pagar
  action      TEXT NOT NULL,                -- ex: aprovar
  name        TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.financial_permissions TO authenticated;
GRANT ALL    ON public.financial_permissions TO service_role;
ALTER TABLE public.financial_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select_all_auth" ON public.financial_permissions
  FOR SELECT TO authenticated USING (true);

-- ---------- 2) TEMPLATES (MODELOS) -----------------------------------
CREATE TABLE IF NOT EXISTS public.financial_role_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,            -- consulta, operador, etc.
  name            TEXT NOT NULL,
  description     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT false, -- modelos oficiais não editáveis
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_frt_system_code
  ON public.financial_role_templates (code) WHERE is_system = true AND organization_id IS NULL;

GRANT SELECT ON public.financial_role_templates TO authenticated;
GRANT ALL    ON public.financial_role_templates TO service_role;
ALTER TABLE public.financial_role_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frt_select_visible" ON public.financial_role_templates
  FOR SELECT TO authenticated
  USING (
    is_system = true
    OR organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.financial_role_template_permissions (
  template_id   UUID NOT NULL REFERENCES public.financial_role_templates(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.financial_permissions(id)    ON DELETE CASCADE,
  PRIMARY KEY (template_id, permission_id)
);
GRANT SELECT ON public.financial_role_template_permissions TO authenticated;
GRANT ALL    ON public.financial_role_template_permissions TO service_role;
ALTER TABLE public.financial_role_template_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frtp_select_visible" ON public.financial_role_template_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_role_templates t
      WHERE t.id = financial_role_template_permissions.template_id
        AND (t.is_system = true OR t.organization_id IN (
          SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        ))
    )
  );

-- ---------- 3) CONCESSÕES POR USUÁRIO --------------------------------
CREATE TABLE IF NOT EXISTS public.financial_user_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES public.financial_permissions(id) ON DELETE CASCADE,
  granted_by      UUID REFERENCES auth.users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by      UUID REFERENCES auth.users(id),
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT,
  source_template UUID REFERENCES public.financial_role_templates(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fup_active
  ON public.financial_user_permissions (organization_id, user_id, permission_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_fup_user ON public.financial_user_permissions (user_id);
GRANT SELECT, INSERT, UPDATE ON public.financial_user_permissions TO authenticated;
GRANT ALL    ON public.financial_user_permissions TO service_role;
ALTER TABLE public.financial_user_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- 4) ESCOPOS POR USUÁRIO -----------------------------------
CREATE TABLE IF NOT EXISTS public.financial_user_scopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type      public.financial_scope_type NOT NULL,
  scope_value     TEXT NOT NULL,             -- ID (uuid/text) ou rótulo do recurso
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, scope_type, scope_value)
);
CREATE INDEX IF NOT EXISTS ix_fus_user ON public.financial_user_scopes (user_id, scope_type);
GRANT SELECT, INSERT, DELETE ON public.financial_user_scopes TO authenticated;
GRANT ALL    ON public.financial_user_scopes TO service_role;
ALTER TABLE public.financial_user_scopes ENABLE ROW LEVEL SECURITY;

-- ---------- 5) LIMITES DE APROVAÇÃO ----------------------------------
CREATE TABLE IF NOT EXISTS public.financial_approval_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES public.financial_permissions(id) ON DELETE CASCADE,
  max_amount      NUMERIC(18,2) NOT NULL CHECK (max_amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'BRL',
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, permission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_approval_limits TO authenticated;
GRANT ALL    ON public.financial_approval_limits TO service_role;
ALTER TABLE public.financial_approval_limits ENABLE ROW LEVEL SECURITY;

-- ---------- 6) AUDITORIA ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_permission_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id   UUID REFERENCES auth.users(id),
  target_user_id  UUID REFERENCES auth.users(id),
  action          public.financial_permission_audit_action NOT NULL,
  permission_key  TEXT,
  template_code   TEXT,
  scope_type      public.financial_scope_type,
  scope_value     TEXT,
  amount          NUMERIC(18,2),
  reason          TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_fpal_target ON public.financial_permission_audit_logs (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_fpal_org    ON public.financial_permission_audit_logs (organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.financial_permission_audit_logs TO authenticated;
GRANT ALL    ON public.financial_permission_audit_logs TO service_role;
ALTER TABLE public.financial_permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------- TRIGGERS DE updated_at -----------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_frt_updated ON public.financial_role_templates;
CREATE TRIGGER trg_frt_updated BEFORE UPDATE ON public.financial_role_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
DROP TRIGGER IF EXISTS trg_fup_updated ON public.financial_user_permissions;
CREATE TRIGGER trg_fup_updated BEFORE UPDATE ON public.financial_user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
DROP TRIGGER IF EXISTS trg_fal_updated ON public.financial_approval_limits;
CREATE TRIGGER trg_fal_updated BEFORE UPDATE ON public.financial_approval_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- =====================================================================
-- FUNÇÕES DE SEGURANÇA (SECURITY DEFINER com search_path = public)
-- =====================================================================

-- _fin_caller_org: organização do chamador (mantém isolamento multi-tenant)
CREATE OR REPLACE FUNCTION public._fin_caller_org()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_roles
  WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
$$;

-- _fin_is_admin: caller é admin?
CREATE OR REPLACE FUNCTION public._fin_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- has_financial_permission(user_id, key, context jsonb)
-- context aceita: { scope_type, scope_value, amount }
CREATE OR REPLACE FUNCTION public.has_financial_permission(
  _user_id UUID,
  _permission_key TEXT,
  _context JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org           UUID;
  v_perm_id       UUID;
  v_is_admin      BOOLEAN;
  v_has_grant     BOOLEAN;
  v_scope_type    TEXT  := _context->>'scope_type';
  v_scope_value   TEXT  := _context->>'scope_value';
  v_amount        NUMERIC := NULLIF(_context->>'amount','')::NUMERIC;
  v_max_amount    NUMERIC;
  v_scope_count   INT;
  v_match_count   INT;
BEGIN
  IF _user_id IS NULL OR _permission_key IS NULL THEN
    RETURN false;
  END IF;

  -- Admin sempre passa (dentro da própria organização)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO v_is_admin;
  IF v_is_admin THEN RETURN true; END IF;

  SELECT organization_id INTO v_org FROM public.user_roles
   WHERE user_id = _user_id ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_perm_id FROM public.financial_permissions WHERE key = _permission_key;
  IF v_perm_id IS NULL THEN RETURN false; END IF;

  -- Concessão ativa?
  SELECT EXISTS (
    SELECT 1 FROM public.financial_user_permissions
    WHERE user_id = _user_id
      AND organization_id = v_org
      AND permission_id = v_perm_id
      AND revoked_at IS NULL
  ) INTO v_has_grant;
  IF NOT v_has_grant THEN RETURN false; END IF;

  -- Verifica limite de valor, se aplicável
  IF v_amount IS NOT NULL THEN
    SELECT max_amount INTO v_max_amount
      FROM public.financial_approval_limits
     WHERE user_id = _user_id
       AND organization_id = v_org
       AND permission_id = v_perm_id;
    IF v_max_amount IS NOT NULL AND v_amount > v_max_amount THEN
      RETURN false;
    END IF;
  END IF;

  -- Verifica escopo: se o usuário possui QUALQUER escopo do mesmo tipo,
  -- então o scope_value pedido tem que estar entre eles. Caso ele não
  -- tenha nenhum escopo cadastrado para esse tipo, considera-se acesso
  -- total dentro da organização.
  IF v_scope_type IS NOT NULL AND v_scope_value IS NOT NULL THEN
    SELECT COUNT(*) INTO v_scope_count
      FROM public.financial_user_scopes
     WHERE user_id = _user_id
       AND organization_id = v_org
       AND scope_type::TEXT = v_scope_type;
    IF v_scope_count > 0 THEN
      SELECT COUNT(*) INTO v_match_count
        FROM public.financial_user_scopes
       WHERE user_id = _user_id
         AND organization_id = v_org
         AND scope_type::TEXT = v_scope_type
         AND scope_value = v_scope_value;
      IF v_match_count = 0 THEN RETURN false; END IF;
    END IF;
  END IF;

  RETURN true;
END $$;

-- get_my_financial_permissions(): permissões ativas do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_financial_permissions()
RETURNS TABLE (
  permission_key TEXT,
  category       TEXT,
  action         TEXT,
  name           TEXT,
  max_amount     NUMERIC,
  source_template TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.key, p.category, p.action, p.name,
    l.max_amount,
    t.code
  FROM public.financial_user_permissions u
  JOIN public.financial_permissions p ON p.id = u.permission_id
  LEFT JOIN public.financial_approval_limits l
    ON l.user_id = u.user_id AND l.permission_id = u.permission_id
   AND l.organization_id = u.organization_id
  LEFT JOIN public.financial_role_templates t ON t.id = u.source_template
  WHERE u.user_id = auth.uid()
    AND u.revoked_at IS NULL;
$$;

-- list_financial_user_permissions(user_id): admin / gestor de permissões
CREATE OR REPLACE FUNCTION public.list_financial_user_permissions(_user_id UUID)
RETURNS TABLE (
  permission_key TEXT,
  category       TEXT,
  action         TEXT,
  name           TEXT,
  granted_at     TIMESTAMPTZ,
  granted_by     UUID,
  source_template TEXT,
  max_amount     NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.key, p.category, p.action, p.name,
           u.granted_at, u.granted_by, t.code, l.max_amount
      FROM public.financial_user_permissions u
      JOIN public.financial_permissions p ON p.id = u.permission_id
      LEFT JOIN public.financial_role_templates t ON t.id = u.source_template
      LEFT JOIN public.financial_approval_limits l
        ON l.user_id = u.user_id AND l.permission_id = u.permission_id
       AND l.organization_id = u.organization_id
     WHERE u.user_id = _user_id
       AND u.revoked_at IS NULL
       AND u.organization_id = public._fin_caller_org();
END $$;

-- grant_financial_permission(user_id, key, scope jsonb)
-- scope: { template_id?, notes?, scopes: [{type,value}], limit: {amount,currency} }
CREATE OR REPLACE FUNCTION public.grant_financial_permission(
  _user_id UUID,
  _permission_key TEXT,
  _scope JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org      UUID := public._fin_caller_org();
  v_target_org UUID;
  v_perm_id  UUID;
  v_id       UUID;
  v_tmpl     UUID := NULLIF(_scope->>'template_id','')::UUID;
  v_amount   NUMERIC := NULLIF(_scope->>'limit_amount','')::NUMERIC;
  v_notes    TEXT := _scope->>'notes';
BEGIN
  IF NOT (
    public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_target_org FROM public.user_roles
   WHERE user_id = _user_id ORDER BY created_at LIMIT 1;
  IF v_target_org IS NULL OR v_target_org <> v_org THEN
    RAISE EXCEPTION 'cross-organization grant not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_perm_id FROM public.financial_permissions WHERE key = _permission_key;
  IF v_perm_id IS NULL THEN
    RAISE EXCEPTION 'unknown permission %', _permission_key;
  END IF;

  INSERT INTO public.financial_user_permissions
    (organization_id, user_id, permission_id, granted_by, source_template, notes)
  VALUES (v_org, _user_id, v_perm_id, auth.uid(), v_tmpl, v_notes)
  ON CONFLICT (organization_id, user_id, permission_id)
    WHERE revoked_at IS NULL
  DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()
  RETURNING id INTO v_id;

  IF v_amount IS NOT NULL THEN
    INSERT INTO public.financial_approval_limits
      (organization_id, user_id, permission_id, max_amount, created_by)
    VALUES (v_org, _user_id, v_perm_id, v_amount, auth.uid())
    ON CONFLICT (organization_id, user_id, permission_id)
    DO UPDATE SET max_amount = EXCLUDED.max_amount, updated_at = now();
  END IF;

  INSERT INTO public.financial_permission_audit_logs
    (organization_id, actor_user_id, target_user_id, action, permission_key, amount, metadata)
  VALUES (v_org, auth.uid(), _user_id, 'grant', _permission_key, v_amount, COALESCE(_scope,'{}'::jsonb));

  RETURN v_id;
END $$;

-- revoke_financial_permission(user_id, key, reason)
CREATE OR REPLACE FUNCTION public.revoke_financial_permission(
  _user_id UUID,
  _permission_key TEXT,
  _reason TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org     UUID := public._fin_caller_org();
  v_perm_id UUID;
BEGIN
  IF NOT (
    public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'revocation reason required (>=5 chars)';
  END IF;

  SELECT id INTO v_perm_id FROM public.financial_permissions WHERE key = _permission_key;
  IF v_perm_id IS NULL THEN
    RAISE EXCEPTION 'unknown permission %', _permission_key;
  END IF;

  UPDATE public.financial_user_permissions
     SET revoked_at = now(), revoked_by = auth.uid(), revoke_reason = _reason, updated_at = now()
   WHERE organization_id = v_org
     AND user_id = _user_id
     AND permission_id = v_perm_id
     AND revoked_at IS NULL;

  INSERT INTO public.financial_permission_audit_logs
    (organization_id, actor_user_id, target_user_id, action, permission_key, reason)
  VALUES (v_org, auth.uid(), _user_id, 'revoke', _permission_key, _reason);
END $$;

-- apply_financial_role_template(user_id, template_id)
CREATE OR REPLACE FUNCTION public.apply_financial_role_template(
  _user_id UUID,
  _template_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org   UUID := public._fin_caller_org();
  v_target_org UUID;
  v_code  TEXT;
  v_count INT := 0;
  r RECORD;
BEGIN
  IF NOT (
    public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_target_org FROM public.user_roles
   WHERE user_id = _user_id ORDER BY created_at LIMIT 1;
  IF v_target_org IS NULL OR v_target_org <> v_org THEN
    RAISE EXCEPTION 'cross-organization apply not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT code INTO v_code FROM public.financial_role_templates
   WHERE id = _template_id AND (is_system = true OR organization_id = v_org);
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'template not found';
  END IF;

  FOR r IN
    SELECT p.id AS permission_id, p.key
      FROM public.financial_role_template_permissions tp
      JOIN public.financial_permissions p ON p.id = tp.permission_id
     WHERE tp.template_id = _template_id
  LOOP
    INSERT INTO public.financial_user_permissions
      (organization_id, user_id, permission_id, granted_by, source_template)
    VALUES (v_org, _user_id, r.permission_id, auth.uid(), _template_id)
    ON CONFLICT (organization_id, user_id, permission_id)
      WHERE revoked_at IS NULL
    DO UPDATE SET source_template = EXCLUDED.source_template, updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.financial_permission_audit_logs
    (organization_id, actor_user_id, target_user_id, action, template_code, metadata)
  VALUES (v_org, auth.uid(), _user_id, 'template_applied', v_code,
          jsonb_build_object('template_id', _template_id, 'permissions_count', v_count));

  RETURN v_count;
END $$;

-- =====================================================================
-- RLS POLICIES (após funções, porque dependem de _fin_is_admin / has_*)
-- =====================================================================

-- financial_user_permissions
CREATE POLICY "fup_select_self_or_admin" ON public.financial_user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  );
CREATE POLICY "fup_write_admin_only" ON public.financial_user_permissions
  FOR ALL TO authenticated
  USING (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'))
  WITH CHECK (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'));

-- financial_user_scopes
CREATE POLICY "fus_select_self_or_admin" ON public.financial_user_scopes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  );
CREATE POLICY "fus_write_admin_only" ON public.financial_user_scopes
  FOR ALL TO authenticated
  USING (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'))
  WITH CHECK (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'));

-- financial_approval_limits
CREATE POLICY "fal_select_self_or_admin" ON public.financial_approval_limits
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
  );
CREATE POLICY "fal_write_admin_only" ON public.financial_approval_limits
  FOR ALL TO authenticated
  USING (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'))
  WITH CHECK (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'));

-- financial_permission_audit_logs
CREATE POLICY "fpal_select_admin" ON public.financial_permission_audit_logs
  FOR SELECT TO authenticated
  USING (
    public._fin_is_admin()
    OR public.has_financial_permission(auth.uid(), 'financeiro.usuarios.gerenciar_permissoes')
    OR target_user_id = auth.uid()
  );
CREATE POLICY "fpal_insert_admin" ON public.financial_permission_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public._fin_is_admin() OR public.has_financial_permission(auth.uid(),'financeiro.usuarios.gerenciar_permissoes'));

-- =====================================================================
-- SEED: catálogo de permissões e templates oficiais
-- =====================================================================

INSERT INTO public.financial_permissions (key, category, action, name, description, is_sensitive) VALUES
  ('financeiro.dashboard.visualizar',           'dashboard',       'visualizar', 'Ver Dashboard Financeiro', 'Acesso ao painel principal do módulo financeiro.', false),

  ('financeiro.contas_pagar.visualizar',        'contas_pagar',    'visualizar', 'Ver Contas a Pagar', null, false),
  ('financeiro.contas_pagar.criar',             'contas_pagar',    'criar',      'Criar Contas a Pagar', null, false),
  ('financeiro.contas_pagar.editar',            'contas_pagar',    'editar',     'Editar Contas a Pagar', null, false),
  ('financeiro.contas_pagar.aprovar',           'contas_pagar',    'aprovar',    'Aprovar Contas a Pagar', 'Sujeita a limite de valor.', true),
  ('financeiro.contas_pagar.pagar',             'contas_pagar',    'pagar',      'Efetivar Pagamento', 'Sujeita a limite de valor.', true),
  ('financeiro.contas_pagar.cancelar',          'contas_pagar',    'cancelar',   'Cancelar Conta a Pagar', null, true),

  ('financeiro.contas_receber.visualizar',      'contas_receber',  'visualizar', 'Ver Contas a Receber', null, false),
  ('financeiro.contas_receber.criar',           'contas_receber',  'criar',      'Criar Contas a Receber', null, false),
  ('financeiro.contas_receber.editar',          'contas_receber',  'editar',     'Editar Contas a Receber', null, false),
  ('financeiro.contas_receber.baixar',          'contas_receber',  'baixar',     'Baixar Recebível', null, true),
  ('financeiro.contas_receber.renegociar',      'contas_receber',  'renegociar', 'Renegociar Recebível', null, true),

  ('financeiro.tesouraria.visualizar',          'tesouraria',      'visualizar', 'Ver Tesouraria', null, false),
  ('financeiro.tesouraria.movimentar',          'tesouraria',      'movimentar', 'Movimentar Tesouraria', 'Sujeita a limite de valor.', true),
  ('financeiro.tesouraria.estornar',            'tesouraria',      'estornar',   'Estornar Movimentação', null, true),

  ('financeiro.conciliacao.visualizar',         'conciliacao',     'visualizar', 'Ver Conciliação', null, false),
  ('financeiro.conciliacao.executar',           'conciliacao',     'executar',   'Executar Conciliação', null, true),
  ('financeiro.conciliacao.desfazer',           'conciliacao',     'desfazer',   'Desfazer Conciliação', null, true),

  ('financeiro.orcamento.visualizar',           'orcamento',       'visualizar', 'Ver Orçamentos', null, false),
  ('financeiro.orcamento.editar',               'orcamento',       'editar',     'Editar Orçamento', null, false),
  ('financeiro.orcamento.aprovar',              'orcamento',       'aprovar',    'Aprovar Orçamento', 'Sujeita a limite de valor.', true),

  ('financeiro.relatorios.visualizar',          'relatorios',      'visualizar', 'Ver Relatórios Financeiros', null, false),
  ('financeiro.relatorios.exportar',            'relatorios',      'exportar',   'Exportar Relatórios', null, false),

  ('financeiro.configuracoes.visualizar',       'configuracoes',   'visualizar', 'Ver Configurações Financeiras', null, false),
  ('financeiro.configuracoes.editar',           'configuracoes',   'editar',     'Editar Configurações Financeiras', null, true),

  ('financeiro.usuarios.gerenciar_permissoes',  'usuarios',        'gerenciar',  'Gerenciar Permissões Financeiras', 'Conceder/revogar permissões para outros usuários.', true),
  ('financeiro.fechamento.executar',            'fechamento',      'executar',   'Executar Fechamento Financeiro', null, true)
ON CONFLICT (key) DO NOTHING;

-- Templates oficiais (is_system)
INSERT INTO public.financial_role_templates (code, name, description, is_system) VALUES
  ('consulta',         'Consulta',          'Apenas visualização de dashboards, relatórios e listagens.', true),
  ('operador',         'Operador',          'Lança contas a pagar/receber e movimentos básicos, sem aprovar.', true),
  ('aprovador',        'Aprovador',         'Aprova contas a pagar e orçamentos dentro do seu limite.', true),
  ('tesouraria',       'Tesouraria',        'Tesouraria operacional: movimenta, paga e baixa recebíveis.', true),
  ('gestor_financeiro','Gestor Financeiro', 'Gestão completa: aprova, paga, configura e executa fechamento.', true),
  ('auditor',          'Auditor',           'Acesso total de leitura, incluindo auditoria.', true)
ON CONFLICT DO NOTHING;

-- Mapeia permissões oficiais para cada template
WITH t AS (SELECT id, code FROM public.financial_role_templates WHERE is_system),
     p AS (SELECT id, key FROM public.financial_permissions),
     map(code, key) AS (VALUES
        -- Consulta: tudo .visualizar + relatorios.exportar
        ('consulta','financeiro.dashboard.visualizar'),
        ('consulta','financeiro.contas_pagar.visualizar'),
        ('consulta','financeiro.contas_receber.visualizar'),
        ('consulta','financeiro.tesouraria.visualizar'),
        ('consulta','financeiro.conciliacao.visualizar'),
        ('consulta','financeiro.orcamento.visualizar'),
        ('consulta','financeiro.relatorios.visualizar'),
        ('consulta','financeiro.relatorios.exportar'),

        -- Operador
        ('operador','financeiro.dashboard.visualizar'),
        ('operador','financeiro.contas_pagar.visualizar'),
        ('operador','financeiro.contas_pagar.criar'),
        ('operador','financeiro.contas_pagar.editar'),
        ('operador','financeiro.contas_receber.visualizar'),
        ('operador','financeiro.contas_receber.criar'),
        ('operador','financeiro.contas_receber.editar'),
        ('operador','financeiro.relatorios.visualizar'),

        -- Aprovador
        ('aprovador','financeiro.dashboard.visualizar'),
        ('aprovador','financeiro.contas_pagar.visualizar'),
        ('aprovador','financeiro.contas_pagar.aprovar'),
        ('aprovador','financeiro.orcamento.visualizar'),
        ('aprovador','financeiro.orcamento.aprovar'),
        ('aprovador','financeiro.relatorios.visualizar'),

        -- Tesouraria
        ('tesouraria','financeiro.dashboard.visualizar'),
        ('tesouraria','financeiro.contas_pagar.visualizar'),
        ('tesouraria','financeiro.contas_pagar.pagar'),
        ('tesouraria','financeiro.contas_receber.visualizar'),
        ('tesouraria','financeiro.contas_receber.baixar'),
        ('tesouraria','financeiro.tesouraria.visualizar'),
        ('tesouraria','financeiro.tesouraria.movimentar'),
        ('tesouraria','financeiro.tesouraria.estornar'),
        ('tesouraria','financeiro.conciliacao.visualizar'),
        ('tesouraria','financeiro.conciliacao.executar'),
        ('tesouraria','financeiro.relatorios.visualizar'),

        -- Gestor Financeiro (amplo)
        ('gestor_financeiro','financeiro.dashboard.visualizar'),
        ('gestor_financeiro','financeiro.contas_pagar.visualizar'),
        ('gestor_financeiro','financeiro.contas_pagar.criar'),
        ('gestor_financeiro','financeiro.contas_pagar.editar'),
        ('gestor_financeiro','financeiro.contas_pagar.aprovar'),
        ('gestor_financeiro','financeiro.contas_pagar.pagar'),
        ('gestor_financeiro','financeiro.contas_pagar.cancelar'),
        ('gestor_financeiro','financeiro.contas_receber.visualizar'),
        ('gestor_financeiro','financeiro.contas_receber.criar'),
        ('gestor_financeiro','financeiro.contas_receber.editar'),
        ('gestor_financeiro','financeiro.contas_receber.baixar'),
        ('gestor_financeiro','financeiro.contas_receber.renegociar'),
        ('gestor_financeiro','financeiro.tesouraria.visualizar'),
        ('gestor_financeiro','financeiro.tesouraria.movimentar'),
        ('gestor_financeiro','financeiro.tesouraria.estornar'),
        ('gestor_financeiro','financeiro.conciliacao.visualizar'),
        ('gestor_financeiro','financeiro.conciliacao.executar'),
        ('gestor_financeiro','financeiro.conciliacao.desfazer'),
        ('gestor_financeiro','financeiro.orcamento.visualizar'),
        ('gestor_financeiro','financeiro.orcamento.editar'),
        ('gestor_financeiro','financeiro.orcamento.aprovar'),
        ('gestor_financeiro','financeiro.relatorios.visualizar'),
        ('gestor_financeiro','financeiro.relatorios.exportar'),
        ('gestor_financeiro','financeiro.configuracoes.visualizar'),
        ('gestor_financeiro','financeiro.configuracoes.editar'),
        ('gestor_financeiro','financeiro.fechamento.executar'),

        -- Auditor (somente leitura ampla + relatórios)
        ('auditor','financeiro.dashboard.visualizar'),
        ('auditor','financeiro.contas_pagar.visualizar'),
        ('auditor','financeiro.contas_receber.visualizar'),
        ('auditor','financeiro.tesouraria.visualizar'),
        ('auditor','financeiro.conciliacao.visualizar'),
        ('auditor','financeiro.orcamento.visualizar'),
        ('auditor','financeiro.relatorios.visualizar'),
        ('auditor','financeiro.relatorios.exportar'),
        ('auditor','financeiro.configuracoes.visualizar')
     )
INSERT INTO public.financial_role_template_permissions (template_id, permission_id)
SELECT t.id, p.id
  FROM map m JOIN t ON t.code = m.code JOIN p ON p.key = m.key
ON CONFLICT DO NOTHING;
