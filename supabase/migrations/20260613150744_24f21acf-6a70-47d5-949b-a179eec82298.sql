
-- ============================================================================
-- CFG-12: Financial setup wizard RPCs
-- ============================================================================

-- Status RPC: returns JSONB with each minimum requirement
CREATE OR REPLACE FUNCTION public.get_financial_setup_status(_organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _has_account boolean;
  _has_income_cat boolean;
  _has_expense_cat boolean;
  _has_cost_center boolean;
  _has_payment_method boolean;
  _has_doc_type boolean;
  _has_finance_manager boolean;
  _has_approval_policy boolean;
  _approval_disabled boolean;
  _has_substitution_categories boolean;
  _has_settings boolean;
  _checks jsonb;
  _completed int := 0;
  _total int := 7;
BEGIN
  _org := COALESCE(_organization_id, (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
  IF _org IS NULL THEN
    RETURN jsonb_build_object('error', 'organization_not_found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.financial_accounts WHERE organization_id = _org AND active = true) INTO _has_account;
  SELECT EXISTS(SELECT 1 FROM public.financial_categories WHERE organization_id = _org AND active = true AND (category_nature = 'income' OR nature = 'income')) INTO _has_income_cat;
  SELECT EXISTS(SELECT 1 FROM public.financial_categories WHERE organization_id = _org AND active = true AND (category_nature = 'expense' OR nature = 'expense')) INTO _has_expense_cat;
  SELECT EXISTS(SELECT 1 FROM public.financial_cost_centers WHERE organization_id = _org AND active = true) INTO _has_cost_center;
  SELECT EXISTS(SELECT 1 FROM public.financial_payment_methods WHERE organization_id = _org AND active = true) INTO _has_payment_method;
  SELECT EXISTS(SELECT 1 FROM public.financial_document_types WHERE organization_id = _org AND active = true) INTO _has_doc_type;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    WHERE ur.role = 'financeiro' OR ur.role = 'admin'
  ) INTO _has_finance_manager;

  SELECT EXISTS(SELECT 1 FROM public.financial_approval_policies WHERE organization_id = _org AND active = true) INTO _has_approval_policy;
  SELECT EXISTS(SELECT 1 FROM public.financial_settings WHERE organization_id = _org) INTO _has_settings;

  SELECT (default_substitution_category_id IS NOT NULL AND default_route_category_id IS NOT NULL)
    INTO _has_substitution_categories
    FROM public.financial_settings WHERE organization_id = _org;
  _has_substitution_categories := COALESCE(_has_substitution_categories, false);

  _approval_disabled := false; -- placeholder for explicit disable flag

  _checks := jsonb_build_array(
    jsonb_build_object('key','account','label','Conta financeira ativa','ok',_has_account,'path','/administracao/financeiro/contas'),
    jsonb_build_object('key','income_category','label','Categoria de receita','ok',_has_income_cat,'path','/administracao/financeiro/plano-contas'),
    jsonb_build_object('key','expense_category','label','Categoria de despesa','ok',_has_expense_cat,'path','/administracao/financeiro/plano-contas'),
    jsonb_build_object('key','cost_center','label','Centro de custo analítico','ok',_has_cost_center,'path','/administracao/financeiro/centros-custo'),
    jsonb_build_object('key','payment_method','label','Método de pagamento ativo','ok',_has_payment_method,'path','/administracao/financeiro/metodos-pagamento'),
    jsonb_build_object('key','finance_manager','label','Gestor financeiro autorizado','ok',_has_finance_manager,'path','/administracao/permissoes-financeiras'),
    jsonb_build_object('key','approval','label','Política de aprovação ou desativação explícita','ok',(_has_approval_policy OR _approval_disabled),'path','/administracao/financeiro/politicas-aprovacao'),
    jsonb_build_object('key','substitution_categories','label','Integrações de substituições/rotas','ok',_has_substitution_categories,'path','/administracao/financeiro/configuracoes'),
    jsonb_build_object('key','doc_type','label','Tipo de documento ativo','ok',_has_doc_type,'path','/administracao/financeiro/tipos-documento')
  );

  SELECT count(*) INTO _completed
  FROM jsonb_array_elements(_checks) e WHERE (e->>'ok')::boolean;

  SELECT jsonb_array_length(_checks) INTO _total;

  RETURN jsonb_build_object(
    'organization_id', _org,
    'checks', _checks,
    'completed', _completed,
    'total', _total,
    'percent', CASE WHEN _total > 0 THEN round((_completed::numeric / _total) * 100) ELSE 0 END,
    'ready', _completed = _total
  );
END;
$$;

-- Quick check used by guards
CREATE OR REPLACE FUNCTION public.is_financial_ready(_organization_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.get_financial_setup_status(_organization_id) ->> 'ready')::boolean, false);
$$;

-- Idempotent seed of recommended defaults
CREATE OR REPLACE FUNCTION public.seed_financial_defaults(_organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _user uuid := auth.uid();
  _created jsonb := '{}'::jsonb;
  _cat_income_id uuid;
  _cat_expense_id uuid;
  _cc_id uuid;
  _pm_id uuid;
  _dt_id uuid;
  _is_admin boolean;
BEGIN
  _org := COALESCE(_organization_id, (SELECT organization_id FROM public.profiles WHERE id = _user));
  IF _org IS NULL THEN RAISE EXCEPTION 'organization_not_found'; END IF;

  SELECT public.has_role(_user, 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN RAISE EXCEPTION 'forbidden: admin only'; END IF;

  -- Income parent
  SELECT id INTO _cat_income_id FROM public.financial_categories
   WHERE organization_id = _org AND code = '1' AND (category_nature = 'income' OR nature = 'income')
   LIMIT 1;
  IF _cat_income_id IS NULL THEN
    INSERT INTO public.financial_categories (organization_id, code, name, nature, category_nature, level, accepts_entries, active, created_by)
    VALUES (_org, '1', 'Receitas', 'income', 'income', 1, true, true, _user)
    RETURNING id INTO _cat_income_id;
    _created := _created || jsonb_build_object('income_category', _cat_income_id);
  END IF;

  -- Expense parent
  SELECT id INTO _cat_expense_id FROM public.financial_categories
   WHERE organization_id = _org AND code = '2' AND (category_nature = 'expense' OR nature = 'expense')
   LIMIT 1;
  IF _cat_expense_id IS NULL THEN
    INSERT INTO public.financial_categories (organization_id, code, name, nature, category_nature, level, accepts_entries, active, created_by)
    VALUES (_org, '2', 'Despesas', 'expense', 'expense', 1, true, true, _user)
    RETURNING id INTO _cat_expense_id;
    _created := _created || jsonb_build_object('expense_category', _cat_expense_id);
  END IF;

  -- Cost center
  SELECT id INTO _cc_id FROM public.financial_cost_centers
   WHERE organization_id = _org AND code = 'GERAL' LIMIT 1;
  IF _cc_id IS NULL THEN
    INSERT INTO public.financial_cost_centers (organization_id, code, name, active, created_by)
    VALUES (_org, 'GERAL', 'Geral', true, _user)
    RETURNING id INTO _cc_id;
    _created := _created || jsonb_build_object('cost_center', _cc_id);
  END IF;

  -- Payment method
  SELECT id INTO _pm_id FROM public.financial_payment_methods
   WHERE organization_id = _org AND code = 'DINHEIRO' LIMIT 1;
  IF _pm_id IS NULL THEN
    INSERT INTO public.financial_payment_methods (organization_id, code, name, method_type, direction, active, created_by)
    VALUES (_org, 'DINHEIRO', 'Dinheiro', 'cash', 'BOTH', true, _user)
    RETURNING id INTO _pm_id;
    _created := _created || jsonb_build_object('payment_method', _pm_id);
  END IF;

  -- Document type
  SELECT id INTO _dt_id FROM public.financial_document_types
   WHERE organization_id = _org AND code = 'RECIBO' LIMIT 1;
  IF _dt_id IS NULL THEN
    INSERT INTO public.financial_document_types (organization_id, code, name, direction, requires_number, requires_attachment, active)
    VALUES (_org, 'RECIBO', 'Recibo', 'BOTH', false, false, true)
    RETURNING id INTO _dt_id;
    _created := _created || jsonb_build_object('document_type', _dt_id);
  END IF;

  -- Ensure settings row exists
  INSERT INTO public.financial_settings (organization_id)
  VALUES (_org)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'created', _created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_setup_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_financial_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_financial_defaults(uuid) TO authenticated;
