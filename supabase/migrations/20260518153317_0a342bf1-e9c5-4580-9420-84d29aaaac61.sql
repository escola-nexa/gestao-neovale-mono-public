CREATE OR REPLACE FUNCTION public.check_link_grade_completeness(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid; v_school uuid; v_course uuid; v_ano text;
  v_missing_classes jsonb := '[]'::jsonb;
  v_incomplete jsonb := '[]'::jsonb;
  v_total_missing int := 0;
  v_total_incomplete int := 0;
  v_total_subjects_missing int := 0;
  v_ok boolean;
BEGIN
  -- external_links NÃO tem course_id nem ano_letivo. Curso vem de
  -- hr_indication_classes (1 link = 1 curso, ver memória). Ano = ano corrente.
  SELECT el.organization_id, el.school_id
    INTO v_org, v_school
    FROM external_links el
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  SELECT hic.course_id INTO v_course
    FROM hr_indication_classes hic
   WHERE hic.external_link_id = p_link_id
   LIMIT 1;
  v_ano := extract(year from now())::text;

  IF v_course IS NULL THEN
    -- Sem nenhuma turma indicada ainda: tudo está faltando, mas sem curso
    -- de referência não dá pra listar disciplinas. Retorna estado pendente.
    RETURN jsonb_build_object(
      'ok', false,
      'school_id', v_school,
      'course_id', NULL,
      'ano_letivo', v_ano,
      'total_missing_classes', 0,
      'total_incomplete_classes', 0,
      'total_subjects_missing', 0,
      'missing_classes', '[]'::jsonb,
      'incomplete_classes', '[]'::jsonb,
      'reason', 'Nenhuma turma indicada ainda'
    );
  END IF;

  -- 1) Turmas ATIVAS da (escola, curso, ano_letivo) que NÃO estão neste link.
  WITH link_class_names AS (
    SELECT lower(trim(nome)) AS nome
      FROM hr_indication_classes
     WHERE external_link_id = p_link_id
  ),
  active_classes AS (
    SELECT id, nome, course_id
      FROM class_groups
     WHERE school_id = v_school
       AND course_id = v_course
       AND ano_letivo = v_ano
       AND status = 'ativo'
  ),
  missing AS (
    SELECT ac.id AS class_group_id, ac.nome, ac.course_id
      FROM active_classes ac
     WHERE lower(trim(ac.nome)) NOT IN (SELECT nome FROM link_class_names)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'course_id', course_id,
            'class_group_id', class_group_id,
            'class_name', nome
         ) ORDER BY nome), '[]'::jsonb),
         count(*)
    INTO v_missing_classes, v_total_missing
    FROM missing;

  -- 2) Cobertura por TURMA × BOLETIM (Nome Boletim).
  --    FIRST + SECOND que compartilham o mesmo boletim contam como UMA exigência.
  WITH ind_classes AS (
    SELECT hic.id AS indication_class_id, hic.nome AS class_name, hic.course_id
      FROM hr_indication_classes hic
     WHERE hic.external_link_id = p_link_id
  ),
  course_boletins AS (
    SELECT
      lower(btrim(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome))) AS boletim_key,
      MIN(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome))           AS boletim_nome,
      MAX(s.carga_horaria_semanal)                                       AS ch_required,
      array_agg(s.id)                                                    AS subject_ids
      FROM subjects s
     WHERE s.course_id = v_course
       AND s.status = 'ativo'
       AND s.deleted_at IS NULL
     GROUP BY lower(btrim(COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome)))
  ),
  ind_resolved AS (
    SELECT
      hsi.id AS indication_id,
      hsi.indication_class_id,
      COALESCE(
        NULLIF(lower(btrim(hsi.candidato_grade->>'boletim_key')), ''),
        lower(btrim(COALESCE(NULLIF(btrim(sj.nome_boletim),''), sj.nome)))
      ) AS boletim_key
      FROM hr_school_indications hsi
      LEFT JOIN subjects sj
             ON sj.id = NULLIF(hsi.candidato_grade->>'subject_id','')::uuid
     WHERE hsi.external_link_id = p_link_id
       AND hsi.status = 'APROVADA'
       AND hsi.candidato_grade IS NOT NULL
  ),
  ind_counts AS (
    SELECT indication_class_id, boletim_key, count(*) AS ch_indicated
      FROM ind_resolved
     WHERE boletim_key IS NOT NULL
     GROUP BY indication_class_id, boletim_key
  ),
  per_class AS (
    SELECT
      ic.indication_class_id,
      ic.class_name,
      cb.boletim_key,
      cb.boletim_nome,
      cb.ch_required,
      cb.subject_ids,
      COALESCE(ind.ch_indicated, 0) AS ch_indicated
      FROM ind_classes ic
      CROSS JOIN course_boletins cb
      LEFT JOIN ind_counts ind
             ON ind.indication_class_id = ic.indication_class_id
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
    'course_id', v_course,
    'ano_letivo', v_ano,
    'total_missing_classes', v_total_missing,
    'total_incomplete_classes', v_total_incomplete,
    'total_subjects_missing', v_total_subjects_missing,
    'missing_classes', v_missing_classes,
    'incomplete_classes', v_incomplete
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_link_grade_completeness(uuid) TO authenticated;