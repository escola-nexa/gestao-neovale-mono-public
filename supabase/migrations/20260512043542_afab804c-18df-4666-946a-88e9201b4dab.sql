-- 1) Fix get_course_subject_boletim_options: MAX(uuid) is not supported.
CREATE OR REPLACE FUNCTION public.get_course_subject_boletim_options(p_link_id uuid)
RETURNS TABLE(course_id uuid, course_nome text, boletim_key text, boletim_nome text, carga_horaria_semanal integer, first_subject_id uuid, second_subject_id uuid, annual_subject_id uuid, has_first boolean, has_second boolean, has_annual boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT organization_id INTO v_org FROM external_links WHERE id = p_link_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Link não encontrado'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role)
          OR public.has_role(v_user,'coordenador'::app_role)
          OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  WITH course_ids AS (
    SELECT DISTINCT hc.course_id FROM hr_indication_classes hc WHERE hc.external_link_id = p_link_id
    UNION
    SELECT DISTINCT hi.course_id FROM hr_school_indications hi
      WHERE hi.external_link_id = p_link_id AND hi.course_id IS NOT NULL
  ), subs AS (
    SELECT
      c.id AS c_course_id,
      c.nome AS c_course_nome,
      COALESCE(NULLIF(btrim(s.nome_boletim),''), s.nome) AS boletim,
      s.id AS s_id,
      s.semester::text AS s_sem,
      s.carga_horaria_semanal AS s_ch
    FROM subjects s
    JOIN courses c ON c.id = s.course_id
    WHERE s.course_id IN (SELECT cid.course_id FROM course_ids cid)
      AND s.organization_id = v_org
      AND s.deleted_at IS NULL
      AND s.status = 'ativo'
  )
  SELECT
    c_course_id,
    MIN(c_course_nome),
    lower(btrim(boletim)) AS boletim_key,
    MIN(boletim) AS boletim_nome,
    MAX(s_ch) AS carga_horaria_semanal,
    (array_agg(s_id) FILTER (WHERE s_sem = 'FIRST'))[1]  AS first_subject_id,
    (array_agg(s_id) FILTER (WHERE s_sem = 'SECOND'))[1] AS second_subject_id,
    (array_agg(s_id) FILTER (WHERE s_sem = 'ANNUAL'))[1] AS annual_subject_id,
    bool_or(s_sem = 'FIRST'),
    bool_or(s_sem = 'SECOND'),
    bool_or(s_sem = 'ANNUAL')
  FROM subs
  GROUP BY c_course_id, lower(btrim(boletim))
  ORDER BY MIN(c_course_nome), MIN(boletim);
END;
$function$;

-- 2) Fix preview_grade_from_indications: professors has no talent_pool_candidate_id / email columns.
CREATE OR REPLACE FUNCTION public.preview_grade_from_indications(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_school uuid; v_user uuid := auth.uid();
  v_turmas_a_criar int := 0; v_turmas_existentes int := 0;
  v_slots_a_criar int := 0; v_slots_existentes int := 0;
  v_aulas_a_criar int := 0; v_aulas_ignoradas int := 0;
  v_ano_letivo_atual text := to_char(now(), 'YYYY');
  v_conflicts jsonb := '[]'::jsonb;
  v_slot_warnings jsonb := '[]'::jsonb;
  v_subject_warnings jsonb := '[]'::jsonb;
  r record; v_weekday weekday; v_start time; v_end time;
  v_label text; v_times text[]; v_subj_ok boolean;
  v_first uuid; v_second uuid; v_annual uuid; v_subject_id uuid;
  v_subject_set uuid[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT organization_id, school_id INTO v_org, v_school FROM external_links WHERE id = p_link_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Link não encontrado'; END IF;
  IF NOT (public.has_role(v_user,'admin'::app_role)
          OR public.has_role(v_user,'coordenador'::app_role)
          OR public.has_role(v_user,'rh'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  FOR r IN SELECT hc.course_id, hc.nome FROM hr_indication_classes hc WHERE hc.external_link_id = p_link_id LOOP
    PERFORM 1 FROM class_groups cg
     WHERE cg.school_id = v_school AND cg.course_id = r.course_id
       AND cg.nome = r.nome AND cg.ano_letivo = v_ano_letivo_atual LIMIT 1;
    IF FOUND THEN v_turmas_existentes := v_turmas_existentes + 1;
    ELSE v_turmas_a_criar := v_turmas_a_criar + 1; END IF;
  END LOOP;

  FOR r IN
    SELECT hi.id, hi.candidato_grade, hi.candidato_nome, hi.course_id, hi.professor_id,
           hi.candidato_telefone
      FROM hr_school_indications hi
     WHERE hi.external_link_id = p_link_id AND hi.status = 'APROVADA' AND hi.candidato_grade IS NOT NULL
  LOOP
    v_weekday := CASE upper(coalesce(r.candidato_grade->>'weekday',''))
      WHEN 'MON' THEN 'SEGUNDA'::weekday WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday ELSE NULL END;
    v_label := coalesce(r.candidato_grade->>'time_slot_label','');
    v_times := regexp_match(v_label, '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})');
    IF v_weekday IS NULL OR v_times IS NULL THEN
      v_slot_warnings := v_slot_warnings || jsonb_build_object(
        'indication_id', r.id, 'candidato', r.candidato_nome, 'label', v_label,
        'reason', CASE WHEN v_weekday IS NULL THEN 'weekday inválido' ELSE 'horário não reconhecido' END);
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      CONTINUE;
    END IF;
    v_start := v_times[1]::time; v_end := v_times[2]::time;

    PERFORM 1 FROM school_time_slots
     WHERE school_id = v_school AND weekday = v_weekday
       AND start_time = v_start AND end_time = v_end AND status = 'ACTIVE' LIMIT 1;
    IF FOUND THEN v_slots_existentes := v_slots_existentes + 1;
    ELSE v_slots_a_criar := v_slots_a_criar + 1; END IF;

    v_first  := NULLIF(r.candidato_grade->>'first_subject_id','')::uuid;
    v_second := NULLIF(r.candidato_grade->>'second_subject_id','')::uuid;
    v_annual := NULLIF(r.candidato_grade->>'annual_subject_id','')::uuid;
    v_subject_id := NULLIF(r.candidato_grade->>'subject_id','')::uuid;
    v_subject_set := ARRAY[]::uuid[];
    IF v_annual IS NOT NULL THEN v_subject_set := v_subject_set || v_annual; END IF;
    IF v_first  IS NOT NULL THEN v_subject_set := v_subject_set || v_first; END IF;
    IF v_second IS NOT NULL THEN v_subject_set := v_subject_set || v_second; END IF;
    IF array_length(v_subject_set,1) IS NULL AND v_subject_id IS NOT NULL THEN
      v_subject_set := ARRAY[v_subject_id];
    END IF;

    IF array_length(v_subject_set,1) IS NOT NULL THEN
      SELECT bool_and(EXISTS (SELECT 1 FROM subjects s WHERE s.id = sid AND s.course_id = r.course_id))
        INTO v_subj_ok FROM unnest(v_subject_set) AS sid;
      IF NOT v_subj_ok THEN
        v_subject_warnings := v_subject_warnings || jsonb_build_object(
          'indication_id', r.id, 'candidato', r.candidato_nome,
          'reason', 'subject não pertence ao curso da indicação');
      END IF;
    END IF;

    v_aulas_a_criar := v_aulas_a_criar + GREATEST(1, COALESCE(array_length(v_subject_set,1),1));
  END LOOP;

  WITH resolved AS (
    SELECT hi.id AS indication_id,
           hi.candidato_nome,
           COALESCE(
             hi.professor_id,
             (SELECT p.id FROM professors p
                WHERE p.organization_id = v_org
                  AND p.deleted_at IS NULL
                  AND lower(p.full_name) = lower(coalesce(hi.candidato_nome,''))
                  AND coalesce(p.phone,'') = coalesce(hi.candidato_telefone,'')
                LIMIT 1)
           ) AS professor_id,
           CASE upper(coalesce(hi.candidato_grade->>'weekday',''))
             WHEN 'MON' THEN 'SEGUNDA'::weekday WHEN 'TUE' THEN 'TERCA'::weekday
             WHEN 'WED' THEN 'QUARTA'::weekday WHEN 'THU' THEN 'QUINTA'::weekday
             WHEN 'FRI' THEN 'SEXTA'::weekday ELSE NULL END AS wd,
           (regexp_match(coalesce(hi.candidato_grade->>'time_slot_label',''),
              '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})'))[1]::time AS s,
           (regexp_match(coalesce(hi.candidato_grade->>'time_slot_label',''),
              '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})'))[2]::time AS e
      FROM hr_school_indications hi
     WHERE hi.external_link_id = p_link_id AND hi.status = 'APROVADA' AND hi.candidato_grade IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'indication_id', x.indication_id, 'candidato', x.candidato_nome,
           'professor_id', x.professor_id, 'weekday', x.wd,
           'conflict_school', sch.nome,
           'conflict_start', wtm.start_time, 'conflict_end', wtm.end_time)), '[]'::jsonb)
    INTO v_conflicts
    FROM resolved x
    JOIN weekly_teaching_models wtm
      ON wtm.professor_id = x.professor_id
     AND wtm.status = 'ACTIVE' AND wtm.weekday = x.wd
     AND wtm.school_id <> v_school
     AND ((x.s >= wtm.start_time AND x.s < wtm.end_time)
          OR (x.e > wtm.start_time AND x.e <= wtm.end_time)
          OR (x.s <= wtm.start_time AND x.e >= wtm.end_time))
    JOIN schools sch ON sch.id = wtm.school_id
   WHERE x.professor_id IS NOT NULL AND x.wd IS NOT NULL AND x.s IS NOT NULL;

  RETURN jsonb_build_object(
    'turmas_a_criar', v_turmas_a_criar, 'turmas_existentes', v_turmas_existentes,
    'slots_a_criar', v_slots_a_criar, 'slots_existentes', v_slots_existentes,
    'aulas_a_criar', v_aulas_a_criar, 'aulas_ignoradas', v_aulas_ignoradas,
    'slot_warnings', v_slot_warnings, 'subject_warnings', v_subject_warnings,
    'conflicts', v_conflicts);
END;
$function$;