
CREATE OR REPLACE FUNCTION public.check_link_grade_completeness(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid; v_school uuid; v_ano text;
  v_missing_classes jsonb := '[]'::jsonb;
  v_incomplete jsonb := '[]'::jsonb;
  v_total_missing int := 0;
  v_total_incomplete int := 0;
  v_total_subjects_missing int := 0;
  v_ok boolean;
  v_course_ids uuid[];
BEGIN
  SELECT el.organization_id, el.school_id,
         COALESCE(el.materialized_ano_letivo, extract(year from now())::text)
    INTO v_org, v_school, v_ano
    FROM external_links el
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  SELECT array_agg(DISTINCT course_id) INTO v_course_ids
    FROM hr_indication_classes WHERE external_link_id = p_link_id;
  IF v_course_ids IS NULL OR array_length(v_course_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'school_id', v_school, 'ano_letivo', v_ano,
      'total_missing_classes', 0, 'total_incomplete_classes', 0, 'total_subjects_missing', 0,
      'missing_classes', '[]'::jsonb, 'incomplete_classes', '[]'::jsonb,
      'no_indications', true
    );
  END IF;

  WITH link_class_keys AS (
    SELECT course_id, lower(trim(nome)) AS nome
      FROM hr_indication_classes
     WHERE external_link_id = p_link_id
  ),
  active_classes AS (
    SELECT id, nome, course_id
      FROM class_groups
     WHERE school_id = v_school
       AND course_id = ANY(v_course_ids)
       AND ano_letivo = v_ano
       AND status = 'ativo'
  ),
  missing AS (
    SELECT ac.id AS class_group_id, ac.nome, ac.course_id
      FROM active_classes ac
     WHERE NOT EXISTS (
       SELECT 1 FROM link_class_keys lk
        WHERE lk.course_id = ac.course_id AND lk.nome = lower(trim(ac.nome))
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
  course_subj AS (
    SELECT s.id AS subject_id, s.nome AS subject_nome, s.carga_horaria_semanal AS ch_required, s.course_id
      FROM subjects s
     WHERE s.course_id = ANY(v_course_ids)
       AND s.status = 'ativo'
  ),
  ind_counts AS (
    SELECT
      hsi.indication_class_id,
      (hsi.candidato_grade->>'subject_id')::uuid AS subject_id,
      count(*) AS ch_indicated
      FROM hr_school_indications hsi
     WHERE hsi.external_link_id = p_link_id
       AND hsi.status = 'APROVADA'
       AND hsi.candidato_grade ? 'subject_id'
     GROUP BY hsi.indication_class_id, (hsi.candidato_grade->>'subject_id')::uuid
  ),
  per_class AS (
    SELECT
      ic.indication_class_id,
      ic.class_name,
      cs.subject_id,
      cs.subject_nome,
      cs.ch_required,
      COALESCE(ind.ch_indicated, 0) AS ch_indicated
      FROM ind_classes ic
      JOIN course_subj cs ON cs.course_id = ic.course_id
      LEFT JOIN ind_counts ind
             ON ind.indication_class_id = ic.indication_class_id
            AND ind.subject_id = cs.subject_id
  ),
  pending AS (
    SELECT
      indication_class_id,
      class_name,
      jsonb_agg(jsonb_build_object(
        'subject_id', subject_id,
        'subject_name', subject_nome,
        'ch_required', ch_required,
        'ch_indicated', ch_indicated,
        'ch_missing', GREATEST(ch_required - ch_indicated, 0)
      ) ORDER BY subject_nome) FILTER (WHERE ch_indicated < ch_required) AS missing_subjects,
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
      'missing_subjects', missing_subjects
    ) ORDER BY class_name), '[]'::jsonb),
    count(*),
    COALESCE(sum(subjects_missing), 0)
    INTO v_incomplete, v_total_incomplete, v_total_subjects_missing
    FROM pending;

  v_ok := (v_total_missing = 0 AND v_total_incomplete = 0);

  RETURN jsonb_build_object(
    'ok', v_ok,
    'school_id', v_school,
    'course_ids', to_jsonb(v_course_ids),
    'ano_letivo', v_ano,
    'total_missing_classes', v_total_missing,
    'total_incomplete_classes', v_total_incomplete,
    'total_subjects_missing', v_total_subjects_missing,
    'missing_classes', v_missing_classes,
    'incomplete_classes', v_incomplete
  );
END;
$$;
