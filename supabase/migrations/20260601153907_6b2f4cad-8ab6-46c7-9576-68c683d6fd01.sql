
CREATE OR REPLACE FUNCTION public.check_link_grade_completeness(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_school uuid; v_ano text;
  v_missing_classes jsonb := '[]'::jsonb;
  v_incomplete jsonb := '[]'::jsonb;
  v_total_missing int := 0;
  v_total_incomplete int := 0;
  v_total_subjects_missing int := 0;
  v_ok boolean;
  v_courses uuid[];
BEGIN
  SELECT el.organization_id, el.school_id
    INTO v_org, v_school
    FROM external_links el
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  SELECT array_agg(DISTINCT hic.course_id)
    INTO v_courses
    FROM hr_indication_classes hic
   WHERE hic.external_link_id = p_link_id;

  v_ano := extract(year from now())::text;

  IF v_courses IS NULL OR array_length(v_courses, 1) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'school_id', v_school, 'course_id', NULL, 'ano_letivo', v_ano,
      'total_missing_classes', 0, 'total_incomplete_classes', 0, 'total_subjects_missing', 0,
      'missing_classes', '[]'::jsonb, 'incomplete_classes', '[]'::jsonb,
      'reason', 'Nenhuma turma indicada ainda'
    );
  END IF;

  WITH link_keys AS (
    SELECT
      hic.course_id,
      hic.turno AS turno_norm,
      lower(btrim(regexp_replace(hic.nome, '\s+', ' ', 'g'))) AS key_series
      FROM hr_indication_classes hic
     WHERE hic.external_link_id = p_link_id
  ),
  active_classes_raw AS (
    SELECT
      cg.id,
      cg.nome,
      cg.course_id,
      CASE
        WHEN cg.nome ~* '\-\s*matutino\s*$'   THEN 'manha'
        WHEN cg.nome ~* '\-\s*vespertino\s*$' THEN 'tarde'
        WHEN cg.nome ~* '\-\s*noturno\s*$'    THEN 'noite'
        WHEN cg.nome ~* '\-\s*integral\s*$'   THEN 'integral'
        ELSE NULL
      END AS turno_norm,
      lower(btrim(regexp_replace(
        regexp_replace(cg.nome, '\s*-\s*(matutino|vespertino|noturno|integral)\s*$', '', 'gi'),
        '\s*ano\s*', ' ', 'gi'
      ))) AS key_series
      FROM class_groups cg
     WHERE cg.school_id = v_school
       AND cg.course_id = ANY(v_courses)
       AND cg.ano_letivo = v_ano
       AND cg.status = 'ativo'
  ),
  -- Deduplica turmas por (course_id, key_series): prioriza a que tem turno
  -- preenchido. Evita falso "faltando" quando existem duplicatas legadas
  -- sem o sufixo " - MATUTINO/VESPERTINO/NOTURNO".
  active_classes_ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY course_id, key_series
        ORDER BY (turno_norm IS NULL) ASC, nome ASC
      ) AS rn
    FROM active_classes_raw
  ),
  active_classes AS (
    SELECT id, nome, course_id, turno_norm, key_series
      FROM active_classes_ranked
     WHERE rn = 1
  ),
  missing AS (
    SELECT ac.id AS class_group_id, ac.nome, ac.course_id
      FROM active_classes ac
     WHERE NOT EXISTS (
        SELECT 1 FROM link_keys lk
         WHERE lk.course_id = ac.course_id
           AND lk.turno_norm IS NOT DISTINCT FROM ac.turno_norm
           AND lk.key_series = ac.key_series
     )
       -- fallback: se a turma ativa não tem turno, basta haver QUALQUER
       -- indicação para o mesmo course_id+série (ela é uma duplicata legada).
       AND NOT EXISTS (
        SELECT 1 FROM link_keys lk
         WHERE lk.course_id = ac.course_id
           AND lk.key_series = ac.key_series
           AND ac.turno_norm IS NULL
       )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'course_id', course_id,
            'class_group_id', class_group_id,
            'class_name', nome
         ) ORDER BY nome), '[]'::jsonb),
         count(*)
    INTO v_missing_classes, v_total_missing
    FROM missing;

  WITH ind_classes AS (
    SELECT hic.id AS indication_class_id, hic.nome AS class_name, hic.course_id
      FROM hr_indication_classes hic
     WHERE hic.external_link_id = p_link_id
  ),
  course_boletins AS (
    SELECT
      s.course_id,
      lower(btrim(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome))) AS boletim_key,
      MIN(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome))           AS boletim_nome,
      MAX(s.carga_horaria_semanal)                                       AS ch_required,
      array_agg(s.id)                                                    AS subject_ids
      FROM subjects s
     WHERE s.course_id = ANY(v_courses)
       AND s.status = 'ativo'
       AND s.deleted_at IS NULL
     GROUP BY s.course_id, lower(btrim(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome)))
  ),
  ind_resolved AS (
    SELECT
      hsi.indication_class_id,
      COALESCE(
        NULLIF(lower(btrim(hsi.candidato_grade->>'boletim_key')), ''),
        lower(btrim(COALESCE(NULLIF(btrim(sj.nome_boletim),''), sj.nome)))
      ) AS boletim_key
      FROM hr_school_indications hsi
      LEFT JOIN subjects sj
             ON sj.id = NULLIF(hsi.candidato_grade->>'subject_id','')::uuid
     WHERE hsi.external_link_id = p_link_id
       AND hsi.status IN ('APROVADA','PENDENTE')
       AND hsi.candidato_grade IS NOT NULL
  ),
  ind_counts AS (
    SELECT indication_class_id, boletim_key, count(*) AS ch_indicated
      FROM ind_resolved
     WHERE boletim_key IS NOT NULL
     GROUP BY indication_class_id, boletim_key
  ),
  required_per_class AS (
    SELECT DISTINCT ic.indication_class_id, ic.class_name, ic.course_id, ind.boletim_key
      FROM ind_classes ic
      JOIN ind_counts ind ON ind.indication_class_id = ic.indication_class_id
  ),
  per_class AS (
    SELECT
      rpc.indication_class_id,
      rpc.class_name,
      cb.boletim_key,
      cb.boletim_nome,
      cb.ch_required,
      cb.subject_ids,
      COALESCE(ind.ch_indicated, 0) AS ch_indicated
      FROM required_per_class rpc
      JOIN course_boletins cb
        ON cb.course_id = rpc.course_id
       AND cb.boletim_key = rpc.boletim_key
      LEFT JOIN ind_counts ind
             ON ind.indication_class_id = rpc.indication_class_id
            AND ind.boletim_key = cb.boletim_key
  ),
  pending AS (
    SELECT
      indication_class_id,
      class_name,
      jsonb_agg(jsonb_build_object(
        'subject_id', subject_ids[1],
        'subject_ids', to_jsonb(subject_ids),
        'subject_name', boletim_nome,
        'boletim_key', boletim_key,
        'ch_required', ch_required,
        'ch_indicated', ch_indicated,
        'ch_missing', GREATEST(ch_required - ch_indicated, 0)
      ) ORDER BY boletim_nome) AS missing_subjects,
      sum(GREATEST(ch_required - ch_indicated, 0)) AS total_missing_ch,
      count(*) FILTER (WHERE ch_indicated < ch_required) AS subjects_missing
      FROM per_class
     GROUP BY indication_class_id, class_name
    HAVING count(*) FILTER (WHERE ch_indicated < ch_required) > 0
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'indication_class_id', indication_class_id,
      'class_name', class_name,
      'subjects_missing', subjects_missing,
      'total_missing_ch', total_missing_ch,
      'missing_subjects', (
        SELECT jsonb_agg(s) FROM jsonb_array_elements(missing_subjects) s
         WHERE (s->>'ch_missing')::int > 0
      )
    ) ORDER BY class_name), '[]'::jsonb),
    count(*),
    COALESCE(sum(subjects_missing), 0)
    INTO v_incomplete, v_total_incomplete, v_total_subjects_missing
    FROM pending;

  v_ok := (v_total_missing = 0 AND v_total_incomplete = 0);

  RETURN jsonb_build_object(
    'ok', v_ok,
    'school_id', v_school,
    'course_id', v_courses[1],
    'courses', to_jsonb(v_courses),
    'ano_letivo', v_ano,
    'total_missing_classes', v_total_missing,
    'total_incomplete_classes', v_total_incomplete,
    'total_subjects_missing', v_total_subjects_missing,
    'missing_classes', v_missing_classes,
    'incomplete_classes', v_incomplete
  );
END;
$function$;
