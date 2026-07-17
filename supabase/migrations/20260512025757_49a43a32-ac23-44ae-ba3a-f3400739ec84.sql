CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(p_link_id uuid, p_ano_letivo text, p_generate_occurrences boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_school uuid;
  v_user uuid := auth.uid();
  v_classes_upserted int := 0;
  v_slots_upserted int := 0;
  v_models_upserted int := 0;
  v_aulas_anp int := 0;
  v_aulas_ignoradas int := 0;
  v_planning_created int := 0;
  v_planning_deficit int := 0;
  v_occurrences_created int := 0;
  v_bindings_upserted int := 0;
  v_motivos jsonb := '[]'::jsonb;
  v_pendentes int;
  v_recusadas int;
  v_aprovadas int;
  v_total int;
  v_class_group_ids uuid[] := ARRAY[]::uuid[];
  v_model_ids uuid[] := ARRAY[]::uuid[];
  v_planning_model_ids uuid[] := ARRAY[]::uuid[];
  r record;
  v_class_group_id uuid;
  v_weekday weekday;
  v_start time;
  v_end time;
  v_slot_id uuid;
  v_slot_number int;
  v_professor_id uuid;
  v_label text;
  v_times text[];
  v_subject_id uuid;
  v_subj_ok boolean;
  v_calendar_id uuid;
  v_model_id uuid;
  v_class_mode text;
  prof record;
  v_target int;
  v_already int;
  v_to_create int;
  free_slot record;
  v_pl_model_id uuid;
  bind record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_ano_letivo IS NULL OR length(trim(p_ano_letivo)) = 0 THEN
    RAISE EXCEPTION 'Ano letivo é obrigatório';
  END IF;

  SELECT organization_id, school_id INTO v_org, v_school
    FROM external_links WHERE id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  IF NOT public.has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente administradores podem gerar a grade horária';
  END IF;

  SELECT count(*) INTO v_total FROM hr_school_indications WHERE external_link_id = p_link_id;
  SELECT count(*) INTO v_aprovadas FROM hr_school_indications WHERE external_link_id = p_link_id AND status = 'APROVADA';
  SELECT count(*) INTO v_pendentes FROM hr_school_indications WHERE external_link_id = p_link_id AND status IN ('PENDENTE','EM_ANALISE');
  SELECT count(*) INTO v_recusadas FROM hr_school_indications WHERE external_link_id = p_link_id AND status = 'RECUSADA';

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Não há indicações neste link para materializar';
  END IF;
  IF v_pendentes > 0 OR v_recusadas > 0 THEN
    RAISE EXCEPTION 'Existem % indicação(ões) pendente(s) e % recusada(s). Conclua a conferência antes de gerar a grade.', v_pendentes, v_recusadas;
  END IF;

  -- 1) Upsert das turmas
  FOR r IN
    SELECT hc.course_id, hc.nome
      FROM hr_indication_classes hc
     WHERE hc.external_link_id = p_link_id
  LOOP
    SELECT id INTO v_class_group_id
      FROM class_groups
     WHERE school_id = v_school
       AND course_id = r.course_id
       AND nome = r.nome
       AND ano_letivo = p_ano_letivo
     LIMIT 1;

    IF v_class_group_id IS NULL THEN
      INSERT INTO class_groups (organization_id, school_id, course_id, nome, ano_letivo, status)
      VALUES (v_org, v_school, r.course_id, r.nome, p_ano_letivo, 'ativo')
      RETURNING id INTO v_class_group_id;
      v_classes_upserted := v_classes_upserted + 1;
    END IF;
    v_class_group_ids := v_class_group_ids || v_class_group_id;
  END LOOP;

  -- 2) Idempotência
  IF array_length(v_class_group_ids, 1) > 0 THEN
    DELETE FROM weekly_teaching_models
     WHERE class_group_id = ANY(v_class_group_ids)
       AND schedule_type = 'CLASS';
  END IF;
  DELETE FROM weekly_teaching_models
   WHERE school_id = v_school
     AND schedule_type = 'PLANNING'
     AND class_group_id IS NULL
     AND subject_id IS NULL;

  -- 3) Insere CLASS
  FOR r IN
    SELECT hi.id, hi.indication_class_id, hi.course_id, hi.candidato_grade,
           hi.professor_id, hi.talent_pool_candidate_id,
           hi.candidato_nome, hi.candidato_email, hi.candidato_telefone,
           hc.nome AS class_nome
      FROM hr_school_indications hi
      LEFT JOIN hr_indication_classes hc ON hc.id = hi.indication_class_id
     WHERE hi.external_link_id = p_link_id
       AND hi.status = 'APROVADA'
       AND hi.candidato_grade IS NOT NULL
  LOOP
    v_weekday := CASE upper(coalesce(r.candidato_grade->>'weekday',''))
      WHEN 'MON' THEN 'SEGUNDA'::weekday
      WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday
      WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday
      ELSE NULL END;

    v_label := coalesce(r.candidato_grade->>'time_slot_label','');
    v_times := regexp_match(v_label, '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})');

    IF v_weekday IS NULL OR v_times IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', 'horário/dia inválido', 'label', v_label);
      CONTINUE;
    END IF;
    v_start := v_times[1]::time;
    v_end := v_times[2]::time;

    v_slot_number := coalesce(
      NULLIF(regexp_replace(v_label, '^(\d+).*$', '\1'), v_label)::int,
      1
    );

    v_class_mode := CASE
      WHEN coalesce((r.candidato_grade->>'is_anp')::boolean, false)
        OR upper(coalesce(r.candidato_grade->>'class_mode','')) = 'ANP'
      THEN 'ANP'
      ELSE 'PRESENCIAL'
    END;

    v_subject_id := NULLIF(r.candidato_grade->>'subject_id','')::uuid;
    IF v_subject_id IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM subjects s WHERE s.id = v_subject_id AND s.course_id = r.course_id)
        INTO v_subj_ok;
      IF NOT v_subj_ok THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', 'disciplina não pertence ao curso', 'subject_id', v_subject_id);
        CONTINUE;
      END IF;
    END IF;

    SELECT id INTO v_slot_id
      FROM school_time_slots
     WHERE school_id = v_school AND weekday = v_weekday
       AND start_time = v_start AND end_time = v_end
       AND status = 'ACTIVE'
     LIMIT 1;

    IF v_slot_id IS NULL THEN
      BEGIN
        INSERT INTO school_time_slots (organization_id, school_id, weekday, slot_number, slot_label, start_time, end_time, status)
        VALUES (v_org, v_school, v_weekday, v_slot_number, v_label, v_start, v_end, 'ACTIVE')
        RETURNING id INTO v_slot_id;
        v_slots_upserted := v_slots_upserted + 1;
      EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_slot_id FROM school_time_slots
         WHERE school_id = v_school AND weekday = v_weekday AND status='ACTIVE'
           AND start_time <= v_start AND end_time >= v_end
         LIMIT 1;
        IF v_slot_id IS NULL THEN
          v_aulas_ignoradas := v_aulas_ignoradas + 1;
          v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', 'conflito de horário com slot existente', 'label', v_label);
          CONTINUE;
        END IF;
      END;
    END IF;

    SELECT cg.id INTO v_class_group_id
      FROM hr_indication_classes hc
      JOIN class_groups cg ON cg.school_id = v_school
                          AND cg.course_id = hc.course_id
                          AND cg.nome = hc.nome
                          AND cg.ano_letivo = p_ano_letivo
     WHERE hc.id = r.indication_class_id
     LIMIT 1;
    IF v_class_group_id IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', 'turma não encontrada');
      CONTINUE;
    END IF;

    v_professor_id := r.professor_id;
    IF v_professor_id IS NULL AND r.talent_pool_candidate_id IS NOT NULL THEN
      SELECT id INTO v_professor_id FROM professors
       WHERE talent_pool_candidate_id = r.talent_pool_candidate_id
         AND organization_id = v_org
       LIMIT 1;
    END IF;
    IF v_professor_id IS NULL THEN
      SELECT p.id INTO v_professor_id FROM professors p
       WHERE p.organization_id = v_org
         AND lower(p.full_name) = lower(coalesce(r.candidato_nome,''))
         AND (
           lower(coalesce(p.email,'')) = lower(coalesce(r.candidato_email,''))
           OR coalesce(p.phone,'') = coalesce(r.candidato_telefone,'')
         )
       LIMIT 1;
    END IF;

    BEGIN
      INSERT INTO weekly_teaching_models (
        organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
        weekday, start_time, end_time, status, schedule_type, school_time_slot_id, class_mode
      ) VALUES (
        v_org, v_professor_id, v_school, r.course_id, v_class_group_id,
        v_subject_id, v_weekday, v_start, v_end, 'ACTIVE', 'CLASS', v_slot_id, v_class_mode
      ) RETURNING id INTO v_model_id;
      v_models_upserted := v_models_upserted + 1;
      IF v_class_mode = 'ANP' THEN
        v_aulas_anp := v_aulas_anp + 1;
      END IF;
      IF v_professor_id IS NOT NULL THEN
        v_model_ids := v_model_ids || v_model_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', SQLERRM);
    END;
  END LOOP;

  -- 3.5) Auto PL (1/3 CH, min 1)
  FOR prof IN
    SELECT wtm.professor_id, count(*)::int AS class_count
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id = v_school
       AND wtm.schedule_type = 'CLASS'
       AND wtm.status = 'ACTIVE'
       AND wtm.professor_id IS NOT NULL
       AND wtm.class_group_id = ANY(v_class_group_ids)
     GROUP BY wtm.professor_id
  LOOP
    v_target := GREATEST(1, ROUND(prof.class_count::numeric / 3.0))::int;
    SELECT count(*)::int INTO v_already
      FROM weekly_teaching_models
     WHERE professor_id = prof.professor_id
       AND school_id = v_school
       AND schedule_type = 'PLANNING'
       AND status = 'ACTIVE';
    v_to_create := GREATEST(0, v_target - v_already);
    IF v_to_create = 0 THEN CONTINUE; END IF;

    FOR free_slot IN
      SELECT sts.id AS slot_id, sts.weekday, sts.start_time, sts.end_time
        FROM school_time_slots sts
       WHERE sts.school_id = v_school
         AND sts.status = 'ACTIVE'
         AND NOT EXISTS (
           SELECT 1 FROM weekly_teaching_models occ
            WHERE occ.school_id = v_school AND occ.status = 'ACTIVE'
              AND occ.weekday = sts.weekday
              AND occ.start_time = sts.start_time
              AND occ.end_time = sts.end_time
         )
         AND NOT EXISTS (
           SELECT 1 FROM weekly_teaching_models conf
            WHERE conf.professor_id = prof.professor_id AND conf.status = 'ACTIVE'
              AND conf.weekday = sts.weekday
              AND conf.start_time < sts.end_time
              AND conf.end_time > sts.start_time
         )
       ORDER BY sts.weekday, sts.start_time
       LIMIT v_to_create
    LOOP
      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
          weekday, start_time, end_time, status, schedule_type, school_time_slot_id, class_mode
        ) VALUES (
          v_org, prof.professor_id, v_school, NULL, NULL, NULL,
          free_slot.weekday, free_slot.start_time, free_slot.end_time,
          'ACTIVE', 'PLANNING', free_slot.slot_id, 'PRESENCIAL'
        ) RETURNING id INTO v_pl_model_id;
        v_planning_created := v_planning_created + 1;
        v_to_create := v_to_create - 1;
        v_planning_model_ids := v_planning_model_ids || v_pl_model_id;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;

    IF v_to_create > 0 THEN
      v_planning_deficit := v_planning_deficit + v_to_create;
      v_motivos := v_motivos || jsonb_build_object(
        'professor_id', prof.professor_id,
        'reason', 'horários livres insuficientes para PL',
        'target', v_target,
        'criados', v_target - v_to_create
      );
    END IF;
  END LOOP;

  -- 3.6) Vínculo formal Professor × Escola × Curso com CH por turno
  FOR bind IN
    SELECT
      wtm.professor_id,
      wtm.course_id,
      ROUND(SUM(CASE WHEN wtm.start_time < TIME '12:00' THEN EXTRACT(EPOCH FROM (wtm.end_time - wtm.start_time))/3600.0 ELSE 0 END)::numeric, 2) AS morning_h,
      ROUND(SUM(CASE WHEN wtm.start_time >= TIME '12:00' AND wtm.start_time < TIME '18:00' THEN EXTRACT(EPOCH FROM (wtm.end_time - wtm.start_time))/3600.0 ELSE 0 END)::numeric, 2) AS afternoon_h,
      ROUND(SUM(CASE WHEN wtm.start_time >= TIME '18:00' THEN EXTRACT(EPOCH FROM (wtm.end_time - wtm.start_time))/3600.0 ELSE 0 END)::numeric, 2) AS night_h
    FROM weekly_teaching_models wtm
    WHERE wtm.school_id = v_school
      AND wtm.schedule_type = 'CLASS'
      AND wtm.status = 'ACTIVE'
      AND wtm.professor_id IS NOT NULL
      AND wtm.course_id IS NOT NULL
      AND wtm.class_group_id = ANY(v_class_group_ids)
    GROUP BY wtm.professor_id, wtm.course_id
    HAVING SUM(EXTRACT(EPOCH FROM (wtm.end_time - wtm.start_time))) > 0
  LOOP
    INSERT INTO professor_school_courses (
      organization_id, professor_id, school_id, course_id, status,
      workload_morning_hours, workload_afternoon_hours, workload_night_hours,
      workload_filled_at
    ) VALUES (
      v_org, bind.professor_id, v_school, bind.course_id, 'ACTIVE',
      bind.morning_h, bind.afternoon_h, bind.night_h,
      now()
    )
    ON CONFLICT (professor_id, school_id, course_id) WHERE course_id IS NOT NULL
    DO UPDATE SET
      status = 'ACTIVE',
      workload_morning_hours = EXCLUDED.workload_morning_hours,
      workload_afternoon_hours = EXCLUDED.workload_afternoon_hours,
      workload_night_hours = EXCLUDED.workload_night_hours,
      workload_filled_at = now(),
      unbind_reason = NULL,
      unbound_at = NULL,
      unbound_by = NULL;
    v_bindings_upserted := v_bindings_upserted + 1;
  END LOOP;

  -- 4) Ocorrências anuais
  IF p_generate_occurrences THEN
    SELECT id INTO v_calendar_id
      FROM academic_calendars
     WHERE organization_id = v_org AND status = 'ACTIVE'
     LIMIT 1;

    IF v_calendar_id IS NOT NULL THEN
      WITH all_models AS (
        SELECT id FROM weekly_teaching_models WHERE id = ANY(v_model_ids)
        UNION ALL
        SELECT id FROM weekly_teaching_models WHERE id = ANY(v_planning_model_ids)
      ),
      model_data AS (
        SELECT wtm.id, wtm.weekday, wtm.start_time, wtm.end_time,
               CASE wtm.weekday
                 WHEN 'SEGUNDA' THEN 1 WHEN 'TERCA' THEN 2 WHEN 'QUARTA' THEN 3
                 WHEN 'QUINTA' THEN 4 WHEN 'SEXTA' THEN 5 END AS dow
          FROM weekly_teaching_models wtm
          JOIN all_models am ON am.id = wtm.id
      ),
      letivo AS (
        SELECT event_date FROM calendar_events
         WHERE calendar_id = v_calendar_id AND event_type = 'LETIVO'
      ),
      to_insert AS (
        SELECT v_org AS organization_id,
               md.id AS weekly_model_id,
               l.event_date AS occurrence_date,
               md.start_time, md.end_time,
               'SCHEDULED'::text AS status
          FROM model_data md
          JOIN letivo l ON EXTRACT(DOW FROM l.event_date)::int = md.dow
      )
      INSERT INTO annual_class_occurrences (organization_id, weekly_model_id, occurrence_date, start_time, end_time, status)
      SELECT organization_id, weekly_model_id, occurrence_date, start_time, end_time, status::text::class_occurrence_status FROM to_insert
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_occurrences_created = ROW_COUNT;
    END IF;
  END IF;

  -- 5) Marca link materializado
  UPDATE external_links
     SET materialized_at = now(),
         materialized_by = v_user,
         materialized_ano_letivo = p_ano_letivo,
         updated_at = now()
   WHERE id = p_link_id;

  -- 6) Auditoria
  INSERT INTO audit_events (organization_id, actor_id, module, action, details)
  VALUES (
    v_org, v_user, 'rh_links_escolas', 'materialize_grade',
    jsonb_build_object(
      'link_id', p_link_id,
      'school_id', v_school,
      'ano_letivo', p_ano_letivo,
      'classes_upserted', v_classes_upserted,
      'slots_upserted', v_slots_upserted,
      'models_upserted', v_models_upserted,
      'aulas_anp', v_aulas_anp,
      'aulas_ignoradas', v_aulas_ignoradas,
      'planning_created', v_planning_created,
      'planning_deficit', v_planning_deficit,
      'bindings_upserted', v_bindings_upserted,
      'occurrences_created', v_occurrences_created,
      'generate_occurrences', p_generate_occurrences
    )
  );

  RETURN jsonb_build_object(
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_anp', v_aulas_anp,
    'aulas_ignoradas', v_aulas_ignoradas,
    'planning_created', v_planning_created,
    'planning_deficit', v_planning_deficit,
    'bindings_upserted', v_bindings_upserted,
    'occurrences_created', v_occurrences_created,
    'motivos', v_motivos,
    'materialized_at', now(),
    'ano_letivo', p_ano_letivo
  );
END;
$function$;