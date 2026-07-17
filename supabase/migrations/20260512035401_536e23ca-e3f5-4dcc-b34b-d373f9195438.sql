-- Recriar materialize_grade_from_indications com cast correto para occurrence_status
-- (enum existente: occurrence_status com labels SCHEDULED/COMPLETED/CANCELLED)
-- Substitui class_occurrence_status -> occurrence_status na linha de INSERT em annual_class_occurrences

DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.materialize_grade_from_indications(uuid,text,boolean)'::regprocedure)
    INTO v_def;
  v_def := replace(v_def, 'class_occurrence_status', 'occurrence_status');
  EXECUTE v_def;
END;
$migration$;