DO $fix$
DECLARE
  src text;
BEGIN
  src := pg_get_functiondef('public.materialize_grade_from_indications_internal'::regproc);
  src := replace(src, 'RETURNING v_pl_model_id;', 'RETURNING id INTO v_pl_model_id;');
  EXECUTE src;
END $fix$;