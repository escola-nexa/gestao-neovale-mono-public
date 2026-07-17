-- Nova coluna array
ALTER TABLE public.talent_pool_candidates
  ADD COLUMN IF NOT EXISTS classifications text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Migra valor antigo (single) para array
UPDATE public.talent_pool_candidates
SET classifications = ARRAY[classification]
WHERE classification IS NOT NULL
  AND (classifications IS NULL OR array_length(classifications, 1) IS NULL);

-- Garante valores válidos via trigger (mais flexível que CHECK em array)
CREATE OR REPLACE FUNCTION public.validate_talent_classifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF NEW.classifications IS NULL THEN
    NEW.classifications := ARRAY[]::text[];
  END IF;
  FOREACH v IN ARRAY NEW.classifications LOOP
    IF v NOT IN ('PRIORIDADE','NAD','SEM_HISTORICO','NAO_CONTRATAR') THEN
      RAISE EXCEPTION 'Etiqueta inválida: %', v;
    END IF;
  END LOOP;
  -- Remove duplicatas preservando ordem
  NEW.classifications := ARRAY(SELECT DISTINCT unnest(NEW.classifications));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_talent_classifications ON public.talent_pool_candidates;
CREATE TRIGGER trg_validate_talent_classifications
BEFORE INSERT OR UPDATE OF classifications ON public.talent_pool_candidates
FOR EACH ROW EXECUTE FUNCTION public.validate_talent_classifications();

-- Index GIN para filtrar
CREATE INDEX IF NOT EXISTS idx_talent_pool_classifications_gin
ON public.talent_pool_candidates USING gin (classifications)
WHERE deleted_at IS NULL;