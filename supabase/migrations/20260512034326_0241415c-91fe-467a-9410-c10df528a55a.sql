DO $$
DECLARE
  v_preview text;
  v_materialize text;
BEGIN
  SELECT pg_get_functiondef('public.preview_grade_from_indications(uuid)'::regprocedure)
    INTO v_preview;

  v_preview := regexp_replace(
    v_preview,
    $re$\(SELECT p\.id FROM professors p\s+WHERE p\.organization_id = v_org\s+AND p\.talent_pool_candidate_id = hi\.talent_pool_candidate_id\s+LIMIT 1\),$re$,
    $new$(SELECT p.id FROM professors p
                JOIN talent_pool_candidates t
                  ON t.id = hi.talent_pool_candidate_id
                 AND t.organization_id = v_org
                LEFT JOIN profiles pr ON pr.user_id = p.user_id
               WHERE p.organization_id = v_org
                 AND lower(p.full_name) = lower(coalesce(t.full_name,''))
                 AND (
                   lower(coalesce(pr.email,'')) = lower(coalesce(t.email,''))
                   OR coalesce(p.phone,'') = coalesce(t.phone,'')
                 )
               LIMIT 1),$new$,
    'g'
  );

  v_preview := regexp_replace(
    v_preview,
    $re$lower\(coalesce\(p\.email,''\)\) = lower\(coalesce\(hi\.candidato_email,''\)\)$re$,
    $new$lower(coalesce((SELECT pr.email FROM public.profiles pr WHERE pr.user_id = p.user_id LIMIT 1),'')) = lower(coalesce(hi.candidato_email,''))$new$,
    'g'
  );

  IF position('p.email' in v_preview) > 0 OR position('p.talent_pool_candidate_id' in v_preview) > 0 THEN
    RAISE EXCEPTION 'Ainda existe referência inválida na função preview_grade_from_indications: %', substring(v_preview from greatest(nullif(position('p.email' in v_preview),0), nullif(position('p.talent_pool_candidate_id' in v_preview),0), 1) for 300);
  END IF;

  EXECUTE v_preview;

  SELECT pg_get_functiondef('public.materialize_grade_from_indications(uuid,text,boolean)'::regprocedure)
    INTO v_materialize;

  v_materialize := regexp_replace(
    v_materialize,
    $re$SELECT id INTO v_professor_id FROM professors\s+WHERE talent_pool_candidate_id = r\.talent_pool_candidate_id AND organization_id = v_org LIMIT 1;$re$,
    $new$SELECT p.id INTO v_professor_id
        FROM professors p
        JOIN talent_pool_candidates t
          ON t.id = r.talent_pool_candidate_id
         AND t.organization_id = v_org
        LEFT JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.organization_id = v_org
         AND lower(p.full_name) = lower(coalesce(t.full_name,''))
         AND (
           lower(coalesce(pr.email,'')) = lower(coalesce(t.email,''))
           OR coalesce(p.phone,'') = coalesce(t.phone,'')
         )
       LIMIT 1;$new$,
    'g'
  );

  v_materialize := regexp_replace(
    v_materialize,
    $re$lower\(coalesce\(p\.email,''\)\) = lower\(coalesce\(r\.candidato_email,''\)\)$re$,
    $new$lower(coalesce((SELECT pr.email FROM public.profiles pr WHERE pr.user_id = p.user_id LIMIT 1),'')) = lower(coalesce(r.candidato_email,''))$new$,
    'g'
  );

  IF position('p.email' in v_materialize) > 0 OR position('p.talent_pool_candidate_id' in v_materialize) > 0 THEN
    RAISE EXCEPTION 'Ainda existe referência inválida na função materialize_grade_from_indications';
  END IF;

  EXECUTE v_materialize;
END $$;

REVOKE EXECUTE ON FUNCTION public.preview_grade_from_indications(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_grade_from_indications(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;