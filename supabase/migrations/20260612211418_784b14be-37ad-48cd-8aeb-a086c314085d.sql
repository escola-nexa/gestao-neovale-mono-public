
-- 1) Novas colunas
ALTER TABLE public.financial_categories
  ADD COLUMN IF NOT EXISTS entry_type text,
  ADD COLUMN IF NOT EXISTS category_nature text NOT NULL DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS level smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS accepts_entries boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- 2) Backfill entry_type a partir de nature legado
UPDATE public.financial_categories
   SET entry_type = CASE nature
                      WHEN 'RECEITA' THEN 'income'
                      WHEN 'DESPESA' THEN 'expense'
                      ELSE 'expense'
                    END
 WHERE entry_type IS NULL;

ALTER TABLE public.financial_categories
  ALTER COLUMN entry_type SET NOT NULL;

-- 3) CHECKs dos novos enums
ALTER TABLE public.financial_categories
  DROP CONSTRAINT IF EXISTS financial_categories_entry_type_check;
ALTER TABLE public.financial_categories
  ADD CONSTRAINT financial_categories_entry_type_check
  CHECK (entry_type IN ('income','expense','transfer','adjustment'));

ALTER TABLE public.financial_categories
  DROP CONSTRAINT IF EXISTS financial_categories_category_nature_check;
ALTER TABLE public.financial_categories
  ADD CONSTRAINT financial_categories_category_nature_check
  CHECK (category_nature IN ('operational','administrative','personnel','tax','financial','investment','other'));

-- 4) Trigger BEFORE INSERT/UPDATE: nível, anti-ciclos, herança entry_type, sync nature legado
CREATE OR REPLACE FUNCTION public.financial_categories_normalize()
RETURNS TRIGGER AS $$
DECLARE
  v_parent RECORD;
  v_cur uuid;
  v_steps int := 0;
BEGIN
  -- sync nature legado a partir de entry_type
  IF NEW.entry_type = 'income' THEN
    NEW.nature := 'RECEITA';
  ELSIF NEW.entry_type = 'expense' THEN
    NEW.nature := 'DESPESA';
  ELSE
    -- transfer/adjustment: usa DESPESA p/ atender o CHECK antigo
    NEW.nature := COALESCE(NEW.nature, 'DESPESA');
    IF NEW.nature NOT IN ('RECEITA','DESPESA') THEN
      NEW.nature := 'DESPESA';
    END IF;
  END IF;

  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
  ELSE
    SELECT id, entry_type, level, organization_id
      INTO v_parent
      FROM public.financial_categories
     WHERE id = NEW.parent_id;

    IF v_parent.id IS NULL THEN
      RAISE EXCEPTION 'Categoria pai não encontrada';
    END IF;
    IF v_parent.organization_id <> NEW.organization_id THEN
      RAISE EXCEPTION 'Categoria pai pertence a outra organização';
    END IF;
    IF v_parent.entry_type <> NEW.entry_type THEN
      RAISE EXCEPTION 'Categoria filha deve ter o mesmo tipo de lançamento da categoria pai (%).', v_parent.entry_type;
    END IF;

    NEW.level := COALESCE(v_parent.level, 1) + 1;

    -- anti-ciclos
    IF TG_OP = 'UPDATE' AND NEW.id IS NOT NULL THEN
      v_cur := NEW.parent_id;
      WHILE v_cur IS NOT NULL AND v_steps < 50 LOOP
        IF v_cur = NEW.id THEN
          RAISE EXCEPTION 'Hierarquia de categorias com ciclo';
        END IF;
        SELECT parent_id INTO v_cur
          FROM public.financial_categories
         WHERE id = v_cur;
        v_steps := v_steps + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fin_categories_normalize ON public.financial_categories;
CREATE TRIGGER trg_fin_categories_normalize
  BEFORE INSERT OR UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.financial_categories_normalize();

-- 5) Trigger pai: bloqueia lançamentos em categoria não-analítica
CREATE OR REPLACE FUNCTION public.financial_entries_require_analytic_category()
RETURNS TRIGGER AS $$
DECLARE
  v_accepts boolean;
  v_active  boolean;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT accepts_entries, active
    INTO v_accepts, v_active
    FROM public.financial_categories
   WHERE id = NEW.category_id;
  IF v_accepts IS NULL THEN
    RAISE EXCEPTION 'Categoria financeira inválida';
  END IF;
  IF v_accepts = false THEN
    RAISE EXCEPTION 'Categoria não aceita lançamentos. Selecione uma categoria analítica.';
  END IF;
  IF v_active = false THEN
    RAISE EXCEPTION 'Categoria financeira inativa.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fin_entries_require_analytic ON public.financial_entries;
CREATE TRIGGER trg_fin_entries_require_analytic
  BEFORE INSERT OR UPDATE OF category_id ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_entries_require_analytic_category();

-- 6) Recalcula nível para registros existentes (até 5 níveis)
UPDATE public.financial_categories c SET level = 1 WHERE parent_id IS NULL;
UPDATE public.financial_categories c
   SET level = p.level + 1
  FROM public.financial_categories p
 WHERE c.parent_id = p.id;

-- 7) Seed: para cada organização sem categorias, cria plano padrão
DO $$
DECLARE
  org RECORD;
  receitas_id uuid;
  despesas_id uuid;
  rec_names text[] := ARRAY[
    'Receitas de contratos','Receitas de serviços','Receitas financeiras',
    'Reembolsos','Outras receitas'];
  desp_names text[] := ARRAY[
    'Pessoal e encargos','Pagamento de professores','Substituições docentes',
    'Deslocamento e viagens','Combustível','Pedágios','Hospedagem','Alimentação',
    'Materiais pedagógicos','Material de escritório','Tecnologia e sistemas',
    'Serviços de terceiros','Aluguéis','Água, energia e comunicação',
    'Taxas bancárias','Tributos','Manutenção','Outras despesas'];
  desp_natures text[] := ARRAY[
    'personnel','personnel','personnel',
    'operational','operational','operational','operational','operational',
    'operational','administrative','administrative',
    'operational','administrative','administrative',
    'financial','tax','operational','other'];
  i int;
BEGIN
  FOR org IN
    SELECT o.id FROM public.organizations o
     WHERE NOT EXISTS (
       SELECT 1 FROM public.financial_categories c WHERE c.organization_id = o.id
     )
  LOOP
    INSERT INTO public.financial_categories
      (organization_id, parent_id, code, name, entry_type, category_nature,
       nature, accepts_entries, is_system, active)
    VALUES (org.id, NULL, '1', 'Receitas', 'income', 'operational',
            'RECEITA', false, true, true)
    RETURNING id INTO receitas_id;

    INSERT INTO public.financial_categories
      (organization_id, parent_id, code, name, entry_type, category_nature,
       nature, accepts_entries, is_system, active)
    VALUES (org.id, NULL, '2', 'Despesas', 'expense', 'operational',
            'DESPESA', false, true, true)
    RETURNING id INTO despesas_id;

    FOR i IN 1..array_length(rec_names,1) LOOP
      INSERT INTO public.financial_categories
        (organization_id, parent_id, code, name, entry_type, category_nature,
         nature, accepts_entries, is_system, active)
      VALUES (org.id, receitas_id, '1.'||i, rec_names[i], 'income', 'operational',
              'RECEITA', true, true, true);
    END LOOP;

    FOR i IN 1..array_length(desp_names,1) LOOP
      INSERT INTO public.financial_categories
        (organization_id, parent_id, code, name, entry_type, category_nature,
         nature, accepts_entries, is_system, active)
      VALUES (org.id, despesas_id, '2.'||i, desp_names[i], 'expense', desp_natures[i],
              'DESPESA', true, true, true);
    END LOOP;
  END LOOP;
END $$;

-- 8) Índices úteis
CREATE INDEX IF NOT EXISTS idx_fin_categories_org_entry_type
  ON public.financial_categories(organization_id, entry_type) WHERE active = true;
