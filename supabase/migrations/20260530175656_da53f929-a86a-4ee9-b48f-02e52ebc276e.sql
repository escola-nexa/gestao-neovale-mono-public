DO $$
DECLARE
  sig text;
BEGIN
  FOR sig IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'materialize_grade_from_indications',
        'materialize_grade_from_indications_internal'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET statement_timeout = ''300s''', sig);
    EXECUTE format('ALTER FUNCTION %s SET idle_in_transaction_session_timeout = ''300s''', sig);
  END LOOP;
END $$;