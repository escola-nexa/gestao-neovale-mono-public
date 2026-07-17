CREATE OR REPLACE FUNCTION public.bulk_soft_delete_pre_plannings(p_ids uuid[])
RETURNS TABLE(deleted_count int, skipped_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_user uuid := auth.uid();
  v_deleted int := 0;
  v_skipped int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  v_is_admin := is_admin(v_user);

  WITH targets AS (
    SELECT id, status, organization_id, deleted_at
    FROM public.pre_plannings
    WHERE id = ANY(p_ids)
  ),
  allowed AS (
    SELECT t.id
    FROM targets t
    WHERE t.deleted_at IS NULL
      AND (v_is_admin OR is_coordinator(v_user, t.organization_id))
      AND (v_is_admin OR t.status = 'GERADO')
  ),
  upd AS (
    UPDATE public.pre_plannings p
    SET deleted_at = now()
    WHERE p.id IN (SELECT id FROM allowed)
    RETURNING 1
  )
  SELECT
    (SELECT count(*)::int FROM upd),
    (array_length(p_ids, 1) - (SELECT count(*)::int FROM upd))
  INTO v_deleted, v_skipped;

  RETURN QUERY SELECT v_deleted, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_soft_delete_pre_plannings(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_soft_delete_pre_plannings(uuid[]) FROM anon, public;