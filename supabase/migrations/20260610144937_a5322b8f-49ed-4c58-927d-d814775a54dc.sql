-- 1) Trigger: respeita semestre da disciplina ao verificar conflito
CREATE OR REPLACE FUNCTION public.check_professor_schedule_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict record;
  v_school text;
  v_class  text;
  v_subject text;
  v_prof text;
  v_weekday_label text;
  v_new_sem text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  IF NEW.professor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ANP nunca gera conflito.
  IF COALESCE(NEW.class_mode, 'PRESENCIAL') = 'ANP' THEN
    RETURN NEW;
  END IF;

  -- Semestre da disciplina nova (NULL/PLANNING => ANNUAL, conservador).
  SELECT COALESCE(s.semester::text, 'ANNUAL') INTO v_new_sem
    FROM public.subjects s WHERE s.id = NEW.subject_id;
  v_new_sem := COALESCE(v_new_sem, 'ANNUAL');

  SELECT existing.*
    INTO v_conflict
    FROM public.weekly_teaching_models existing
    LEFT JOIN public.subjects es ON es.id = existing.subject_id
   WHERE existing.professor_id = NEW.professor_id
     AND existing.weekday = NEW.weekday
     AND existing.status = 'ACTIVE'
     AND existing.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND COALESCE(existing.class_mode, 'PRESENCIAL') = 'PRESENCIAL'
     AND NEW.start_time < existing.end_time
     AND NEW.end_time > existing.start_time
     -- Compatibilidade de semestre: FIRST↔SECOND não conflita.
     AND (
       v_new_sem = 'ANNUAL'
       OR COALESCE(es.semester::text, 'ANNUAL') = 'ANNUAL'
       OR COALESCE(es.semester::text, 'ANNUAL') = v_new_sem
     )
     AND NOT (
       NEW.schedule_type = 'CLASS'
       AND existing.schedule_type = 'CLASS'
       AND NEW.class_group_id IS NOT NULL
       AND existing.class_group_id = NEW.class_group_id
       AND existing.school_id = NEW.school_id
       AND existing.course_id = NEW.course_id
       AND existing.start_time = NEW.start_time
       AND existing.end_time = NEW.end_time
       AND existing.subject_id IS DISTINCT FROM NEW.subject_id
     )
   LIMIT 1;

  IF v_conflict.id IS NOT NULL THEN
    SELECT nome INTO v_school   FROM public.schools       WHERE id = v_conflict.school_id;
    SELECT nome INTO v_class    FROM public.class_groups  WHERE id = v_conflict.class_group_id;
    SELECT nome INTO v_subject  FROM public.subjects      WHERE id = v_conflict.subject_id;
    SELECT full_name INTO v_prof FROM public.professors   WHERE id = NEW.professor_id;

    v_weekday_label := CASE v_conflict.weekday::text
      WHEN 'SEGUNDA' THEN 'Segunda'
      WHEN 'TERCA'   THEN 'Terça'
      WHEN 'QUARTA'  THEN 'Quarta'
      WHEN 'QUINTA'  THEN 'Quinta'
      WHEN 'SEXTA'   THEN 'Sexta'
      WHEN 'SABADO'  THEN 'Sábado'
      ELSE v_conflict.weekday::text
    END;

    RAISE EXCEPTION
      'CONFLITO_HORARIO_PROFESSOR: professor=% | escola=% | turma=% | disciplina=% | dia=% | horario=%-% | tipo_existente=% | tipo_novo=%',
      COALESCE(v_prof, 'Professor'),
      COALESCE(v_school, '(sem escola)'),
      COALESCE(v_class, '(sem turma)'),
      COALESCE(v_subject, '(sem disciplina)'),
      v_weekday_label,
      to_char(v_conflict.start_time, 'HH24:MI'),
      to_char(v_conflict.end_time, 'HH24:MI'),
      v_conflict.schedule_type::text,
      NEW.schedule_type::text;
  END IF;

  RETURN NEW;
END;
$function$;


-- 2) RPC check_teacher_external_conflicts: aceita subject_id no candidato
--    e aplica a mesma regra de compatibilidade.
CREATE OR REPLACE FUNCTION public.check_teacher_external_conflicts(p_token text, p_keyword text, p_candidates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link   RECORD;
  v_result jsonb := '[]'::jsonb;
  v_cand   RECORD;
  v_conflicts jsonb;
  v_weekday weekday;
  v_cand_sem text;
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
      coalesce((c->>'is_anp')::boolean, false) AS is_anp,
      NULLIF(c->>'subject_id','')::uuid AS subject_id
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

    -- Semestre do candidato (sem subject_id => ANNUAL, conservador)
    SELECT COALESCE(s.semester::text, 'ANNUAL') INTO v_cand_sem
      FROM public.subjects s WHERE s.id = v_cand.subject_id;
    v_cand_sem := COALESCE(v_cand_sem, 'ANNUAL');

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
      AND wtm.school_id <> v_link.school_id
      -- Compatibilidade de semestre
      AND (
            v_cand_sem = 'ANNUAL'
         OR COALESCE(sj.semester::text, 'ANNUAL') = 'ANNUAL'
         OR COALESCE(sj.semester::text, 'ANNUAL') = v_cand_sem
          );

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
$function$;