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
      SELECT COALESCE(SUM(slot_h),0)::numeric INTO v_total_h
        FROM (
          SELECT DISTINCT weekday, start_time, end_time, school_id, class_group_id, class_mode,
                 CASE WHEN COALESCE(class_mode,'PRESENCIAL') = 'ANP' THEN 1.0
                      ELSE EXTRACT(EPOCH FROM (end_time-start_time))/3600.0 END AS slot_h
            FROM weekly_teaching_models
           WHERE professor_id = v_professor_id AND status='ACTIVE'
             AND (school_id <> v_school OR class_group_id <> ALL(coalesce(v_class_group_ids,ARRAY[]::uuid[])))
        ) u;
      v_slot_key := v_weekday::text || '|' || v_start::text || '|' || v_end::text || '|' || coalesce(r.indication_class_id::text,'');
      IF NOT (v_per_prof_slots ? (v_professor_id::text || '::' || v_slot_key)) THEN
        v_per_prof_slots := v_per_prof_slots || jsonb_build_object(v_professor_id::text || '::' || v_slot_key, v_row_h);
        v_total_h := v_total_h + COALESCE((v_per_prof->>v_professor_id::text)::numeric,0) + v_row_h;
        v_per_prof := jsonb_set(v_per_prof, ARRAY[v_professor_id::text], to_jsonb(COALESCE((v_per_prof->>v_professor_id::text)::numeric,0) + v_row_h));
      ELSE
        v_total_h := v_total_h + COALESCE((v_per_prof->>v_professor_id::text)::numeric,0);
      END IF;
      IF v_total_h > v_teto THEN
        v_aulas_ignoradas := v_aulas_ignoradas + 1;
        v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','excede teto CH', 'teto', v_teto, 'total_horas', v_total_h);
        CONTINUE;
      END IF;
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

  -- PL = max(1, round(soma_CH_horas / 3))
  FOR prof IN
    SELECT professor_id,
           ROUND(SUM(slot_h * weight)::numeric, 4) AS total_h_eff
      FROM (
        SELECT DISTINCT wtm.professor_id, wtm.weekday, wtm.start_time, wtm.end_time,
               wtm.class_group_id, wtm.subject_id, wtm.class_mode,
               CASE WHEN COALESCE(wtm.class_mode,'PRESENCIAL') = 'ANP' THEN 1.0
                    ELSE EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 END AS slot_h,
               COALESCE((
                 SELECT count(*)::numeric / 4.0
                   FROM hr_link_subject_bimester_filter f
                  WHERE f.external_link_id = p_link_id
                    AND f.subject_id = wtm.subject_id
                    AND f.enabled = true
               ), 1.0) AS weight
          FROM weekly_teaching_models wtm
         WHERE wtm.school_id=v_school AND wtm.schedule_type='CLASS' AND wtm.status='ACTIVE'
           AND wtm.professor_id IS NOT NULL
       ) u
      GROUP BY professor_id
      HAVING SUM(slot_h * weight) > 0
      ORDER BY SUM(slot_h * weight) DESC
   LOOP
     v_target := GREATEST(1, ROUND(prof.total_h_eff / 3.0))::int;

     SELECT count(*)::int INTO v_already FROM (
       SELECT DISTINCT weekday, start_time, end_time
         FROM weekly_teaching_models
        WHERE professor_id=prof.professor_id AND school_id=v_school
          AND schedule_type='PLANNING' AND status='ACTIVE'
     ) u;
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
           FROM (
             SELECT DISTINCT weekday, start_time, end_time
               FROM weekly_teaching_models
              WHERE professor_id=prof.professor_id AND school_id=v_school
                AND schedule_type='CLASS' AND status='ACTIVE'
           ) us
       ) s;
     v_predominant_shift := COALESCE(v_predominant_shift,'MORNING');
     v_shift_label := CASE v_predominant_shift
                        WHEN 'MORNING' THEN 'manhã'
                        WHEN 'AFTERNOON' THEN 'tarde'
                        ELSE 'noite' END;

     SELECT COALESCE(SUM(slot_h),0)::numeric
       INTO v_prof_total_ch
       FROM (
         SELECT DISTINCT weekday, start_time, end_time, school_id, class_group_id, schedule_type, class_mode,
                CASE WHEN COALESCE(class_mode,'PRESENCIAL') = 'ANP' THEN 1.0
                     ELSE EXTRACT(EPOCH FROM (end_time-start_time))/3600.0 END AS slot_h
           FROM weekly_teaching_models
          WHERE professor_id=prof.professor_id AND status='ACTIVE'
       ) up;

    -- Constrói o universo de candidatos: para cada (start_time,end_time) DISTINTO
    -- existente nos school_time_slots da escola dentro do turno predominante,
    -- expande para TODOS os 5 dias úteis (SEGUNDA..SEXTA). Se o slot ainda não
    -- existir em outro dia, será criado on-the-fly antes do INSERT do PL.
    FOR free_slot IN
      WITH shift_times AS (
        SELECT DISTINCT sts.start_time, sts.end_time
          FROM school_time_slots sts
         WHERE sts.school_id=v_school AND sts.status='ACTIVE'
           AND (
             (v_predominant_shift='MORNING'   AND sts.start_time < v_shift_morning_end) OR
             (v_predominant_shift='AFTERNOON' AND sts.start_time >= v_shift_morning_end AND sts.start_time < v_shift_afternoon_end) OR
             (v_predominant_shift='NIGHT'     AND sts.start_time >= v_shift_afternoon_end)
           )
      ),
      week_days AS (
        SELECT unnest(ARRAY['SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA']::weekday[]) AS wd
      ),
      candidates AS (
        SELECT wd.wd AS weekday, st.start_time, st.end_time
          FROM week_days wd CROSS JOIN shift_times st
      )
      SELECT c.weekday, c.start_time, c.end_time,
             EXTRACT(EPOCH FROM (c.end_time-c.start_time))/3600.0 AS slot_h,
             (SELECT count(*) FROM (
                SELECT DISTINCT weekday, start_time, end_time
                  FROM weekly_teaching_models w2
                 WHERE w2.professor_id=prof.professor_id AND w2.status='ACTIVE'
                   AND w2.weekday=c.weekday) wd) AS day_load,
             CASE WHEN EXISTS (
                    SELECT 1 FROM weekly_teaching_models wd2
                     WHERE wd2.professor_id=prof.professor_id AND wd2.status='ACTIVE'
                       AND wd2.school_id=v_school AND wd2.schedule_type='CLASS'
                       AND wd2.weekday=c.weekday
                  ) THEN 0 ELSE 1 END AS same_day_rank,
             CASE WHEN EXISTS (SELECT 1 FROM weekly_teaching_models o
                                WHERE o.school_id=v_school AND o.status='ACTIVE'
                                  AND o.weekday=c.weekday AND o.start_time=c.start_time AND o.end_time=c.end_time)
                  THEN 1 ELSE 0 END AS occupancy_rank
        FROM candidates c
       WHERE NOT EXISTS (SELECT 1 FROM weekly_teaching_models cf
                          WHERE cf.professor_id=prof.professor_id AND cf.status='ACTIVE'
                            AND cf.weekday=c.weekday
                            AND cf.start_time < c.end_time AND cf.end_time > c.start_time)
       ORDER BY same_day_rank ASC, occupancy_rank ASC, day_load ASC, c.weekday, c.start_time
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

      -- Garante school_time_slot para (weekday,start,end). Cria se ausente.
      SELECT id INTO v_new_slot_id FROM school_time_slots
       WHERE school_id=v_school AND weekday=free_slot.weekday
         AND start_time=free_slot.start_time AND end_time=free_slot.end_time
         AND status='ACTIVE' LIMIT 1;
      IF v_new_slot_id IS NULL THEN
        BEGIN
          INSERT INTO school_time_slots (
            organization_id, school_id, weekday, slot_number, slot_label, start_time, end_time, status)
          VALUES (
            v_org, v_school, free_slot.weekday, 1,
            to_char(free_slot.start_time,'HH24:MI') || '–' || to_char(free_slot.end_time,'HH24:MI'),
            free_slot.start_time, free_slot.end_time, 'ACTIVE')
          RETURNING id INTO v_new_slot_id;
          v_slots_upserted := v_slots_upserted + 1;
        EXCEPTION WHEN OTHERS THEN
          v_motivos := v_motivos || jsonb_build_object(
            'professor_id', prof.professor_id,
            'reason', 'erro ao criar school_time_slot para PL',
            'detail', SQLERRM);
          CONTINUE;
        END;
      END IF;

      BEGIN
        INSERT INTO weekly_teaching_models (
          organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
          weekday, start_time, end_time, status, schedule_type, school_time_slot_id, class_mode)
        VALUES (v_org, prof.professor_id, v_school, NULL, NULL, NULL,
          free_slot.weekday, free_slot.start_time, free_slot.end_time,
          'ACTIVE','PLANNING', v_new_slot_id, 'PRESENCIAL')
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
          'slot_id', v_new_slot_id
        );
      END;
    END LOOP;
    IF v_to_create > 0 THEN
      v_planning_deficit := v_planning_deficit + v_to_create;
      v_motivos := v_motivos || jsonb_build_object(
        'professor_id', prof.professor_id,
        'reason','PL insuficiente — sem horário livre no turno ' || v_shift_label,
        'turno', v_predominant_shift,
        'target', v_target,
        'criados', v_target - v_to_create);
    END IF;
  END LOOP;

  FOR bind IN
    SELECT professor_id, course_id,
      ROUND(SUM(CASE WHEN start_time < v_shift_morning_end THEN slot_h ELSE 0 END)::numeric,2) AS morning_h,
      ROUND(SUM(CASE WHEN start_time >= v_shift_morning_end AND start_time < v_shift_afternoon_end THEN slot_h ELSE 0 END)::numeric,2) AS afternoon_h,
      ROUND(SUM(CASE WHEN start_time >= v_shift_afternoon_end THEN slot_h ELSE 0 END)::numeric,2) AS night_h
      FROM (
        SELECT DISTINCT wtm.professor_id, wtm.course_id, wtm.weekday, wtm.start_time, wtm.end_time, wtm.class_group_id, wtm.class_mode,
               CASE WHEN COALESCE(wtm.class_mode,'PRESENCIAL') = 'ANP' THEN 1.0
                    ELSE EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 END AS slot_h
          FROM weekly_teaching_models wtm
         WHERE wtm.school_id=v_school AND wtm.status='ACTIVE'
           AND wtm.schedule_type='CLASS' AND wtm.professor_id IS NOT NULL AND wtm.course_id IS NOT NULL
           AND wtm.class_group_id = ANY(v_class_group_ids)
      ) ub
     GROUP BY professor_id, course_id
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
      v_bindings_upserted := v_bindings_upserted + 1;
    ELSE
      UPDATE professor_school_courses
         SET status='ACTIVE',
             workload_morning_hours = bind.morning_h,
             workload_afternoon_hours = bind.afternoon_h,
             workload_night_hours = bind.night_h,
             workload_filled_at = now(),
             updated_at = now()
       WHERE id = v_existing_binding_id;
      v_bindings_upserted := v_bindings_upserted + 1;
    END IF;
  END LOOP;

  UPDATE professor_school_courses
     SET status='INACTIVE', updated_at=now()
   WHERE school_id = v_school
     AND status = 'ACTIVE'
     AND NOT EXISTS (
       SELECT 1 FROM weekly_teaching_models wtm
        WHERE wtm.professor_id = professor_school_courses.professor_id
          AND wtm.school_id = v_school
          AND wtm.course_id = professor_school_courses.course_id
          AND wtm.schedule_type='CLASS' AND wtm.status='ACTIVE'
          AND wtm.class_group_id = ANY(v_class_group_ids)
     );
  GET DIAGNOSTICS v_bindings_deactivated = ROW_COUNT;

  IF p_generate_occurrences AND v_calendar_id IS NOT NULL AND array_length(v_model_ids,1) IS NOT NULL THEN
    FOR v_model_id IN SELECT unnest(v_model_ids)
    LOOP
      PERFORM public.generate_annual_occurrences(v_model_id, v_cal_start, v_cal_end);
    END LOOP;
    v_occurrences_created := array_length(v_model_ids,1);

    WITH del AS (
      DELETE FROM annual_class_occurrences ao
       USING weekly_teaching_models wtm,
             academic_bimesters ab,
             hr_link_subject_bimester_filter f
       WHERE ao.weekly_model_id = wtm.id
         AND wtm.id = ANY(v_model_ids)
         AND wtm.subject_id IS NOT NULL
         AND ab.calendar_id = v_calendar_id
         AND ao.occurrence_date BETWEEN ab.start_date AND ab.end_date
         AND f.external_link_id = p_link_id
         AND f.subject_id = wtm.subject_id
         AND f.bimester = ab.number
         AND f.enabled = false
      RETURNING 1
    )
    SELECT count(*) INTO v_occ_deleted FROM del;
  END IF;

  IF array_length(v_planning_model_ids,1) IS NOT NULL AND v_calendar_id IS NOT NULL THEN
    FOR v_model_id IN SELECT unnest(v_planning_model_ids)
    LOOP
      PERFORM public.generate_annual_occurrences(v_model_id, v_cal_start, v_cal_end);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'school_id', v_school,
    'school_nome', v_school_name,
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_anp', v_aulas_anp,
    'aulas_ignoradas', v_aulas_ignoradas,
    'planning_created', v_planning_created,
    'planning_deficit', v_planning_deficit,
    'occurrences_created', v_occurrences_created,
    'occurrences_skipped_by_filter', v_occ_deleted,
    'bindings_upserted', v_bindings_upserted,
    'bindings_deactivated', v_bindings_deactivated,
    'notifications_sent', v_notifications_sent,
    'resolved_count', v_resolved_count,
    'motivos', v_motivos,
    'preplanning_seed', v_preplanning_seed,
    'class_group_ids', to_jsonb(v_class_group_ids),
    'model_ids', to_jsonb(v_model_ids));
END;
$function$;