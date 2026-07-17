CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT true,
  p_subject_bimester_filter jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_check jsonb;
  v_msg text;
  v_org uuid;
  v_user uuid := auth.uid();
  v_conflicts_count int := 0;
  v_conflicts_preview text;
  v_result jsonb;
  v_materialized_at timestamptz := now();
  v_models int;
BEGIN
  v_check := public.check_link_grade_completeness(p_link_id);
  IF NOT (v_check->>'ok')::boolean THEN
    v_msg := format(
      'GRADE_INCOMPLETA: %s turma(s) sem indicação · %s turma(s) com CH parcial · %s disciplina(s) faltante(s). Detalhes: %s',
      v_check->>'total_missing_classes',
      v_check->>'total_incomplete_classes',
      v_check->>'total_subjects_missing',
      v_check::text
    );
    RAISE EXCEPTION '%', v_msg;
  END IF;

  IF p_subject_bimester_filter IS NOT NULL AND jsonb_typeof(p_subject_bimester_filter) = 'array' THEN
    SELECT organization_id INTO v_org FROM external_links WHERE id = p_link_id;
    IF v_org IS NOT NULL THEN
      DELETE FROM hr_link_subject_bimester_filter WHERE external_link_id = p_link_id;
      INSERT INTO hr_link_subject_bimester_filter (organization_id, external_link_id, subject_id, bimester, enabled)
      SELECT v_org,
             p_link_id,
             (elem->>'subject_id')::uuid,
             (elem->>'bimester')::int,
             COALESCE((elem->>'enabled')::boolean, true)
        FROM jsonb_array_elements(p_subject_bimester_filter) elem
       WHERE elem ? 'subject_id' AND elem ? 'bimester';
    END IF;
  END IF;

  WITH link_ctx AS (
    SELECT el.id AS link_id, el.organization_id, el.school_id
      FROM external_links el
     WHERE el.id = p_link_id
  ), link_class_groups AS (
    SELECT cg.id
      FROM link_ctx lc
      JOIN hr_indication_classes hic ON hic.external_link_id = lc.link_id
      JOIN class_groups cg
        ON cg.school_id = lc.school_id
       AND cg.course_id = hic.course_id
       AND cg.nome = hic.nome
       AND cg.ano_letivo = p_ano_letivo
  ), candidates AS (
    SELECT
      hi.id AS indication_id,
      COALESCE(hi.professor_id, p_resolved.id) AS professor_id,
      COALESCE(p.full_name, p_resolved.full_name, hi.candidato_nome) AS professor_name,
      hc.nome AS class_name,
      cg.id AS class_group_id,
      CASE upper(coalesce(hi.candidato_grade->>'weekday',''))
        WHEN 'MON' THEN 'SEGUNDA'::weekday
        WHEN 'TUE' THEN 'TERCA'::weekday
        WHEN 'WED' THEN 'QUARTA'::weekday
        WHEN 'THU' THEN 'QUINTA'::weekday
        WHEN 'FRI' THEN 'SEXTA'::weekday
        ELSE NULL
      END AS weekday,
      (rx.times)[1]::time AS start_time,
      (rx.times)[2]::time AS end_time,
      CASE WHEN COALESCE((hi.candidato_grade->>'is_anp')::boolean,false)
             OR upper(coalesce(hi.candidato_grade->>'class_mode','')) = 'ANP'
           THEN 'ANP' ELSE 'PRESENCIAL' END AS class_mode
    FROM link_ctx lc
    JOIN hr_school_indications hi ON hi.external_link_id = lc.link_id
    LEFT JOIN hr_indication_classes hc ON hc.id = hi.indication_class_id
    LEFT JOIN class_groups cg
      ON cg.school_id = lc.school_id
     AND cg.course_id = hc.course_id
     AND cg.nome = hc.nome
     AND cg.ano_letivo = p_ano_letivo
    LEFT JOIN professors p ON p.id = hi.professor_id
    LEFT JOIN talent_pool_candidates t
      ON t.id = hi.talent_pool_candidate_id
     AND t.organization_id = lc.organization_id
    LEFT JOIN professors p_resolved
      ON p_resolved.organization_id = lc.organization_id
     AND lower(p_resolved.full_name) = lower(coalesce(t.full_name, hi.candidato_nome, ''))
     AND (
       coalesce(p_resolved.phone,'') = coalesce(t.phone, hi.candidato_telefone, '')
       OR EXISTS (
         SELECT 1 FROM profiles pr
          WHERE pr.user_id = p_resolved.user_id
            AND lower(coalesce(pr.email,'')) = lower(coalesce(t.email, hi.candidato_email, ''))
       )
     )
    LEFT JOIN LATERAL regexp_match(
      coalesce(hi.candidato_grade->>'time_slot_label',''),
      '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})'
    ) AS rx(times) ON true
    WHERE hi.status = 'APROVADA'
      AND hi.candidato_grade IS NOT NULL
      AND rx.times IS NOT NULL
  ), external_conflicts AS (
    SELECT DISTINCT
      c.professor_name,
      c.class_name,
      c.weekday,
      c.start_time,
      c.end_time,
      s.nome AS other_school,
      cg.nome AS other_class
    FROM candidates c
    JOIN weekly_teaching_models wtm
      ON wtm.professor_id = c.professor_id
     AND wtm.status = 'ACTIVE'
     AND wtm.weekday = c.weekday
     AND COALESCE(wtm.class_mode, 'PRESENCIAL') = 'PRESENCIAL'
     AND c.class_mode = 'PRESENCIAL'
     AND c.start_time < wtm.end_time
     AND c.end_time > wtm.start_time
    LEFT JOIN schools s ON s.id = wtm.school_id
    LEFT JOIN class_groups cg ON cg.id = wtm.class_group_id
    WHERE c.professor_id IS NOT NULL
      AND c.weekday IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM link_class_groups lcg WHERE lcg.id = wtm.class_group_id)
  ), intra_link_conflicts AS (
    SELECT DISTINCT
      c1.professor_name,
      c1.class_name,
      c1.weekday,
      GREATEST(c1.start_time, c2.start_time) AS start_time,
      LEAST(c1.end_time, c2.end_time) AS end_time,
      NULL::text AS other_school,
      c2.class_name AS other_class
    FROM candidates c1
    JOIN candidates c2
      ON c1.indication_id < c2.indication_id
     AND c1.professor_id = c2.professor_id
     AND c1.weekday = c2.weekday
     AND c1.class_mode = 'PRESENCIAL'
     AND c2.class_mode = 'PRESENCIAL'
     AND c1.start_time < c2.end_time
     AND c1.end_time > c2.start_time
    WHERE c1.professor_id IS NOT NULL
      AND c1.class_group_id IS DISTINCT FROM c2.class_group_id
  ), all_conflicts AS (
    SELECT * FROM external_conflicts
    UNION ALL
    SELECT * FROM intra_link_conflicts
  ), conflict_totals AS (
    SELECT count(*) AS total FROM all_conflicts
  ), conflict_preview AS (
    SELECT string_agg(
      format('%s: %s %s-%s (%s%s)',
        coalesce(professor_name, 'Professor'),
        weekday::text,
        to_char(start_time, 'HH24:MI'),
        to_char(end_time, 'HH24:MI'),
        coalesce(class_name, 'turma atual'),
        CASE WHEN other_class IS NOT NULL THEN ' x ' || other_class ELSE '' END
      ),
      '; '
      ORDER BY professor_name, weekday, start_time
    ) AS preview
    FROM (SELECT * FROM all_conflicts LIMIT 8) limited_conflicts
  )
  SELECT conflict_totals.total, conflict_preview.preview
    INTO v_conflicts_count, v_conflicts_preview
    FROM conflict_totals CROSS JOIN conflict_preview;

  IF v_conflicts_count > 0 THEN
    RAISE EXCEPTION 'GRADE_CONFLITO_HORARIO: % conflito(s) encontrado(s). Nenhuma grade foi apagada. Resolva antes de gerar: %',
      v_conflicts_count,
      COALESCE(v_conflicts_preview, 'verifique as indicações de professor e horário');
  END IF;

  v_result := public.materialize_grade_from_indications_internal(p_link_id, p_ano_letivo, p_generate_occurrences);

  v_models := COALESCE((v_result->>'models_upserted')::int, 0);

  -- Só marca materialized_at se realmente criou modelos (evita falso positivo quando nada foi gerado)
  IF v_models > 0 THEN
    UPDATE external_links
       SET materialized_at = v_materialized_at,
           materialized_by = v_user,
           materialized_ano_letivo = p_ano_letivo,
           updated_at = now()
     WHERE id = p_link_id;

    RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object(
      'materialized_at', v_materialized_at,
      'ano_letivo', p_ano_letivo
    );
  END IF;

  -- Nada criado: devolve resultado sem tocar em materialized_at
  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object(
    'ano_letivo', p_ano_letivo,
    'materialized_at', NULL
  );
END;
$function$;