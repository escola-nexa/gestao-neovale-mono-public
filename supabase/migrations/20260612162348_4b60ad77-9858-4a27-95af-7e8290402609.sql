
-- ============================================================
-- FASE 6: Orçamento e Fechamento Mensal
-- ============================================================

DO $$ BEGIN CREATE TYPE public.financial_budget_status AS ENUM ('DRAFT','ACTIVE','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.financial_budget_overrun_mode AS ENUM ('ALERT','REQUIRE_APPROVAL','BLOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.financial_closure_status AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.financial_closure_scope AS ENUM ('ORG','SCHOOL','COST_CENTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Helper de leitura: o usuário pode ver módulo orçamento/fechamento?
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_view_financial_budget(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin')
      OR public.has_financial_permission(_uid,'financeiro.orcamento.visualizar')
      OR public.has_financial_permission(_uid,'financeiro.orcamento.editar')
      OR public.has_financial_permission(_uid,'financeiro.orcamento.aprovar')
      OR public.has_financial_permission(_uid,'financeiro.fechamento.executar');
$$;

-- ============================================================
-- financial_budgets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL,
  month integer NULL CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
  status public.financial_budget_status NOT NULL DEFAULT 'DRAFT',
  overrun_mode public.financial_budget_overrun_mode NOT NULL DEFAULT 'REQUIRE_APPROVAL',
  alert_threshold_percent numeric(5,2) NOT NULL DEFAULT 80.00,
  total_planned numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_budgets_org_year ON public.financial_budgets(organization_id, year, month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_budgets TO authenticated;
GRANT ALL ON public.financial_budgets TO service_role;
ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_budgets_read" ON public.financial_budgets FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.can_view_financial_budget(auth.uid()));

CREATE POLICY "fin_budgets_write" ON public.financial_budgets FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.orcamento.editar')))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.orcamento.editar')));

-- ============================================================
-- financial_budget_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.financial_budgets(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  cost_center_id uuid NOT NULL REFERENCES public.financial_cost_centers(id) ON DELETE RESTRICT,
  school_id uuid NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  project_id uuid NULL REFERENCES public.financial_projects(id) ON DELETE SET NULL,
  month integer NULL CHECK (month IS NULL OR (month BETWEEN 1 AND 12)),
  planned_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_budget_lines_budget ON public.financial_budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_fin_budget_lines_dim ON public.financial_budget_lines(category_id, cost_center_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_budget_lines TO authenticated;
GRANT ALL ON public.financial_budget_lines TO service_role;
ALTER TABLE public.financial_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_budget_lines_read" ON public.financial_budget_lines FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.can_view_financial_budget(auth.uid()));

CREATE POLICY "fin_budget_lines_write" ON public.financial_budget_lines FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.orcamento.editar')))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.orcamento.editar')));

-- ============================================================
-- financial_period_closures
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_period_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  scope public.financial_closure_scope NOT NULL DEFAULT 'ORG',
  school_id uuid NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cost_center_id uuid NULL REFERENCES public.financial_cost_centers(id) ON DELETE CASCADE,
  status public.financial_closure_status NOT NULL DEFAULT 'OPEN',
  closed_by uuid,
  closed_at timestamptz,
  reopened_by uuid,
  reopened_at timestamptz,
  reopen_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_closure_scope ON public.financial_period_closures(
  organization_id, year, month, scope,
  COALESCE(school_id,'00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(cost_center_id,'00000000-0000-0000-0000-000000000000'::uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_period_closures TO authenticated;
GRANT ALL ON public.financial_period_closures TO service_role;
ALTER TABLE public.financial_period_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_closures_read" ON public.financial_period_closures FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.can_view_financial_budget(auth.uid()));

CREATE POLICY "fin_closures_write" ON public.financial_period_closures FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar')))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid())
         AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar')));

-- ============================================================
-- financial_closure_audit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_closure_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  closure_id uuid NOT NULL REFERENCES public.financial_period_closures(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('CLOSE','REOPEN')),
  acted_by uuid,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_closure_audit_closure ON public.financial_closure_audit(closure_id);

GRANT SELECT, INSERT ON public.financial_closure_audit TO authenticated;
GRANT ALL ON public.financial_closure_audit TO service_role;
ALTER TABLE public.financial_closure_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_closure_audit_read" ON public.financial_closure_audit FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()) AND public.can_view_financial_budget(auth.uid()));

CREATE POLICY "fin_closure_audit_insert" ON public.financial_closure_audit FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid())
              AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar')));

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_fin_budgets_updated ON public.financial_budgets;
CREATE TRIGGER trg_fin_budgets_updated BEFORE UPDATE ON public.financial_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_fin_budget_lines_updated ON public.financial_budget_lines;
CREATE TRIGGER trg_fin_budget_lines_updated BEFORE UPDATE ON public.financial_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_fin_closures_updated ON public.financial_period_closures;
CREATE TRIGGER trg_fin_closures_updated BEFORE UPDATE ON public.financial_period_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- is_financial_period_closed
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_financial_period_closed(
  _org uuid, _date date, _school_id uuid DEFAULT NULL, _cost_center_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.financial_period_closures c
    WHERE c.organization_id = _org AND c.status = 'CLOSED'
      AND c.year = EXTRACT(YEAR FROM _date)::int
      AND c.month = EXTRACT(MONTH FROM _date)::int
      AND (
        c.scope = 'ORG'
        OR (c.scope = 'SCHOOL' AND _school_id IS NOT NULL AND c.school_id = _school_id)
        OR (c.scope = 'COST_CENTER' AND _cost_center_id IS NOT NULL AND c.cost_center_id = _cost_center_id)
      )
  );
$$;

-- ============================================================
-- Trigger: bloqueia alterações em entries cuja competência caia em período fechado
-- (Verifica ORG global; e cada alocação para SCHOOL/CC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_changes_on_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_date date;
  v_blocked boolean := false;
  v_eid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := OLD.organization_id;
    v_date := COALESCE(OLD.competence_date, OLD.due_date, OLD.issue_date, OLD.created_at::date);
    v_eid := OLD.id;
  ELSE
    v_org := NEW.organization_id;
    v_date := COALESCE(NEW.competence_date, NEW.due_date, NEW.issue_date, NEW.created_at::date);
    v_eid := NEW.id;
  END IF;

  IF v_date IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Permissão de fechamento pode alterar mesmo períodos fechados
  IF public.has_role(auth.uid(),'admin')
     OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ORG scope
  IF public.is_financial_period_closed(v_org, v_date) THEN
    v_blocked := true;
  ELSE
    -- SCHOOL / COST_CENTER scope via allocations
    SELECT TRUE INTO v_blocked
    FROM public.financial_entry_allocations a
    WHERE a.entry_id = v_eid
      AND public.is_financial_period_closed(v_org, v_date, a.school_id, a.cost_center_id)
    LIMIT 1;
  END IF;

  IF v_blocked THEN
    RAISE EXCEPTION 'Período financeiro fechado para % — alteração não permitida.', to_char(v_date,'MM/YYYY')
      USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_closed_entries ON public.financial_entries;
CREATE TRIGGER trg_block_closed_entries
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_changes_on_closed_period();

-- ============================================================
-- close_financial_period
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_financial_period(
  _org uuid, _year integer, _month integer,
  _scope public.financial_closure_scope DEFAULT 'ORG',
  _school_id uuid DEFAULT NULL, _cost_center_id uuid DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar')) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.fechamento.executar' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.financial_period_closures(
    organization_id, year, month, scope, school_id, cost_center_id, status, closed_by, closed_at, notes
  ) VALUES (
    _org, _year, _month, _scope, _school_id, _cost_center_id, 'CLOSED', auth.uid(), now(), _notes
  )
  ON CONFLICT (organization_id, year, month, scope,
               COALESCE(school_id,'00000000-0000-0000-0000-000000000000'::uuid),
               COALESCE(cost_center_id,'00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET status='CLOSED', closed_by=auth.uid(), closed_at=now(),
                reopened_by=NULL, reopened_at=NULL, reopen_reason=NULL,
                notes=COALESCE(EXCLUDED.notes, public.financial_period_closures.notes),
                updated_at=now()
  RETURNING id INTO v_id;

  INSERT INTO public.financial_closure_audit(organization_id, closure_id, action, acted_by, reason)
  VALUES (_org, v_id, 'CLOSE', auth.uid(), _notes);
  RETURN v_id;
END;
$$;

-- ============================================================
-- reopen_financial_period
-- ============================================================
CREATE OR REPLACE FUNCTION public.reopen_financial_period(_closure_id uuid, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.financial_period_closures WHERE id=_closure_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Fechamento não encontrado'; END IF;

  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financeiro.fechamento.executar')) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.fechamento.executar' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Justificativa obrigatória (mínimo 5 caracteres)';
  END IF;

  UPDATE public.financial_period_closures
     SET status='OPEN', reopened_by=auth.uid(), reopened_at=now(),
         reopen_reason=_reason, updated_at=now()
   WHERE id=_closure_id;

  INSERT INTO public.financial_closure_audit(organization_id, closure_id, action, acted_by, reason)
  VALUES (v_org, _closure_id, 'REOPEN', auth.uid(), _reason);
  RETURN true;
END;
$$;

-- ============================================================
-- get_budget_consumption
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_budget_consumption(_budget_id uuid)
RETURNS TABLE(
  line_id uuid, category_id uuid, category_name text,
  cost_center_id uuid, cost_center_name text,
  school_id uuid, project_id uuid, month integer,
  planned numeric, committed numeric, realized numeric,
  available numeric, consumption_percent numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_year int; v_month int;
BEGIN
  SELECT organization_id, year, month INTO v_org, v_year, v_month
  FROM public.financial_budgets WHERE id=_budget_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF NOT public.can_view_financial_budget(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH lines AS (
    SELECT bl.id, bl.category_id, bl.cost_center_id, bl.school_id, bl.project_id,
           bl.month, bl.planned_amount, c.name AS cat_name, cc.name AS cc_name
    FROM public.financial_budget_lines bl
    JOIN public.financial_categories c ON c.id = bl.category_id
    JOIN public.financial_cost_centers cc ON cc.id = bl.cost_center_id
    WHERE bl.budget_id = _budget_id
  ),
  consumption AS (
    SELECT l.id AS lid,
      COALESCE(SUM(CASE WHEN e.status IN ('pending_approval','approved','scheduled','partially_paid','overdue')
                        THEN i.amount ELSE 0 END),0) AS committed_v,
      COALESCE(SUM(CASE WHEN i.status='paid' THEN COALESCE(i.paid_amount, i.amount)
                        WHEN i.status='partially_paid' THEN COALESCE(i.paid_amount,0) ELSE 0 END),0) AS realized_v
    FROM lines l
    LEFT JOIN public.financial_entries e ON e.organization_id = v_org
      AND e.kind = 'payable'
      AND e.category_id = l.category_id
      AND EXTRACT(YEAR FROM COALESCE(e.competence_date, e.due_date)) = v_year
      AND (v_month IS NULL OR EXTRACT(MONTH FROM COALESCE(e.competence_date, e.due_date)) = COALESCE(l.month, v_month))
    LEFT JOIN public.financial_entry_allocations a ON a.entry_id = e.id
      AND a.cost_center_id = l.cost_center_id
      AND (l.school_id IS NULL OR a.school_id = l.school_id)
      AND (l.project_id IS NULL OR a.project_id = l.project_id)
    LEFT JOIN public.financial_installments i ON i.entry_id = e.id
    WHERE a.id IS NOT NULL
    GROUP BY l.id
  )
  SELECT l.id, l.category_id, l.cat_name, l.cost_center_id, l.cc_name,
         l.school_id, l.project_id, l.month,
         l.planned_amount,
         COALESCE(co.committed_v,0),
         COALESCE(co.realized_v,0),
         l.planned_amount - COALESCE(co.committed_v,0) - COALESCE(co.realized_v,0),
         CASE WHEN l.planned_amount > 0
           THEN ROUND(((COALESCE(co.committed_v,0)+COALESCE(co.realized_v,0)) / l.planned_amount)*100, 2)
           ELSE 0 END
  FROM lines l LEFT JOIN consumption co ON co.lid = l.id
  ORDER BY l.cat_name, l.cc_name;
END;
$$;

-- ============================================================
-- check_budget_overrun
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_budget_overrun(
  _org uuid, _category_id uuid, _cost_center_id uuid,
  _amount numeric, _competence_date date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_line record; v_current numeric; v_total numeric;
BEGIN
  SELECT bl.id, bl.budget_id, bl.planned_amount, bl.month,
         b.overrun_mode, b.alert_threshold_percent
    INTO v_line
  FROM public.financial_budget_lines bl
  JOIN public.financial_budgets b ON b.id = bl.budget_id
  WHERE bl.organization_id = _org
    AND bl.category_id = _category_id
    AND bl.cost_center_id = _cost_center_id
    AND b.year = EXTRACT(YEAR FROM _competence_date)::int
    AND (b.month IS NULL OR b.month = EXTRACT(MONTH FROM _competence_date)::int)
    AND b.status = 'ACTIVE'
  ORDER BY b.month NULLS LAST LIMIT 1;

  IF v_line IS NULL THEN RETURN jsonb_build_object('has_budget', false); END IF;

  SELECT COALESCE(SUM(i.amount),0) INTO v_current
  FROM public.financial_entries e
  JOIN public.financial_entry_allocations a ON a.entry_id = e.id AND a.cost_center_id = _cost_center_id
  JOIN public.financial_installments i ON i.entry_id = e.id
  WHERE e.organization_id = _org AND e.kind='payable'
    AND e.category_id = _category_id
    AND e.status IN ('pending_approval','approved','scheduled','partially_paid','paid','overdue')
    AND EXTRACT(YEAR FROM COALESCE(e.competence_date,e.due_date)) = EXTRACT(YEAR FROM _competence_date)
    AND (v_line.month IS NULL OR EXTRACT(MONTH FROM COALESCE(e.competence_date,e.due_date)) = v_line.month);

  v_total := v_current + _amount;

  RETURN jsonb_build_object(
    'has_budget', true,
    'budget_id', v_line.budget_id,
    'line_id', v_line.id,
    'planned', v_line.planned_amount,
    'current', v_current,
    'new_total', v_total,
    'overrun', GREATEST(v_total - v_line.planned_amount, 0),
    'percent', CASE WHEN v_line.planned_amount>0 THEN ROUND((v_total/v_line.planned_amount)*100,2) ELSE 0 END,
    'mode', v_line.overrun_mode,
    'requires_extra_approval', (v_total > v_line.planned_amount AND v_line.overrun_mode='REQUIRE_APPROVAL'),
    'blocked', (v_total > v_line.planned_amount AND v_line.overrun_mode='BLOCK'),
    'alert', (v_line.planned_amount>0 AND (v_total/v_line.planned_amount)*100 >= v_line.alert_threshold_percent)
  );
END;
$$;
