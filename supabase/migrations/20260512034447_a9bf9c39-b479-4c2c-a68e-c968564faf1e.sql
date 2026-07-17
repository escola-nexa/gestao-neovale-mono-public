DO $$
DECLARE
  v_materialize text;
  v_unmaterialize text;
BEGIN
  SELECT pg_get_functiondef('public.materialize_grade_from_indications(uuid,text,boolean)'::regprocedure)
    INTO v_materialize;

  v_materialize := replace(
    v_materialize,
    'INSERT INTO audit_events (organization_id, actor_id, module, action, details)',
    'INSERT INTO audit_events (organization_id, user_id, module, action, details)'
  );

  IF position('actor_id' in v_materialize) > 0 THEN
    RAISE EXCEPTION 'Ainda existe actor_id em materialize_grade_from_indications';
  END IF;

  EXECUTE v_materialize;

  SELECT pg_get_functiondef('public.unmaterialize_grade_from_indications(uuid,text)'::regprocedure)
    INTO v_unmaterialize;

  v_unmaterialize := replace(
    v_unmaterialize,
    'INSERT INTO audit_events (organization_id, actor_id, module, action, details)',
    'INSERT INTO audit_events (organization_id, user_id, module, action, details)'
  );

  IF position('actor_id' in v_unmaterialize) > 0 THEN
    RAISE EXCEPTION 'Ainda existe actor_id em unmaterialize_grade_from_indications';
  END IF;

  EXECUTE v_unmaterialize;
END $$;

REVOKE EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.unmaterialize_grade_from_indications(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unmaterialize_grade_from_indications(uuid, text) TO authenticated;