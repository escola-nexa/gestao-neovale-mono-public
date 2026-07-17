ALTER TABLE public.talent_pool_candidates
ADD COLUMN IF NOT EXISTS classification text
CHECK (classification IS NULL OR classification IN ('PRIORIDADE','NAD','SEM_HISTORICO','NAO_CONTRATAR'));

CREATE INDEX IF NOT EXISTS idx_talent_pool_classification
ON public.talent_pool_candidates (organization_id, classification)
WHERE deleted_at IS NULL;