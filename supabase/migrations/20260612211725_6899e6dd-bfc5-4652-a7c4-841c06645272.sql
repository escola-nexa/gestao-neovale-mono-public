
ALTER TABLE public.financial_cost_centers
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allows_allocations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.financial_cost_centers_normalize()
RETURNS TRIGGER AS $$
DECLARE
  v_parent RECORD;
  v_cur uuid;
  v_steps int := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
  ELSE
    SELECT id, level, organization_id
      INTO v_parent
      FROM public.financial_cost_centers
     WHERE id = NEW.parent_id;
    IF v_parent.id IS NULL THEN
      RAISE EXCEPTION 'Centro de custo pai não encontrado';
    END IF;
    IF v_parent.organization_id <> NEW.organization_id THEN
      RAISE EXCEPTION 'Centro de custo pai pertence a outra organização';
    END IF;
    NEW.level := COALESCE(v_parent.level, 1) + 1;

    IF TG_OP = 'UPDATE' AND NEW.id IS NOT NULL THEN
      v_cur := NEW.parent_id;
      WHILE v_cur IS NOT NULL AND v_steps < 50 LOOP
        IF v_cur = NEW.id THEN
          RAISE EXCEPTION 'Hierarquia de centros de custo com ciclo';
        END IF;
        SELECT parent_id INTO v_cur
          FROM public.financial_cost_centers
         WHERE id = v_cur;
        v_steps := v_steps + 1;
      END LOOP;
    END IF;
  END IF;

  IF NEW.valid_from IS NOT NULL AND NEW.valid_until IS NOT NULL
     AND NEW.valid_until < NEW.valid_from THEN
    RAISE EXCEPTION 'Validade final menor que a inicial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fin_cc_normalize ON public.financial_cost_centers;
CREATE TRIGGER trg_fin_cc_normalize
  BEFORE INSERT OR UPDATE ON public.financial_cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.financial_cost_centers_normalize();

-- Bloqueio de rateio em centros não-analíticos / inativos / fora de vigência
CREATE OR REPLACE FUNCTION public.financial_alloc_require_analytic_cc()
RETURNS TRIGGER AS $$
DECLARE
  v_cc RECORD;
  v_entry_date date;
BEGIN
  IF NEW.cost_center_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT allows_allocations, active, valid_from, valid_until
    INTO v_cc
    FROM public.financial_cost_centers
   WHERE id = NEW.cost_center_id;
  IF v_cc IS NULL THEN
    RAISE EXCEPTION 'Centro de custo inválido';
  END IF;
  IF v_cc.allows_allocations = false THEN
    RAISE EXCEPTION 'Centro de custo não aceita rateios (sintético). Selecione um centro analítico.';
  END IF;
  IF v_cc.active = false THEN
    RAISE EXCEPTION 'Centro de custo inativo.';
  END IF;
  SELECT COALESCE(competence_date, due_date, issue_date, CURRENT_DATE)
    INTO v_entry_date
    FROM public.financial_entries WHERE id = NEW.entry_id;
  IF v_cc.valid_from IS NOT NULL AND v_entry_date < v_cc.valid_from THEN
    RAISE EXCEPTION 'Centro de custo só vigora a partir de %.', v_cc.valid_from;
  END IF;
  IF v_cc.valid_until IS NOT NULL AND v_entry_date > v_cc.valid_until THEN
    RAISE EXCEPTION 'Centro de custo encerrado em %.', v_cc.valid_until;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fin_alloc_require_analytic ON public.financial_entry_allocations;
CREATE TRIGGER trg_fin_alloc_require_analytic
  BEFORE INSERT OR UPDATE OF cost_center_id ON public.financial_entry_allocations
  FOR EACH ROW EXECUTE FUNCTION public.financial_alloc_require_analytic_cc();

-- Recalcula nível
UPDATE public.financial_cost_centers SET level = 1 WHERE parent_id IS NULL;
UPDATE public.financial_cost_centers c
   SET level = p.level + 1
  FROM public.financial_cost_centers p
 WHERE c.parent_id = p.id;

-- Seed para orgs sem centros de custo
DO $$
DECLARE
  org RECORD;
  i int;
  names text[] := ARRAY[
    'Administrativo','Financeiro','Recursos Humanos','Pedagógico','Tecnologia',
    'Operações','Acompanhamento Escolar','Escolas','Projetos'];
BEGIN
  FOR org IN
    SELECT o.id FROM public.organizations o
     WHERE NOT EXISTS (
       SELECT 1 FROM public.financial_cost_centers c WHERE c.organization_id = o.id
     )
  LOOP
    FOR i IN 1..array_length(names,1) LOOP
      INSERT INTO public.financial_cost_centers
        (organization_id, code, name, allows_allocations, active)
      VALUES (org.id, lpad(i::text,2,'0'), names[i], true, true);
    END LOOP;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_fin_cc_org_active
  ON public.financial_cost_centers(organization_id, active) WHERE active = true;
