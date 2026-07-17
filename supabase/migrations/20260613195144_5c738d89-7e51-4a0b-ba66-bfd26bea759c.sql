
-- Fase 2 (F-06): Revoga EXECUTE de 'anon' em todas as funções financeiras.
-- Mantém authenticated e service_role.
DO $$
DECLARE
  r record;
  sig text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname ~ 'financial'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || sig || ' FROM anon, public';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || sig || ' TO authenticated, service_role';
  END LOOP;
END $$;
