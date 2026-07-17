
DO $$ BEGIN
  CREATE TYPE public.financial_project_status AS ENUM ('planning','active','suspended','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.financial_projects
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.financial_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.financial_project_status NOT NULL DEFAULT 'planning';

CREATE INDEX IF NOT EXISTS idx_fin_projects_status ON public.financial_projects(status);
CREATE INDEX IF NOT EXISTS idx_fin_projects_school ON public.financial_projects(school_id);

CREATE OR REPLACE FUNCTION public.guard_project_status_on_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.financial_project_status; v_active boolean;
BEGIN
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  SELECT status, active INTO v_status, v_active FROM public.financial_projects WHERE id = NEW.project_id;
  IF v_status IN ('completed','cancelled') OR v_active = false THEN
    RAISE EXCEPTION 'Projeto está % e não aceita novos lançamentos.', v_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_alloc_guard_project ON public.financial_entry_allocations;
CREATE TRIGGER trg_fin_alloc_guard_project
  BEFORE INSERT ON public.financial_entry_allocations
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_status_on_allocation();

CREATE OR REPLACE FUNCTION public.get_financial_project_summary(_organization_id uuid)
RETURNS TABLE (
  project_id uuid,
  budget numeric,
  committed numeric,
  realized numeric,
  balance numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    COALESCE(p.budget, 0),
    COALESCE(SUM(CASE WHEN e.status IN ('approved','scheduled','partially_paid','overdue') THEN a.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.status = 'paid' THEN a.amount ELSE 0 END), 0),
    COALESCE(p.budget, 0) - COALESCE(SUM(CASE WHEN e.status NOT IN ('cancelled','reversed','draft') THEN a.amount ELSE 0 END), 0)
  FROM public.financial_projects p
  LEFT JOIN public.financial_entry_allocations a ON a.project_id = p.id
  LEFT JOIN public.financial_entries e ON e.id = a.entry_id
  WHERE p.organization_id = _organization_id
  GROUP BY p.id, p.budget;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_project_summary(uuid) TO authenticated;
