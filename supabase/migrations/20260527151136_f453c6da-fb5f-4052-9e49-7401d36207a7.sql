CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(p_link_id uuid, p_ano_letivo text, p_generate_occurrences boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_school uuid; v_school_name text; v_user uuid := auth.uid();
  v_classes_upserted int := 0; v_slots_upserted int := 0; v_models_upserted int := 0;
  v_aulas_anp int := 0; v_aulas_ignoradas int := 0;
  v_planning_created int := 0; v_planning_deficit int := 0;
  v_occurrences_created int := 0;
  v_bindings_upserted int := 0; v_bindings_deactivated int := 0;
  v_notifications_sent int := 0;
  v_motivos jsonb := '[]'::jsonb; v_pendentes int; v_recusadas int; v_aprovadas int; v_total int;
  v_class_group_ids uuid[] := ARRAY[]::uuid[];
  v_model_ids uuid[] := ARRAY[]::uuid[];
  v_planning_model_ids uuid[] := ARRAY[]::uuid[];
  v_active_pairs jsonb := '[]'::jsonb;
  v_preplanning_seed jsonb := '[]'::jsonb;
  r record; v_class_group_id uuid; v_weekday weekday; v_start time; v_end time;
  v_slot_id uuid; v_slot_number int; v_professor_id uuid;
  v_label text; v_times text[]; v_subject_id uuid; v_subj_ok boolean;
  v_calendar_id uuid; v_cal_start date; v_cal_end date;
  v_b2_end date; v_model_id uuid; v_class_mode text;
  prof record; v_target int; v_already int; v_to_create int;
  free_slot record; v_pl_model_id uuid; bind record;
  v_teto numeric; v_prof_status text; v_prof_deleted timestamptz; v_prof_user uuid;
  v_total_h numeric; v_row_h numeric;
  v_per_prof_slots jsonb := '{}'::jsonb;
  v_slot_key text;
  v_per_prof jsonb := '{}'::jsonb;
  v_shift_morning_end time; v_shift_afternoon_end time;
  v_existing_with_history int;
  v_first uuid; v_second uuid; v_annual uuid;
  v_subject_set uuid[]; v_sid uuid;
  v_existing_binding_id uuid;
  v_resolved_count int := 0;
  v_prof_total_ch numeric;
  v_predominant_shift text;
  v_occ_deleted int := 0;
  v_shift_label text;
  v_new_slot_id uuid;
  v_pl_course_id uuid;
  v_pl_class_group_id uuid;
  v_pl_failed_no_slot int := 0;
  v_total_classes int := 0;
  v_total_slots int := 0;
  v_processed_combos jsonb := '{}'::jsonb;
  v_combo_key text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_ano_letivo IS NULL OR length(trim(p_ano_letivo)) = 0 THEN
    RAISE EXCEPTION 'Ano letivo é obrigatório';
  END IF;

  SELECT el.organization_id, el.school_id, s.nome
    INTO v_org, v_school, v_school_name
    FROM external_links el
    LEFT JOIN schools s ON s.id = el.school_id
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Link não encontrado'; END IF;
  IF NOT public.has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente administradores podem gerar a grade horária';
  END IF;

  SELECT teto_ch_semanal INTO v_teto FROM hr_settings WHERE organization_id=v_org LIMIT 1;
  v_teto := COALESCE(v_teto, 40);
  v_shift_morning_end := '12:00'::time;
  v_shift_afternoon_end := '18:00'::time;

  SELECT id, start_date, end_date INTO v_calendar_id, v_cal_start, v_cal_end
    FROM academic_calendars WHERE organization_id=v_org AND academic_year=p_ano_letivo::int AND status='ACTIVE' LIMIT 1;
  SELECT end_date INTO v_b2_end FROM academic_bimesters
   WHERE calendar_id=v_calendar_id AND number=2 LIMIT 1;

  SELECT count(*) FILTER (WHERE status='PENDENTE'),
         count(*) FILTER (WHERE status='RECUSADA'),
         count(*) FILTER (WHERE status='APROVADA'),
         count(*)
    INTO v_pendentes, v_recusadas, v_aprovadas, v_total
    FROM hr_school_indications
   WHERE external_link_id = p_link_id;

  IF v_pendentes > 0 OR v_recusadas > 0 THEN
    RAISE EXCEPTION 'GRADE_NAO_FINALIZADA: % pendente(s) e % recusada(s) — aprove ou remova-as antes de gerar a grade.', v_pendentes, v_recusadas;
  END IF;
  IF v_total = 0 OR v_aprovadas = 0 THEN
    RAISE EXCEPTION 'GRADE_VAZIA: não há indicações aprovadas para gerar a grade.';
  END IF;

  FOR r IN
    SELECT hc.id AS indication_class_id, hc.nome, hc.course_id
      FROM hr_indication_classes hc
     WHERE hc.external_link_id = p_link_id
  LOOP
    SELECT id INTO v_class_group_id
      FROM class_groups cg
     WHERE cg.school_id = v_school AND cg.course_id = r.course_id
       AND cg.nome = r.nome AND cg.ano_letivo = p_ano_letivo
     LIMIT 1;
    IF v_class_group_id IS NULL THEN
      INSERT INTO class_groups (organization_id, school_id, course_id, nome, ano_letivo, status)
      VALUES (v_org, v_school, r.course_id, r.nome, p_ano_letivo, 'ativo')
      RETURNING id INTO v_class_group_id;
      v_classes_upserted := v_classes_upserted + 1;
    END IF;
    v_class_group_ids := v_class_group_ids || v_class_group_id;
  END LOOP;

  IF array_length(v_class_group_ids,1) > 0 THEN
    SELECT count(*) INTO v_existing_with_history
      FROM teacher_plannings tp
      JOIN annual_class_occurrences ao ON ao.id = tp.occurrence_id
      JOIN weekly_teaching_models wtm ON wtm.id = ao.weekly_model_id
     WHERE wtm.class_group_id = ANY(v_class_group_ids)
       AND wtm.schedule_type = 'CLASS' AND wtm.status = 'ACTIVE';
    IF v_existing_with_history > 0 THEN
      RAISE EXCEPTION 'Esta grade já possui % planejamento(s) de aula vinculado(s). Reverta primeiro via unmaterialize_grade ou contate suporte.', v_existing_with_history;
    END IF;

    UPDATE weekly_teaching_models SET status = 'INACTIVE', updated_at = now()
     WHERE class_group_id = ANY(v_class_group_ids)
       AND schedule_type = 'CLASS' AND status = 'ACTIVE';
  END IF;
  UPDATE weekly_teaching_models SET status = 'INACTIVE', updated_at = now()
   WHERE school_id = v_school AND schedule_type = 'PLANNING'
     AND status = 'ACTIVE';

  FOR r IN
    SELECT hi.id, hi.indication_class_id, hi.course_id, hi.candidato_grade,
           hi.professor_id, hi.talent_pool_candidate_id,
           hi.candidato_nome, hi.candidato_email, hi.candidato_telefone, hc.nome AS class_nome
      FROM hr_school_indications hi
      LEFT JOIN hr_indication_classes hc ON hc.id = hi.indication_class_id
     WHERE hi.external_link_id = p_link_id AND hi.status='APROVADA' AND hi.candidato_grade IS NOT NULL
  LOOP
    v_weekday := CASE upper(coalesce(r.candidato_grade->>'weekday',''))
      WHEN 'MON' THEN 'SEGUNDA'::weekday WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday ELSE NULL END;
    v_label := coalesce(r.candidato_grade->>'time_slot_label','');
    v_times := regexp_match(v_label, '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})');
    IF v_weekday IS NULL OR v_times IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','horário/dia inválido','label',v_label);
      CONTINUE;
    END IF;
    v_start := v_times[1]::time; v_end := v_times[2]::time;
    v_slot_number := coalesce(NULLIF(regexp_replace(v_label,'^(\d+).*$','\1'),v_label)::int,1);
    v_class_mode := CASE WHEN coalesce((r.candidato_grade->>'is_anp')::boolean,false)
                          OR upper(coalesce(r.candidato_grade->>'class_mode','')) = 'ANP'
                         THEN 'ANP' ELSE 'PRESENCIAL' END;
    v_row_h := CASE WHEN v_class_mode = 'ANP' THEN 1.0
                    ELSE EXTRACT(EPOCH FROM (v_end - v_start))/3600.0 END;

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
    SELECT array_agg(DISTINCT x) INTO v_subject_set FROM unnest(v_subject_set) x WHERE x IS NOT NULL;

    IF array_length(v_subject_set,1) IS NOT NULL THEN
      SELECT array_agg(DISTINCT pair_id) INTO v_subject_set
      FROM (
        SELECT unnest(v_subject_set) AS pair_id
        UNION
        SELECT s2.id
          FROM unnest(v_subject_set) AS sid
          JOIN subjects base ON base.id = sid
          JOIN subjects s2
            ON s2.course_id = base.course_id
           AND s2.status = 'ativo'
           AND s2.deleted_at IS NULL
           AND s2.id <> base.id
           AND base.semester IN ('FIRST','SECOND')
           AND s2.semester IN ('FIRST','SECOND')
           AND s2.semester <> base.semester
           AND public.classify_ucp(base.nome) IN ('UCP1','UCP2','UCP3','PEDAGOGICA')
           AND public.classify_ucp(s2.nome) = public.classify_ucp(base.nome)
          WHERE EXISTS (
            SELECT 1 FROM hr_link_subject_bimester_filter f
             WHERE f.external_link_id = p_link_id
               AND f.subject_id = s2.id
               AND f.enabled = true
          )
          OR NOT EXISTS (
            SELECT 1 FROM hr_link_subject_bimester_filter f
             WHERE f.external_link_id = p_link_id
               AND f.subject_id = s2.id
          )
      ) u
      WHERE pair_id IS NOT NULL;
    END IF;

    IF array_length(v_subject_set,1) IS NOT NULL THEN
      SELECT bool_and(EXISTS (SELECT 1 FROM subjects s WHERE s.id = sid AND s.course_id = r.course_id))
        INTO v_subj_ok
        FROM unnest(v_subject_set) AS sid;
      IF NOT v_subj_ok THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','disciplina não pertence ao curso');
        CONTINUE;
      END IF;
    END IF;

    v_professor_id := r.professor_id;
    IF v_professor_id IS NULL AND r.talent_pool_candidate_id IS NOT NULL THEN
      SELECT p.id, p.status, p.deleted_at, p.user_id
        INTO v_professor_id, v_prof_status, v_prof_deleted, v_prof_user
        FROM professors p
       WHERE p.talent_pool_candidate_id = r.talent_pool_candidate_id
       ORDER BY p.created_at DESC LIMIT 1;
    END IF;
    IF v_professor_id IS NOT NULL THEN
      SELECT status, deleted_at, user_id INTO v_prof_status, v_prof_deleted, v_prof_user
        FROM professors WHERE id = v_professor_id;
      IF v_prof_status IS DISTINCT FROM 'ativo' OR v_prof_deleted IS NOT NULL THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','professor inativo/excluído');
        CONTINUE;
      END IF;
    END IF;

    SELECT id INTO v_slot_id FROM school_time_slots
     WHERE school_id=v_school AND weekday=v_weekday
       AND start_time=v_start AND end_time=v_end LIMIT 1;
    IF v_slot_id IS NULL THEN
      INSERT INTO school_time_slots (organization_id, school_id, weekday, slot_number, start_time, end_time, label)
      VALUES (v_org, v_school, v_weekday, v_slot_number, v_start, v_end, v_label)
      RETURNING id INTO v_slot_id;
      v_slots_upserted := v_slots_upserted + 1;
    END IF;

    SELECT id INTO v_class_group_id FROM class_groups
     WHERE school_id=v_school AND course_id=r.course_id
       AND nome=r.class_nome AND ano_letivo=p_ano_letivo LIMIT 1;
    IF v_class_group_id IS NULL THEN CONTINUE; END IF;

    IF array_length(v_subject_set,1) IS NULL THEN
      v_subject_set := ARRAY[NULL::uuid];
    END IF;

    FOREACH v_sid IN ARRAY v_subject_set LOOP
      v_combo_key := v_class_group_id::text || '|' || v_weekday::text || '|' || v_start::text || '|' || v_end::text || '|' || COALESCE(v_sid::text,'NULL');
      IF v_processed_combos ? v_combo_key THEN
        CONTINUE;
      END IF;
      v_processed_combos := v_processed_combos || jsonb_build_object(v_combo_key, true);

      v_prof_total_ch := COALESCE((
        SELECT SUM(EXTRACT(EPOCH FROM (m.end_time - m.start_time))/3600.0)
          FROM weekly_teaching_models m
         WHERE m.professor_id = v_professor_id
           AND m.school_id = v_school
           AND m.schedule_type = 'CLASS' AND m.status = 'ACTIVE'
      ),0);
      IF v_professor_id IS NOT NULL AND v_prof_total_ch + v_row_h > v_teto THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','teto semanal excedido','prof', v_professor_id);
        CONTINUE;
      END IF;

      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, school_id, course_id, class_group_id, subject_id,
          professor_id, schedule_type, weekday, start_time, end_time, status, class_mode
        ) VALUES (
          v_org, v_school, r.course_id, v_class_group_id, v_sid,
          v_professor_id, 'CLASS', v_weekday, v_start, v_end, 'ACTIVE', v_class_mode
        ) RETURNING id INTO v_model_id;
        v_models_upserted := v_models_upserted + 1;
        v_model_ids := v_model_ids || v_model_id;
        IF v_class_mode = 'ANP' THEN v_aulas_anp := v_aulas_anp + 1; END IF;
        IF v_professor_id IS NOT NULL THEN
          v_active_pairs := v_active_pairs || jsonb_build_object('p', v_professor_id, 'c', r.course_id);
        END IF;
      EXCEPTION
        WHEN unique_violation THEN NULL;
        WHEN OTHERS THEN
          v_aulas_ignoradas := v_aulas_ignoradas + 1;
          v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', SQLERRM);
      END;
    END LOOP;
  END LOOP;

  -- Planejamento (PL) por professor: max(1, round(CH/3))
  FOR prof IN
    SELECT DISTINCT m.professor_id, m.course_id
      FROM weekly_teaching_models m
     WHERE m.school_id = v_school AND m.schedule_type='CLASS' AND m.status='ACTIVE'
       AND m.professor_id IS NOT NULL
  LOOP
    SELECT count(*) INTO v_target
      FROM weekly_teaching_models m
     WHERE m.school_id=v_school AND m.schedule_type='CLASS' AND m.status='ACTIVE'
       AND m.professor_id=prof.professor_id;
    v_target := GREATEST(1, ROUND(v_target/3.0));
    SELECT count(*) INTO v_already
      FROM weekly_teaching_models m
     WHERE m.school_id=v_school AND m.schedule_type='PLANNING' AND m.status='ACTIVE'
       AND m.professor_id=prof.professor_id;
    v_to_create := GREATEST(0, v_target - v_already);

    WHILE v_to_create > 0 LOOP
      SELECT sts.weekday, sts.start_time, sts.end_time INTO free_slot
        FROM school_time_slots sts
       WHERE sts.school_id=v_school
         AND NOT EXISTS (
           SELECT 1 FROM weekly_teaching_models x
            WHERE x.school_id=v_school AND x.status='ACTIVE'
              AND x.weekday=sts.weekday AND x.start_time=sts.start_time AND x.end_time=sts.end_time
              AND x.professor_id=prof.professor_id
         )
       ORDER BY sts.weekday, sts.start_time
       LIMIT 1;
      IF free_slot.weekday IS NULL THEN
        v_pl_failed_no_slot := v_pl_failed_no_slot + 1;
        EXIT;
      END IF;
      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, school_id, course_id, class_group_id, subject_id,
          professor_id, schedule_type, weekday, start_time, end_time, status
        ) VALUES (
          v_org, v_school, prof.course_id, NULL, NULL,
          prof.professor_id, 'PLANNING', free_slot.weekday, free_slot.start_time, free_slot.end_time, 'ACTIVE'
        ) RETURNING id INTO v_pl_model_id;
        v_planning_created := v_planning_created + 1;
        v_planning_model_ids := v_planning_model_ids || v_pl_model_id;
        v_to_create := v_to_create - 1;
      EXCEPTION WHEN OTHERS THEN
        v_pl_failed_no_slot := v_pl_failed_no_slot + 1;
      END;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_active_pairs) > 0 THEN
    FOR bind IN
      SELECT DISTINCT (elem->>'p')::uuid AS professor_id, (elem->>'c')::uuid AS course_id
        FROM jsonb_array_elements(v_active_pairs) elem
    LOOP
      SELECT id INTO v_existing_binding_id FROM professor_school_courses
       WHERE professor_id=bind.professor_id AND school_id=v_school AND course_id=bind.course_id LIMIT 1;
      IF v_existing_binding_id IS NULL THEN
        INSERT INTO professor_school_courses (organization_id, professor_id, school_id, course_id, status)
        VALUES (v_org, bind.professor_id, v_school, bind.course_id, 'ACTIVE');
        v_bindings_upserted := v_bindings_upserted + 1;
      ELSE
        UPDATE professor_school_courses SET status='ACTIVE', updated_at=now() WHERE id=v_existing_binding_id;
      END IF;
    END LOOP;
  END IF;

  -- ========================================================================
  -- Geração das ocorrências anuais (annual_class_occurrences)
  -- Cruza weekly_teaching_models ACTIVE desta escola com dias LETIVO do calendário,
  -- respeitando o semestre da disciplina (FIRST=bim 1-2, SECOND=bim 3-4, ANNUAL/null=ano todo).
  -- ========================================================================
  IF v_calendar_id IS NOT NULL AND COALESCE(p_generate_occurrences, true) THEN
    DELETE FROM annual_class_occurrences
     WHERE organization_id = v_org
       AND weekly_model_id IN (
         SELECT id FROM weekly_teaching_models
          WHERE school_id = v_school AND status = 'ACTIVE'
       );
    GET DIAGNOSTICS v_occ_deleted = ROW_COUNT;

    WITH wm AS (
      SELECT m.id AS model_id, m.weekday, m.start_time, m.end_time, m.observation,
             CASE m.weekday
               WHEN 'SEGUNDA' THEN 1 WHEN 'TERCA' THEN 2 WHEN 'QUARTA' THEN 3
               WHEN 'QUINTA'  THEN 4 WHEN 'SEXTA' THEN 5
             END AS dow,
             CASE
               WHEN m.subject_id IS NULL THEN 'ANNUAL'
               ELSE COALESCE((SELECT s.semester::text FROM subjects s WHERE s.id = m.subject_id), 'ANNUAL')
             END AS sem
        FROM weekly_teaching_models m
       WHERE m.school_id = v_school AND m.status = 'ACTIVE'
    ),
    days AS (
      SELECT event_date FROM calendar_events
       WHERE calendar_id = v_calendar_id AND event_type = 'LETIVO'
    ),
    ins AS (
      INSERT INTO annual_class_occurrences (
        organization_id, weekly_model_id, occurrence_date,
        start_time, end_time, status, observation
      )
      SELECT v_org, wm.model_id, d.event_date,
             wm.start_time, wm.end_time, 'SCHEDULED', wm.observation
        FROM wm
        JOIN days d ON EXTRACT(ISODOW FROM d.event_date)::int = wm.dow
       WHERE (
               wm.sem = 'ANNUAL'
            OR (wm.sem = 'FIRST'  AND v_b2_end IS NOT NULL AND d.event_date <= v_b2_end)
            OR (wm.sem = 'SECOND' AND v_b2_end IS NOT NULL AND d.event_date >  v_b2_end)
            OR (v_b2_end IS NULL)
           )
       ON CONFLICT DO NOTHING
       RETURNING 1
    )
    SELECT count(*) INTO v_occurrences_created FROM ins;
  END IF;

  SELECT count(DISTINCT class_group_id), count(*) INTO v_total_classes, v_total_slots
    FROM weekly_teaching_models
   WHERE school_id=v_school AND schedule_type='CLASS' AND status='ACTIVE';

  RETURN jsonb_build_object(
    'ok', true,
    'school', v_school_name,
    'ano_letivo', p_ano_letivo,
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_anp', v_aulas_anp,
    'aulas_ignoradas', v_aulas_ignoradas,
    'planning_created', v_planning_created,
    'planning_deficit', v_pl_failed_no_slot,
    'occurrences_created', v_occurrences_created,
    'bindings_upserted', v_bindings_upserted,
    'bindings_deactivated', v_bindings_deactivated,
    'notifications_sent', v_notifications_sent,
    'resolved_professors', v_resolved_count,
    'motivos', v_motivos,
    'preplanning_seed', v_preplanning_seed,
    'total_classes', v_total_classes,
    'total_slots', v_total_slots
  );
END;
$function$;