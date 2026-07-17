-- CFG-10: políticas e etapas de aprovação

-- ============ POLÍTICAS ============
CREATE TABLE IF NOT EXISTS public.financial_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  operation_type text NOT NULL
    CHECK (operation_type IN ('expense','payment','reversal','budget','period_reopen','income','transfer','all')),
  min_amount numeric(14,2) NOT NULL DEFAULT 0,
  max_amount numeric(14,2),
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.financial_projects(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'sequential' CHECK (mode IN ('sequential','parallel')),
  enforce_segregation boolean NOT NULL DEFAULT true,
  require_dual_approver boolean NOT NULL DEFAULT false,
  dual_approver_threshold numeric(14,2),
  priority integer NOT NULL DEFAULT 100,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_approval_policies TO authenticated;
GRANT ALL ON public.financial_approval_policies TO service_role;
ALTER TABLE public.financial_approval_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org reads approval policies"
  ON public.financial_approval_policies FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins manage approval policies"
  ON public.financial_approval_policies FOR ALL TO authenticated
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

CREATE TRIGGER trg_fin_approval_policies_updated_at
  BEFORE UPDATE ON public.financial_approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ETAPAS ============
CREATE TABLE IF NOT EXISTS public.financial_approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.financial_approval_policies(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  approver_type text NOT NULL CHECK (approver_type IN ('user','role','permission')),
  approver_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_role public.app_role,
  approver_permission text,
  substitute_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  substitute_until date,
  min_amount numeric(14,2) NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (approver_type = 'user' AND approver_user_id IS NOT NULL) OR
    (approver_type = 'role' AND approver_role IS NOT NULL) OR
    (approver_type = 'permission' AND approver_permission IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_fin_appr_steps_policy ON public.financial_approval_steps(policy_id, step_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_approval_steps TO authenticated;
GRANT ALL ON public.financial_approval_steps TO service_role;
ALTER TABLE public.financial_approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org reads approval steps"
  ON public.financial_approval_steps FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins manage approval steps"
  ON public.financial_approval_steps FOR ALL TO authenticated
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

CREATE TRIGGER trg_fin_appr_steps_updated_at
  BEFORE UPDATE ON public.financial_approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LIMITES — substituto ============
ALTER TABLE public.financial_approval_limits
  ADD COLUMN IF NOT EXISTS delegate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegate_until date,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ============ RPC: resolve fluxo aplicável ============
CREATE OR REPLACE FUNCTION public.resolve_financial_approval_flow(
  _organization_id uuid,
  _operation_type text,
  _amount numeric,
  _category_id uuid DEFAULT NULL,
  _cost_center_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL,
  _school_id uuid DEFAULT NULL,
  _account_id uuid DEFAULT NULL,
  _requester_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.financial_approval_policies;
  v_steps jsonb;
BEGIN
  SELECT * INTO v_policy
  FROM public.financial_approval_policies p
  WHERE p.organization_id = _organization_id
    AND p.active
    AND (p.operation_type = _operation_type OR p.operation_type = 'all')
    AND _amount >= p.min_amount
    AND (p.max_amount IS NULL OR _amount <= p.max_amount)
    AND (p.category_id IS NULL OR p.category_id = _category_id)
    AND (p.cost_center_id IS NULL OR p.cost_center_id = _cost_center_id)
    AND (p.project_id IS NULL OR p.project_id = _project_id)
    AND (p.school_id IS NULL OR p.school_id = _school_id)
    AND (p.account_id IS NULL OR p.account_id = _account_id)
  ORDER BY p.priority ASC, p.min_amount DESC
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    RETURN jsonb_build_object('policy_id', NULL, 'steps', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_id', s.id,
      'step_order', s.step_order,
      'name', s.name,
      'approver_type', s.approver_type,
      'approver_user_id', s.approver_user_id,
      'approver_role', s.approver_role,
      'approver_permission', s.approver_permission,
      'substitute_user_id', CASE WHEN s.substitute_until IS NULL OR s.substitute_until >= current_date
                                 THEN s.substitute_user_id ELSE NULL END,
      'min_amount', s.min_amount,
      'is_required', s.is_required
    ) ORDER BY s.step_order
  ), '[]'::jsonb) INTO v_steps
  FROM public.financial_approval_steps s
  WHERE s.policy_id = v_policy.id
    AND s.active
    AND _amount >= s.min_amount
    AND (NOT v_policy.enforce_segregation
         OR _requester_id IS NULL
         OR s.approver_user_id IS DISTINCT FROM _requester_id);

  RETURN jsonb_build_object(
    'policy_id', v_policy.id,
    'policy_name', v_policy.name,
    'mode', v_policy.mode,
    'enforce_segregation', v_policy.enforce_segregation,
    'require_dual_approver', v_policy.require_dual_approver
      OR (v_policy.dual_approver_threshold IS NOT NULL
          AND _amount >= v_policy.dual_approver_threshold),
    'steps', v_steps
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_financial_approval_flow(uuid,text,numeric,uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_financial_approval_flow(uuid,text,numeric,uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated, service_role;

-- ============ RPC: usuário pode aprovar este valor? ============
CREATE OR REPLACE FUNCTION public.can_user_approve_amount(
  _user_id uuid,
  _amount numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_approval_limits l
    WHERE l.user_id = _user_id
      AND COALESCE(l.active, true)
      AND (l.max_amount IS NULL OR _amount <= l.max_amount)
  ) OR public.has_role(_user_id, 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.can_user_approve_amount(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_user_approve_amount(uuid,numeric) TO authenticated, service_role;