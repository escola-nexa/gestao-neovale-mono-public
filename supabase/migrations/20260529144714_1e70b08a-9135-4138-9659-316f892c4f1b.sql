-- Enriquece a mensagem do trigger de conflito de horário com Escola, Turma, Disciplina, Dia e Horário.
CREATE OR REPLACE FUNCTION public.check_professor_schedule_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict record;
  v_school text;
  v_class  text;
  v_subject text;
  v_prof text;
  v_weekday_label text;
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

  SELECT existing.*
    INTO v_conflict
    FROM public.weekly_teaching_models existing
   WHERE existing.professor_id = NEW.professor_id
     AND existing.weekday = NEW.weekday
     AND existing.status = 'ACTIVE'
     AND existing.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND COALESCE(existing.class_mode, 'PRESENCIAL') = 'PRESENCIAL'
     AND NEW.start_time < existing.end_time
     AND NEW.end_time > existing.start_time
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
$$;