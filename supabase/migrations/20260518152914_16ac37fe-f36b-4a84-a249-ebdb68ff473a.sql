-- Reescrita: cobertura de grade chaveada por Nome Boletim (boletim_key)
-- Motivo: subjects FIRST + SECOND que compartilham o mesmo nome_boletim ocupam
-- o MESMO horário físico (alternando semestres). O diretor indica "UC 1" uma
-- única vez (4h) e o materialize gera 2 weekly_teaching_models (FIRST+SECOND).
-- Logo, a CH exigida por boletim = MAX(carga_horaria_semanal), não SUM.
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
  SELECT el.organization_id, el.school_id, el.course_id,
         COALESCE(el.ano_letivo::text, extract(year from now())::text)
    INTO v_org, v_school, v_course, v_ano
    FROM external_links el
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
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
  --    FIRST + SECOND que compartilham o mesmo boletim contam como UMA exigência
  --    (mesmo horário físico). ch_required = MAX(carga_horaria_semanal) do grupo.
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
  -- Resolve o boletim_key de cada indicação aprovada:
  -- preferir candidato_grade->>'boletim_key'; senão, derivar do subject_id via subjects.
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
        'subject_id', subject_ids[1],         -- representativo (compat com UI)
        'subject_ids', to_jsonb(subject_ids), -- diagnóstico
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