CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(p_link_id uuid, p_ano_letivo text, p_generate_occurrences boolean DEFAULT false)
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
  v_per_prof jsonb := '{}'::jsonb;
  v_shift_morning_end time; v_shift_afternoon_end time;
  v_existing_with_history int;
  v_first uuid; v_second uuid; v_annual uuid;
  v_subject_set uuid[]; v_sid uuid;
  v_existing_binding_id uuid;
  v_resolved_count int := 0;
  v_prof_total_ch numeric;
  v_predominant_shift text;
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

  PERFORM pg_advisory_xact_lock(hashtextextended(p_link_id::text, 0));

  SELECT count(*) INTO v_total FROM hr_school_indications WHERE external_link_id = p_link_id;
  SELECT count(*) INTO v_aprovadas FROM hr_school_indications WHERE external_link_id = p_link_id AND status = 'APROVADA';
  SELECT count(*) INTO v_pendentes FROM hr_school_indications WHERE external_link_id = p_link_id AND status IN ('PENDENTE','EM_ANALISE');
  SELECT count(*) INTO v_recusadas FROM hr_school_indications WHERE external_link_id = p_link_id AND status = 'RECUSADA';
  IF v_total = 0 THEN RAISE EXCEPTION 'Não há indicações neste link para materializar'; END IF;
  IF v_pendentes > 0 OR v_recusadas > 0 THEN
    RAISE EXCEPTION 'Existem % indicação(ões) pendente(s) e % recusada(s).', v_pendentes, v_recusadas;
  END IF;

  SELECT COALESCE(teto_ch_semanal,24)::numeric,
         COALESCE(shift_morning_end,'12:00'::time),
         COALESCE(shift_afternoon_end,'18:00'::time)
    INTO v_teto, v_shift_morning_end, v_shift_afternoon_end
    FROM hr_settings WHERE organization_id = v_org LIMIT 1;
  v_teto := COALESCE(v_teto, 24);
  v_shift_morning_end := COALESCE(v_shift_morning_end, '12:00');
  v_shift_afternoon_end := COALESCE(v_shift_afternoon_end, '18:00');

  SELECT id, start_date, end_date INTO v_calendar_id, v_cal_start, v_cal_end
    FROM academic_calendars
   WHERE organization_id = v_org AND status = 'ACTIVE' LIMIT 1;

  IF v_calendar_id IS NOT NULL THEN
    SELECT end_date INTO v_b2_end FROM academic_bimesters
     WHERE calendar_id = v_calendar_id AND number = 2 LIMIT 1;
    IF v_b2_end IS NULL THEN
      v_b2_end := v_cal_start + ((v_cal_end - v_cal_start) / 2);
    END IF;
  END IF;

  IF p_generate_occurrences AND v_calendar_id IS NULL THEN
    v_motivos := v_motivos || jsonb_build_object('reason', 'Sem calendário ACTIVE — ocorrências não serão geradas');
  END IF;

  FOR r IN
    SELECT hc.course_id, hc.nome FROM hr_indication_classes hc WHERE hc.external_link_id = p_link_id
  LOOP
    SELECT id INTO v_class_group_id FROM class_groups
     WHERE school_id = v_school AND course_id = r.course_id
       AND nome = r.nome AND ano_letivo = p_ano_letivo LIMIT 1;
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
     AND class_group_id IS NULL AND subject_id IS NULL AND status = 'ACTIVE';

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
    v_row_h := EXTRACT(EPOCH FROM (v_end - v_start))/3600.0;
    v_slot_number := coalesce(NULLIF(regexp_replace(v_label,'^(\d+).*$','\1'),v_label)::int,1);
    v_class_mode := CASE WHEN coalesce((r.candidato_grade->>'is_anp')::boolean,false)
                          OR upper(coalesce(r.candidato_grade->>'class_mode','')) = 'ANP'
                         THEN 'ANP' ELSE 'PRESENCIAL' END;

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
      SELECT p.id INTO v_professor_id
        FROM professors p
        JOIN talent_pool_candidates t
          ON t.id = r.talent_pool_candidate_id
         AND t.organization_id = v_org
        LEFT JOIN profiles pr ON pr.user_id = p.user_id
       WHERE p.organization_id = v_org
         AND lower(p.full_name) = lower(coalesce(t.full_name,''))
         AND (
           lower(coalesce(pr.email,'')) = lower(coalesce(t.email,''))
           OR coalesce(p.phone,'') = coalesce(t.phone,'')
         )
       LIMIT 1;
    END IF;
    IF v_professor_id IS NULL THEN
      SELECT p.id INTO v_professor_id FROM professors p
       LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
       WHERE p.organization_id = v_org AND lower(p.full_name) = lower(coalesce(r.candidato_nome,''))
         AND (lower(coalesce(pr.email,'')) = lower(coalesce(r.candidato_email,''))
              OR coalesce(p.phone,'') = coalesce(r.candidato_telefone,'')) LIMIT 1;
    END IF;

    IF v_professor_id IS NOT NULL AND r.professor_id IS DISTINCT FROM v_professor_id THEN
      UPDATE hr_school_indications SET professor_id = v_professor_id WHERE id = r.id;
      v_resolved_count := v_resolved_count + 1;
    END IF;

    IF v_professor_id IS NOT NULL THEN
      SELECT status::text, deleted_at, user_id INTO v_prof_status, v_prof_deleted, v_prof_user FROM professors WHERE id=v_professor_id;
      IF v_prof_deleted IS NOT NULL OR coalesce(v_prof_status,'ACTIVE') <> 'ACTIVE' THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object(
          'indication_id', r.id,
          'reason', CASE WHEN v_prof_deleted IS NOT NULL THEN 'professor excluído'
                         ELSE 'professor com status ' || coalesce(v_prof_status,'desconhecido') END,
          'professor_id', v_professor_id,
          'professor_status', v_prof_status);
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM weekly_teaching_models conf
                  WHERE conf.professor_id = v_professor_id AND conf.status='ACTIVE'
                    AND conf.school_id <> v_school AND conf.weekday = v_weekday
                    AND conf.start_time < v_end AND conf.end_time > v_start) THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','conflito com aula em outra escola', 'professor_id', v_professor_id);
        CONTINUE;
      END IF;
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time-start_time))/3600.0),0)::numeric INTO v_total_h
        FROM weekly_teaching_models
       WHERE professor_id = v_professor_id AND status='ACTIVE'
         AND (school_id <> v_school OR class_group_id <> ALL(coalesce(v_class_group_ids,ARRAY[]::uuid[])));
      v_total_h := v_total_h + COALESCE((v_per_prof->>v_professor_id::text)::numeric,0) + v_row_h;
      IF v_total_h > v_teto THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','excede teto CH', 'teto', v_teto, 'total_horas', v_total_h);
        CONTINUE;
      END IF;
      v_per_prof := jsonb_set(v_per_prof, ARRAY[v_professor_id::text], to_jsonb(COALESCE((v_per_prof->>v_professor_id::text)::numeric,0) + v_row_h));
    END IF;

    SELECT id INTO v_slot_id FROM school_time_slots
     WHERE school_id=v_school AND weekday=v_weekday AND start_time=v_start AND end_time=v_end AND status='ACTIVE' LIMIT 1;
    IF v_slot_id IS NULL THEN
      BEGIN
        INSERT INTO school_time_slots (organization_id, school_id, weekday, slot_number, slot_label, start_time, end_time, status)
        VALUES (v_org, v_school, v_weekday, v_slot_number, v_label, v_start, v_end, 'ACTIVE')
        RETURNING id INTO v_slot_id;
        v_slots_upserted := v_slots_upserted + 1;
      EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_slot_id FROM school_time_slots
         WHERE school_id=v_school AND weekday=v_weekday AND status='ACTIVE'
           AND start_time <= v_start AND end_time >= v_end LIMIT 1;
        IF v_slot_id IS NULL THEN
          v_aulas_ignoradas := v_aulas_ignoradas + 1;
          v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','conflito de slot', 'label', v_label);
          CONTINUE;
        ELSE
          v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'info','slot_reused');
        END IF;
      END;
    END IF;

    SELECT cg.id INTO v_class_group_id FROM hr_indication_classes hc
      JOIN class_groups cg ON cg.school_id=v_school AND cg.course_id=hc.course_id
                          AND cg.nome=hc.nome AND cg.ano_letivo=p_ano_letivo
     WHERE hc.id = r.indication_class_id LIMIT 1;
    IF v_class_group_id IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','turma não encontrada');
      CONTINUE;
    END IF;

    IF array_length(v_subject_set,1) IS NULL THEN
      v_subject_set := ARRAY[NULL::uuid];
    END IF;

    FOREACH v_sid IN ARRAY v_subject_set
    LOOP
      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
          weekday, start_time, end_time, status, schedule_type, school_time_slot_id, class_mode
        ) VALUES (
          v_org, v_professor_id, v_school, r.course_id, v_class_group_id,
          v_sid, v_weekday, v_start, v_end, 'ACTIVE', 'CLASS', v_slot_id, v_class_mode
        ) RETURNING id INTO v_model_id;
        v_models_upserted := v_models_upserted + 1;
        IF v_class_mode = 'ANP' THEN v_aulas_anp := v_aulas_anp + 1; END IF;
        IF v_professor_id IS NOT NULL THEN
          v_model_ids := v_model_ids || v_model_id;
          v_active_pairs := v_active_pairs || jsonb_build_object('p', v_professor_id, 'c', r.course_id);
          IF v_sid IS NOT NULL THEN
            v_preplanning_seed := v_preplanning_seed || jsonb_build_object(
              'course_id', r.course_id, 'professor_id', v_professor_id, 'subject_id', v_sid);
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', SQLERRM, 'subject_id', v_sid);
      END;
    END LOOP;
  END LOOP;

  -- =============================================================
  -- BLOCO PL — Regra oficial: max(1, round(classes/3)) por professor×escola
  -- Conta TODAS as aulas ACTIVE do professor nesta escola (não só as da grade atual)
  -- Sem teto fixo. Alinha com src/features/grade-horaria/utils/planningRule.ts
  -- =============================================================
  FOR prof IN
    SELECT wtm.professor_id, count(*)::int AS class_count
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id=v_school AND wtm.schedule_type='CLASS' AND wtm.status='ACTIVE'
       AND wtm.professor_id IS NOT NULL
     GROUP BY wtm.professor_id
     ORDER BY count(*) DESC
  LOOP
    v_target := GREATEST(1, ROUND(prof.class_count::numeric / 3.0))::int;

    SELECT count(*)::int INTO v_already FROM weekly_teaching_models
     WHERE professor_id=prof.professor_id AND school_id=v_school
       AND schedule_type='PLANNING' AND status='ACTIVE';
    v_to_create := GREATEST(0, v_target - v_already);
    IF v_to_create=0 THEN CONTINUE; END IF;

    SELECT CASE
             WHEN m_h >= t_h AND m_h >= n_h THEN 'MORNING'
             WHEN t_h >= n_h THEN 'AFTERNOON'
             ELSE 'NIGHT' END
      INTO v_predominant_shift
      FROM (
        SELECT
          SUM(CASE WHEN start_time < v_shift_morning_end THEN 1 ELSE 0 END) AS m_h,
          SUM(CASE WHEN start_time >= v_shift_morning_end AND start_time < v_shift_afternoon_end THEN 1 ELSE 0 END) AS t_h,
          SUM(CASE WHEN start_time >= v_shift_afternoon_end THEN 1 ELSE 0 END) AS n_h
          FROM weekly_teaching_models
         WHERE professor_id=prof.professor_id AND school_id=v_school
           AND schedule_type='CLASS' AND status='ACTIVE'
      ) s;
    v_predominant_shift := COALESCE(v_predominant_shift,'MORNING');

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time-start_time))/3600.0),0)::numeric
      INTO v_prof_total_ch
      FROM weekly_teaching_models
     WHERE professor_id=prof.professor_id AND status='ACTIVE';

    FOR free_slot IN
      SELECT sts.id AS slot_id, sts.weekday, sts.start_time, sts.end_time,
             EXTRACT(EPOCH FROM (sts.end_time-sts.start_time))/3600.0 AS slot_h,
             (SELECT count(*) FROM weekly_teaching_models w2
               WHERE w2.professor_id=prof.professor_id AND w2.status='ACTIVE'
                 AND w2.weekday=sts.weekday) AS day_load,
             CASE
               WHEN v_predominant_shift='MORNING' AND sts.start_time < v_shift_morning_end THEN 0
               WHEN v_predominant_shift='AFTERNOON' AND sts.start_time >= v_shift_morning_end AND sts.start_time < v_shift_afternoon_end THEN 0
               WHEN v_predominant_shift='NIGHT' AND sts.start_time >= v_shift_afternoon_end THEN 0
               ELSE 1
             END AS shift_rank
        FROM school_time_slots sts
       WHERE sts.school_id=v_school AND sts.status='ACTIVE'
         AND NOT EXISTS (SELECT 1 FROM weekly_teaching_models o
                          WHERE o.school_id=v_school AND o.status='ACTIVE'
                            AND o.weekday=sts.weekday AND o.start_time=sts.start_time AND o.end_time=sts.end_time)
         AND NOT EXISTS (SELECT 1 FROM weekly_teaching_models c
                          WHERE c.professor_id=prof.professor_id AND c.status='ACTIVE'
                            AND c.weekday=sts.weekday
                            AND c.start_time < sts.end_time AND c.end_time > sts.start_time)
       ORDER BY shift_rank ASC, day_load ASC, sts.weekday, sts.start_time
       LIMIT v_to_create
    LOOP
      IF v_prof_total_ch + free_slot.slot_h > v_teto THEN
        v_motivos := v_motivos || jsonb_build_object(
          'professor_id', prof.professor_id,
          'reason', 'PL excederia teto CH',
          'teto', v_teto,
          'total_horas', v_prof_total_ch + free_slot.slot_h
        );
        EXIT;
      END IF;
      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
          weekday, start_time, end_time, status, schedule_type, school_time_slot_id, class_mode)
        VALUES (v_org, prof.professor_id, v_school, NULL, NULL, NULL,
          free_slot.weekday, free_slot.start_time, free_slot.end_time,
          'ACTIVE','PLANNING', free_slot.slot_id, 'PRESENCIAL')
        RETURNING id INTO v_pl_model_id;
        v_planning_created := v_planning_created + 1;
        v_to_create := v_to_create - 1;
        v_prof_total_ch := v_prof_total_ch + free_slot.slot_h;
        v_planning_model_ids := v_planning_model_ids || v_pl_model_id;
      EXCEPTION WHEN OTHERS THEN
        v_motivos := v_motivos || jsonb_build_object(
          'professor_id', prof.professor_id,
          'reason', 'erro ao criar PL',
          'detail', SQLERRM,
          'slot_id', free_slot.slot_id
        );
      END;
    END LOOP;
    IF v_to_create > 0 THEN
      v_planning_deficit := v_planning_deficit + v_to_create;
      v_motivos := v_motivos || jsonb_build_object('professor_id',prof.professor_id, 'reason','PL insuficiente','target',v_target,'criados',v_target-v_to_create);
    END IF;
  END LOOP;

  FOR bind IN
    SELECT wtm.professor_id, wtm.course_id,
      ROUND(SUM(CASE WHEN wtm.start_time < v_shift_morning_end THEN EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 ELSE 0 END)::numeric,2) AS morning_h,
      ROUND(SUM(CASE WHEN wtm.start_time >= v_shift_morning_end AND wtm.start_time < v_shift_afternoon_end THEN EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 ELSE 0 END)::numeric,2) AS afternoon_h,
      ROUND(SUM(CASE WHEN wtm.start_time >= v_shift_afternoon_end THEN EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 ELSE 0 END)::numeric,2) AS night_h
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id=v_school AND wtm.status='ACTIVE'
       AND wtm.schedule_type='CLASS' AND wtm.professor_id IS NOT NULL AND wtm.course_id IS NOT NULL
       AND wtm.class_group_id = ANY(v_class_group_ids)
     GROUP BY wtm.professor_id, wtm.course_id
  LOOP
    SELECT id INTO v_existing_binding_id
      FROM professor_school_courses
     WHERE professor_id = bind.professor_id
       AND school_id = v_school
       AND course_id = bind.course_id
     LIMIT 1;

    IF v_existing_binding_id IS NULL THEN
      INSERT INTO professor_school_courses (
        organization_id, professor_id, school_id, course_id, status,
        workload_morning_hours, workload_afternoon_hours, workload_night_hours, workload_filled_at)
      VALUES (
        v_org, bind.professor_id, v_school, bind.course_id, 'ACTIVE',
        bind.morning_h, bind.afternoon_h, bind.night_h, now());
    ELSE
      UPDATE professor_school_courses SET
        status = 'ACTIVE',
        workload_morning_hours = bind.morning_h,
        workload_afternoon_hours = bind.afternoon_h,
        workload_night_hours = bind.night_h,
        workload_filled_at = now(),
        unbind_reason = NULL,
        unbound_at = NULL,
        unbound_by = NULL
      WHERE id = v_existing_binding_id;
    END IF;
    v_bindings_upserted := v_bindings_upserted + 1;
  END LOOP;

  UPDATE professor_school_courses psc SET status='INACTIVE',
    unbind_reason=COALESCE(psc.unbind_reason,'auto: removido na materialização'),
    unbound_at=COALESCE(psc.unbound_at, now()), unbound_by=COALESCE(psc.unbound_by, v_user)
   WHERE psc.school_id=v_school AND psc.status='ACTIVE'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_active_pairs) ap
                      WHERE (ap->>'p')::uuid=psc.professor_id AND (ap->>'c')::uuid=psc.course_id);
  GET DIAGNOSTICS v_bindings_deactivated = ROW_COUNT;

  IF p_generate_occurrences AND v_calendar_id IS NOT NULL THEN
    WITH all_models AS (
      SELECT id FROM weekly_teaching_models WHERE id = ANY(v_model_ids)
      UNION ALL SELECT id FROM weekly_teaching_models WHERE id = ANY(v_planning_model_ids)),
    model_data AS (
      SELECT wtm.id, wtm.weekday, wtm.start_time, wtm.end_time, wtm.subject_id,
             s.semester::text AS subj_semester,
             CASE wtm.weekday WHEN 'SEGUNDA' THEN 1 WHEN 'TERCA' THEN 2 WHEN 'QUARTA' THEN 3
               WHEN 'QUINTA' THEN 4 WHEN 'SEXTA' THEN 5 END AS dow
        FROM weekly_teaching_models wtm
        JOIN all_models am ON am.id = wtm.id
        LEFT JOIN subjects s ON s.id = wtm.subject_id),
    letivo AS (SELECT event_date FROM calendar_events WHERE calendar_id=v_calendar_id AND event_type='LETIVO'),
    to_insert AS (
      SELECT v_org AS organization_id, md.id AS weekly_model_id, l.event_date AS occurrence_date,
             md.start_time, md.end_time, 'SCHEDULED'::text AS status
        FROM model_data md
        JOIN letivo l ON EXTRACT(DOW FROM l.event_date)::int = md.dow
       WHERE md.subj_semester IS NULL OR md.subj_semester='ANNUAL'
          OR (md.subj_semester='FIRST' AND l.event_date <= v_b2_end)
          OR (md.subj_semester='SECOND' AND l.event_date > v_b2_end))
    INSERT INTO annual_class_occurrences (organization_id, weekly_model_id, occurrence_date, start_time, end_time, status)
    SELECT organization_id, weekly_model_id, occurrence_date, start_time, end_time, status::text::occurrence_status FROM to_insert
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_occurrences_created = ROW_COUNT;
    IF v_occurrences_created = 0 THEN
      v_motivos := v_motivos || jsonb_build_object('reason','calendário sem dias LETIVO compatíveis');
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, reference_id)
  SELECT DISTINCT p.user_id,
         'Nova grade horária — ' || COALESCE(v_school_name,'Escola'),
         'Você recebeu aulas na escola ' || COALESCE(v_school_name,'(sem nome)') || ' para ' || p_ano_letivo || '. Acesse sua grade para conferir.',
         'GENERAL', p_link_id
    FROM weekly_teaching_models wtm
    JOIN professors p ON p.id = wtm.professor_id
   WHERE wtm.school_id=v_school AND wtm.status='ACTIVE'
     AND wtm.schedule_type IN ('CLASS','PLANNING')
     AND wtm.professor_id IS NOT NULL AND p.user_id IS NOT NULL
     AND (wtm.id = ANY(v_model_ids) OR wtm.id = ANY(v_planning_model_ids));
  GET DIAGNOSTICS v_notifications_sent = ROW_COUNT;

  RETURN jsonb_build_object(
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_anp', v_aulas_anp,
    'aulas_ignoradas', v_aulas_ignoradas,
    'planning_created', v_planning_created,
    'planning_deficit', v_planning_deficit,
    'occurrences_created', v_occurrences_created,
    'bindings_upserted', v_bindings_upserted,
    'bindings_deactivated', v_bindings_deactivated,
    'notifications_sent', v_notifications_sent,
    'indications_resolved', v_resolved_count,
    'motivos', v_motivos
  );
END;
$function$;