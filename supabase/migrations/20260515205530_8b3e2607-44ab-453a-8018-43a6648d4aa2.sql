
ALTER TABLE public.library_contents
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS published_by uuid NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.library_contents
SET published_at = COALESCE(published_at, created_at)
WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lib_contents_org_published
  ON public.library_contents(organization_id, published_at);
CREATE INDEX IF NOT EXISTS idx_lib_contents_sort
  ON public.library_contents(subject_id, sort_order);

DROP POLICY IF EXISTS lib_cnt_select_org ON public.library_contents;

CREATE POLICY lib_cnt_select_org_published
ON public.library_contents FOR SELECT
USING (
  organization_id IN (SELECT user_roles.organization_id FROM user_roles WHERE user_roles.user_id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
    OR published_at IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION public.library_reorder_contents(_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
BEGIN
  IF NOT (has_role(_uid, 'admin'::app_role) OR has_role(_uid, 'coordenador'::app_role) OR has_role(_uid, 'rh'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para reordenar conteúdos';
  END IF;

  SELECT organization_id INTO _org FROM user_roles WHERE user_id = _uid LIMIT 1;

  UPDATE public.library_contents lc
  SET sort_order = ord.idx
  FROM (SELECT unnest(_ids) AS id, generate_series(1, array_length(_ids,1)) AS idx) ord
  WHERE lc.id = ord.id
    AND lc.organization_id = _org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.library_reorder_contents(uuid[]) TO authenticated;
