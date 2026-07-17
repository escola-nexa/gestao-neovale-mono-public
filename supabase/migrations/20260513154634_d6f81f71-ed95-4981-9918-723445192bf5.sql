-- ANP isenção de conflito: aulas marcadas como ANP (Aula Não Presencial)
-- não devem gerar/sofrer conflito de horário em nenhuma das três camadas
-- (trigger, RPC do portal externo do diretor, e preview de materialize).

-- 1) Trigger: ignora conflitos quando o NEW ou o existente é ANP
CREATE OR REPLACE FUNCTION public.check_professor_schedule_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a NOVA alocação é ANP, jamais conflita.
  IF COALESCE(NEW.class_mode, 'PRESENCIAL') = 'ANP' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.weekly_teaching_models
    WHERE professor_id = NEW.professor_id
      AND weekday      = NEW.weekday
      AND status       = 'ACTIVE'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(class_mode, 'PRESENCIAL') = 'PRESENCIAL'
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Conflito de horário: Professor já possui aula presencial neste horário';
  END IF;
  RETURN NEW;
END;
$$;

-- 2) RPC pública do portal externo: aceita class_mode no candidato e
--    filtra wtm.class_mode = 'PRESENCIAL'.
CREATE OR REPLACE FUNCTION public.check_teacher_external_conflicts(
  p_token   text,
  p_keyword text,
  p_candidates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link   RECORD;
  v_result jsonb := '[]'::jsonb;
  v_cand   RECORD;
  v_conflicts jsonb;
  v_weekday weekday;
BEGIN
  SELECT * INTO v_link FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Link inválido ou expirado');
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Link expirado');
  END IF;
  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RETURN jsonb_build_object('error', 'Palavra-chave inválida ou expirada');
  END IF;

  IF p_candidates IS NULL OR jsonb_typeof(p_candidates) <> 'array' THEN
    RETURN jsonb_build_object('conflicts', '[]'::jsonb);
  END IF;

  FOR v_cand IN
    SELECT
      (c->>'slot_id')        AS slot_id,
      btrim(c->>'teacher_name')  AS teacher_name,
      _digits_only(c->>'teacher_phone') AS phone_digits,
      (c->>'weekday')        AS weekday_txt,
      (c->>'start_time')::time AS start_time,
      (c->>'end_time')::time   AS end_time,
      upper(coalesce(c->>'class_mode','PRESENCIAL')) AS class_mode,
      coalesce((c->>'is_anp')::boolean, false) AS is_anp
    FROM jsonb_array_elements(p_candidates) AS c
  LOOP
    IF v_cand.teacher_name IS NULL OR length(v_cand.teacher_name) = 0 THEN CONTINUE; END IF;
    IF v_cand.weekday_txt IS NULL THEN CONTINUE; END IF;
    -- ANP nunca conflita.
    IF v_cand.class_mode = 'ANP' OR v_cand.is_anp THEN CONTINUE; END IF;

    v_weekday := CASE upper(v_cand.weekday_txt)
      WHEN 'MON' THEN 'SEGUNDA'::weekday
      WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday
      WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday
      ELSE NULL
    END;
    IF v_weekday IS NULL THEN CONTINUE; END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'professor_id',  p.id,
        'professor_name', p.full_name,
        'school_id',     wtm.school_id,
        'school_name',   sc.nome,
        'class_group_id', wtm.class_group_id,
        'class_name',    cg.nome,
        'subject_id',    wtm.subject_id,
        'subject_name',  COALESCE(NULLIF(btrim(sj.nome_boletim), ''), sj.nome),
        'weekday',       wtm.weekday::text,
        'start_time',    to_char(wtm.start_time, 'HH24:MI'),
        'end_time',      to_char(wtm.end_time, 'HH24:MI'),
        'overlap_start', to_char(GREATEST(wtm.start_time, v_cand.start_time), 'HH24:MI'),
        'overlap_end',   to_char(LEAST(wtm.end_time,   v_cand.end_time), 'HH24:MI'),
        'schedule_type', wtm.schedule_type::text,
        'class_mode',    COALESCE(wtm.class_mode, 'PRESENCIAL')
    )), '[]'::jsonb) INTO v_conflicts
    FROM professors p
    JOIN weekly_teaching_models wtm
      ON wtm.professor_id = p.id
     AND wtm.status = 'ACTIVE'
     AND wtm.weekday = v_weekday
     AND wtm.start_time < v_cand.end_time
     AND wtm.end_time   > v_cand.start_time
     AND COALESCE(wtm.class_mode, 'PRESENCIAL') = 'PRESENCIAL'
    LEFT JOIN schools sc      ON sc.id = wtm.school_id
    LEFT JOIN class_groups cg ON cg.id = wtm.class_group_id
    LEFT JOIN subjects sj     ON sj.id = wtm.subject_id
    WHERE p.organization_id = v_link.organization_id
      AND p.deleted_at IS NULL
      AND p.status = 'ativo'
      AND lower(btrim(p.full_name)) = lower(v_cand.teacher_name)
      AND (
            v_cand.phone_digits = ''
         OR _digits_only(p.phone) = ''
         OR _digits_only(p.phone) = v_cand.phone_digits
          )
      AND wtm.school_id <> v_link.school_id;

    IF jsonb_array_length(v_conflicts) > 0 THEN
      v_result := v_result || jsonb_build_object(
        'slot_id',       v_cand.slot_id,
        'teacher_name',  v_cand.teacher_name,
        'weekday',       v_cand.weekday_txt,
        'start_time',    to_char(v_cand.start_time, 'HH24:MI'),
        'end_time',      to_char(v_cand.end_time,   'HH24:MI'),
        'conflicts',     v_conflicts
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('conflicts', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_teacher_external_conflicts(text, text, jsonb) TO anon, authenticated;

-- 3) preview_grade_from_indications: ignora conflito quando o candidato OU
--    o registro existente é ANP.
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
              '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})'))[2]::time AS e,
           (coalesce((hi.candidato_grade->>'is_anp')::boolean, false)
             OR upper(coalesce(hi.candidato_grade->>'class_mode','')) = 'ANP') AS is_anp
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
     AND COALESCE(wtm.class_mode, 'PRESENCIAL') = 'PRESENCIAL'
     AND ((x.s >= wtm.start_time AND x.s < wtm.end_time)
          OR (x.e > wtm.start_time AND x.e <= wtm.end_time)
          OR (x.s <= wtm.start_time AND x.e >= wtm.end_time))
    JOIN schools sch ON sch.id = wtm.school_id
   WHERE x.professor_id IS NOT NULL AND x.wd IS NOT NULL AND x.s IS NOT NULL
     AND NOT x.is_anp;

  RETURN jsonb_build_object(
    'turmas_a_criar', v_turmas_a_criar, 'turmas_existentes', v_turmas_existentes,
    'slots_a_criar', v_slots_a_criar, 'slots_existentes', v_slots_existentes,
    'aulas_a_criar', v_aulas_a_criar, 'aulas_ignoradas', v_aulas_ignoradas,
    'slot_warnings', v_slot_warnings, 'subject_warnings', v_subject_warnings,
    'conflicts', v_conflicts);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.preview_grade_from_indications(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_grade_from_indications(uuid) TO authenticated;