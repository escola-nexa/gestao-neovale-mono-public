DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.materialize_grade_from_indications(uuid,text,boolean)'::regprocedure)
    INTO v_def;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'Função materialize_grade_from_indications(uuid,text,boolean) não encontrada';
  END IF;

  v_def := replace(
    v_def,
    'lower(coalesce(p.email,'''')) = lower(coalesce(r.candidato_email,''''))',
    'lower(coalesce((SELECT pr.email FROM public.profiles pr WHERE pr.user_id = p.user_id LIMIT 1),'''')) = lower(coalesce(r.candidato_email,''''))'
  );

  IF position('p.email' in v_def) > 0 THEN
    RAISE EXCEPTION 'Ainda existe referência inválida a p.email na função materialize_grade_from_indications';
  END IF;

  EXECUTE v_def;
END $$;

GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;