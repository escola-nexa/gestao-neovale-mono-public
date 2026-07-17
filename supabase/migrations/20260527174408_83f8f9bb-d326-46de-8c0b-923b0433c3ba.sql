-- Recria materialize_grade_from_indications_internal apenas para
-- introduzir o pareamento automático UCP entre FIRST<->SECOND
-- (mesmo curso, mesma classe UCP1/UCP2/UCP3/PEDAGOGICA).
-- Restante da função idêntico à versão 20260527172150.

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT false,
  p_semester_scope text DEFAULT 'ALL'
)
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
  v_sem_key text;
  v_sid_semester text;
  v_scope text := COALESCE(upper(p_semester_scope), 'ALL');
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_ano_letivo IS NULL OR length(trim(p_ano_letivo)) = 0 THEN
    RAISE EXCEPTION 'Ano letivo é obrigatório';
  END IF;
  IF v_scope NOT IN ('ALL','FIRST','SECOND') THEN
    RAISE EXCEPTION 'Escopo de semestre inválido: % (use ALL, FIRST ou SECOND)', v_scope;
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
    FROM academic_calendars
   WHERE organization_id = v_org AND school_id = v_school AND ano_letivo = p_ano_letivo
   ORDER BY created_at DESC LIMIT 1;

  SELECT end_date INTO v_b2_end FROM academic_bimesters
   WHERE organization_id=v_org AND school_id=v_school AND ano_letivo=p_ano_letivo AND numero=2
   LIMIT 1;

  SELECT COUNT(*) FILTER (WHERE status='APROVADA'),
         COUNT(*) FILTER (WHERE status='PENDENTE'),
         COUNT(*) FILTER (WHERE status='RECUSADA'),
         COUNT(*)
    INTO v_aprovadas, v_pendentes, v_recusadas, v_total
    FROM hr_school_indications WHERE external_link_id = p_link_id;

  IF v_aprovadas = 0 THEN
    RAISE EXCEPTION 'GRADE_FALHA_TOTAL: nenhuma indicação APROVADA neste link (% pendente(s), % recusada(s), total %).',
      v_pendentes, v_recusadas, v_total;
  END IF;

  SELECT COUNT(*)::int INTO v_existing_with_history
    FROM weekly_teaching_models wtm
   WHERE wtm.school_id = v_school
     AND wtm.status = 'ACTIVE'
     AND wtm.schedule_type = 'CLASS'
     AND EXISTS (
       SELECT 1 FROM annual_class_occurrences ao
        WHERE ao.weekly_model_id = wtm.id
          AND ao.status IN ('OCCURRED','JUSTIFIED','PENDING_JUSTIFICATION'))
     AND (
       v_scope = 'ALL'
       OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = wtm.subject_id AND (s.semester::text = v_scope OR s.semester::text = 'ANNUAL'))
     );

  IF v_existing_with_history > 0 THEN
    RAISE EXCEPTION 'Esta grade já possui % planejamento(s) de aula vinculado(s) no escopo %. Reverta primeiro via unmaterialize_grade ou contate suporte.', v_existing_with_history, v_scope;
  END IF;

  -- Desativa weekly_teaching_models existentes APENAS do escopo solicitado.
  UPDATE weekly_teaching_models wtm
     SET status = 'INACTIVE', updated_at = now()
   WHERE wtm.school_id = v_school
     AND wtm.status = 'ACTIVE'
     AND wtm.schedule_type = 'CLASS'
     AND (
       v_scope = 'ALL'
       OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = wtm.subject_id AND (s.semester::text = v_scope OR s.semester::text = 'ANNUAL'))
       OR (wtm.subject_id IS NULL AND v_scope = 'ALL')
     );

  -- PLANNING: só recria do zero quando escopo=ALL ou SECOND (depois de gerar o 2º a grade está completa).
  IF v_scope IN ('ALL','SECOND') THEN
    UPDATE weekly_teaching_models SET status = 'INACTIVE', updated_at = now()
     WHERE school_id = v_school AND schedule_type = 'PLANNING'
       AND status = 'ACTIVE';
  END IF;

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

    -- =========================================================
    -- Pareamento automático UCP (FIRST <-> SECOND, mesmo curso,
    -- mesma classe UCP1/UCP2/UCP3/PEDAGOGICA). Se o diretor
    -- indicou apenas o lado FIRST, adiciona automaticamente a
    -- UCP par do SECOND (e vice-versa).
    -- =========================================================
    IF array_length(v_subject_set,1) IS NOT NULL THEN
      WITH have AS (
        SELECT s.id, s.semester::text AS sem, s.course_id,
          CASE
            WHEN s.nome ~* 'UCP\s*III' THEN 'UCP3'
            WHEN s.nome ~* 'UCP\s*II($|[^I])' THEN 'UCP2'
            WHEN s.nome ~* 'UCP\s*I($|[^I])' THEN 'UCP1'
            WHEN s.nome ~* '(empresa\s+pedag|pedag[oó]gica)' THEN 'PEDAG'
            ELSE NULL
          END AS ucp
        FROM unnest(v_subject_set) AS sid
        JOIN subjects s ON s.id = sid
        WHERE s.course_id = r.course_id
      ),
      pairs AS (
        SELECT DISTINCT s2.id AS new_id
          FROM have h
          JOIN subjects s2
            ON s2.course_id = h.course_id
           AND s2.id <> h.id
           AND s2.status = 'ativo'
           AND s2.deleted_at IS NULL
           AND s2.semester::text = CASE h.sem WHEN 'FIRST' THEN 'SECOND' WHEN 'SECOND' THEN 'FIRST' ELSE NULL END
           AND CASE
             WHEN s2.nome ~* 'UCP\s*III' THEN 'UCP3'
             WHEN s2.nome ~* 'UCP\s*II($|[^I])' THEN 'UCP2'
             WHEN s2.nome ~* 'UCP\s*I($|[^I])' THEN 'UCP1'
             WHEN s2.nome ~* '(empresa\s+pedag|pedag[oó]gica)' THEN 'PEDAG'
             ELSE NULL
           END = h.ucp
         WHERE h.ucp IS NOT NULL AND h.sem IN ('FIRST','SECOND')
      )
      SELECT array_agg(DISTINCT id) INTO v_subject_set
        FROM (
          SELECT unnest(v_subject_set) AS id
          UNION
          SELECT new_id FROM pairs WHERE new_id IS NOT NULL
        ) u
       WHERE id IS NOT NULL;
    END IF;

    -- Filtro por escopo de semestre
    IF v_scope <> 'ALL' AND array_length(v_subject_set,1) IS NOT NULL THEN
      SELECT array_agg(sid) INTO v_subject_set
        FROM unnest(v_subject_set) AS sid
       WHERE EXISTS (
         SELECT 1 FROM subjects s
          WHERE s.id = sid
            AND (s.semester::text = v_scope OR s.semester::text = 'ANNUAL')
       );
      IF v_subject_set IS NULL OR array_length(v_subject_set,1) IS NULL THEN
        CONTINUE;
      END IF;
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
      SELECT p.id INTO v_professor_id
        FROM professors p
        JOIN talent_pool_candidates t
          ON t.id = r.talent_pool_candidate_id
         AND (
           (t.email IS NOT NULL AND p.email IS NOT NULL AND lower(t.email) = lower(p.email))
           OR (t.cpf IS NOT NULL AND p.cpf IS NOT NULL AND regexp_replace(t.cpf,'\D','','g') = regexp_replace(p.cpf,'\D','','g'))
         )
       WHERE p.organization_id = v_org AND p.deleted_at IS NULL
       LIMIT 1;
    END IF;

    IF v_professor_id IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','professor não vinculado');
      CONTINUE;
    END IF;

    SELECT status, deleted_at, user_id INTO v_prof_status, v_prof_deleted, v_prof_user
      FROM professors WHERE id = v_professor_id;
    IF v_prof_status IS DISTINCT FROM 'ativo' OR v_prof_deleted IS NOT NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','professor inativo ou removido');
      CONTINUE;
    END IF;

    -- Turma
    IF r.indication_class_id IS NULL THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason','indicação sem turma');
      CONTINUE;
    END IF;

    SELECT id INTO v_class_group_id
      FROM class_groups
     WHERE organization_id=v_org AND school_id=v_school AND course_id=r.course_id
       AND nome = r.class_nome AND ano_letivo = p_ano_letivo AND deleted_at IS NULL
     LIMIT 1;
    IF v_class_group_id IS NULL THEN
      INSERT INTO class_groups (organization_id, school_id, course_id, nome, ano_letivo, status, created_by)
      VALUES (v_org, v_school, r.course_id, r.class_nome, p_ano_letivo, 'ACTIVE', v_user)
      RETURNING id INTO v_class_group_id;
      v_classes_upserted := v_classes_upserted + 1;
    END IF;
    IF NOT v_class_group_id = ANY(v_class_group_ids) THEN
      v_class_group_ids := v_class_group_ids || v_class_group_id;
    END IF;

    SELECT id INTO v_slot_id
      FROM school_time_slots
     WHERE organization_id=v_org AND school_id=v_school
       AND weekday=v_weekday AND start_time=v_start AND end_time=v_end AND deleted_at IS NULL
     LIMIT 1;
    IF v_slot_id IS NULL THEN
      INSERT INTO school_time_slots (organization_id, school_id, weekday, slot_number, start_time, end_time, label, created_by)
      VALUES (v_org, v_school, v_weekday, v_slot_number, v_start, v_end, v_label, v_user)
      RETURNING id INTO v_slot_id;
      v_slots_upserted := v_slots_upserted + 1;
    END IF;

    IF array_length(v_subject_set,1) IS NULL THEN
      v_subject_set := ARRAY[NULL::uuid];
    END IF;

    FOREACH v_sid IN ARRAY v_subject_set
    LOOP
      IF v_sid IS NULL THEN
        v_sid_semester := 'ANNUAL';
      ELSE
        BEGIN
          SELECT s.semester::text INTO v_sid_semester FROM subjects s WHERE s.id = v_sid;
        EXCEPTION WHEN OTHERS THEN
          v_sid_semester := 'ANNUAL';
        END;
      END IF;
      v_sem_key := v_class_group_id::text || '|' || v_weekday::text || '|' || v_start::text || '|' || v_end::text || '|SEM:' || COALESCE(v_sid_semester,'ANNUAL');
      IF v_processed_combos ? v_sem_key THEN CONTINUE; END IF;
      v_processed_combos := v_processed_combos || jsonb_build_object(v_sem_key, true);

      -- Dedup ABSOLUTO por (turma, slot, sid): mesmo se 2 indicações
      -- chegarem para o mesmo combo, só inserimos uma vez.
      IF EXISTS (
        SELECT 1 FROM weekly_teaching_models wtm
         WHERE wtm.organization_id=v_org AND wtm.school_id=v_school
           AND wtm.class_group_id=v_class_group_id AND wtm.school_time_slot_id=v_slot_id
           AND wtm.weekday=v_weekday AND wtm.start_time=v_start AND wtm.end_time=v_end
           AND wtm.professor_id=v_professor_id AND COALESCE(wtm.subject_id::text,'') = COALESCE(v_sid::text,'')
           AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
      ) THEN CONTINUE; END IF;

      INSERT INTO weekly_teaching_models (
        organization_id, school_id, class_group_id, school_time_slot_id,
        weekday, start_time, end_time, schedule_type,
        professor_id, subject_id, course_id, class_mode, status, created_by
      ) VALUES (
        v_org, v_school, v_class_group_id, v_slot_id,
        v_weekday, v_start, v_end, 'CLASS',
        v_professor_id, v_sid, r.course_id, v_class_mode, 'ACTIVE', v_user
      ) RETURNING id INTO v_model_id;
      v_models_upserted := v_models_upserted + 1;
      v_model_ids := v_model_ids || v_model_id;
      IF v_class_mode = 'ANP' THEN v_aulas_anp := v_aulas_anp + 1; END IF;
    END LOOP;
  END LOOP;

  -- Geração automática de PLANNING (1/3 da CH por professor×escola)
  IF v_scope IN ('ALL','SECOND') THEN
    FOR prof IN
      SELECT DISTINCT wtm.professor_id
        FROM weekly_teaching_models wtm
       WHERE wtm.school_id = v_school AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
         AND wtm.id = ANY(v_model_ids OR ARRAY[]::uuid[])
    LOOP
      NULL; -- placeholder, lógica real abaixo
    END LOOP;

    -- Considera TODOS os modelos CLASS ativos do professor na escola (FIRST+SECOND+ANNUAL).
    FOR prof IN
      SELECT DISTINCT wtm.professor_id, wtm.course_id, wtm.class_group_id
        FROM weekly_teaching_models wtm
       WHERE wtm.school_id = v_school AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
    LOOP
      SELECT COUNT(DISTINCT wtm2.class_group_id)
        INTO v_target
        FROM weekly_teaching_models wtm2
       WHERE wtm2.school_id = v_school AND wtm2.professor_id = prof.professor_id
         AND wtm2.status='ACTIVE' AND wtm2.schedule_type='CLASS';

      v_target := GREATEST(1, ROUND(v_target::numeric / 3.0)::int);

      SELECT COUNT(*) INTO v_already
        FROM weekly_teaching_models wtm
       WHERE wtm.school_id = v_school AND wtm.professor_id = prof.professor_id
         AND wtm.status='ACTIVE' AND wtm.schedule_type='PLANNING';
      v_to_create := GREATEST(0, v_target - v_already);

      IF v_to_create > 0 THEN
        SELECT course_id, class_group_id INTO v_pl_course_id, v_pl_class_group_id
          FROM weekly_teaching_models
         WHERE school_id = v_school AND professor_id = prof.professor_id
           AND status='ACTIVE' AND schedule_type='CLASS'
         ORDER BY created_at DESC LIMIT 1;

        FOR free_slot IN
          SELECT sts.id AS slot_id, sts.weekday, sts.start_time, sts.end_time
            FROM school_time_slots sts
           WHERE sts.school_id = v_school AND sts.deleted_at IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM weekly_teaching_models w
                WHERE w.school_id = v_school AND w.professor_id = prof.professor_id
                  AND w.weekday = sts.weekday AND w.start_time = sts.start_time AND w.end_time = sts.end_time
                  AND w.status='ACTIVE'
             )
             AND NOT EXISTS (
               SELECT 1 FROM weekly_teaching_models w2
                WHERE w2.professor_id = prof.professor_id AND w2.status='ACTIVE'
                  AND w2.weekday = sts.weekday AND w2.start_time = sts.start_time AND w2.end_time = sts.end_time
                  AND COALESCE(w2.class_mode,'PRESENCIAL') <> 'ANP'
             )
           ORDER BY sts.weekday, sts.start_time
           LIMIT v_to_create
        LOOP
          INSERT INTO weekly_teaching_models (
            organization_id, school_id, class_group_id, school_time_slot_id,
            weekday, start_time, end_time, schedule_type,
            professor_id, course_id, class_mode, status, created_by
          ) VALUES (
            v_org, v_school, v_pl_class_group_id, free_slot.slot_id,
            free_slot.weekday, free_slot.start_time, free_slot.end_time, 'PLANNING',
            prof.professor_id, v_pl_course_id, 'PRESENCIAL', 'ACTIVE', v_user
          ) RETURNING id INTO v_pl_model_id;
          v_planning_created := v_planning_created + 1;
          v_planning_model_ids := v_planning_model_ids || v_pl_model_id;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Vínculos professor x escola x curso
  FOR bind IN
    SELECT DISTINCT wtm.professor_id, wtm.course_id
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id = v_school AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
  LOOP
    SELECT id INTO v_existing_binding_id
      FROM professor_school_courses
     WHERE professor_id = bind.professor_id AND school_id = v_school AND course_id = bind.course_id
     LIMIT 1;

    IF v_existing_binding_id IS NULL THEN
      INSERT INTO professor_school_courses (
        organization_id, professor_id, school_id, course_id, status, created_by
      ) VALUES (v_org, bind.professor_id, v_school, bind.course_id, 'ACTIVE', v_user)
      RETURNING id INTO v_existing_binding_id;
      v_bindings_upserted := v_bindings_upserted + 1;
    ELSE
      UPDATE professor_school_courses
         SET status = 'ACTIVE',
             updated_at = now()
       WHERE id = v_existing_binding_id;
      v_bindings_upserted := v_bindings_upserted + 1;
    END IF;
  END LOOP;

  IF v_scope IN ('ALL','SECOND') THEN
    UPDATE professor_school_courses
       SET status='INACTIVE', updated_at=now()
     WHERE school_id = v_school AND status = 'ACTIVE'
       AND NOT EXISTS (
         SELECT 1 FROM weekly_teaching_models wtm
          WHERE wtm.professor_id = professor_school_courses.professor_id
            AND wtm.school_id = v_school AND wtm.course_id = professor_school_courses.course_id
            AND wtm.schedule_type='CLASS' AND wtm.status='ACTIVE'
            AND wtm.class_group_id = ANY(v_class_group_ids)
       );
    GET DIAGNOSTICS v_bindings_deactivated = ROW_COUNT;
  END IF;

  IF v_calendar_id IS NOT NULL THEN
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

  v_total_classes := COALESCE(array_length(v_class_group_ids,1), 0);
  SELECT COUNT(DISTINCT school_time_slot_id)::int INTO v_total_slots
    FROM weekly_teaching_models
   WHERE school_id = v_school AND status='ACTIVE'
     AND schedule_type IN ('CLASS','PLANNING')
     AND school_time_slot_id IS NOT NULL;

  IF v_models_upserted = 0 AND v_aprovadas > 0 THEN
    RAISE EXCEPTION 'GRADE_FALHA_TOTAL: nenhuma aula gerada no escopo % a partir de % indicação(ões) aprovada(s). Motivos: %', v_scope, v_aprovadas, v_motivos::text;
  END IF;

  -- Seed para auto pré-planejamentos
  SELECT jsonb_agg(jsonb_build_object('course_id', course_id, 'professor_id', professor_id, 'subject_id', subject_id))
    INTO v_preplanning_seed
    FROM (
      SELECT DISTINCT course_id, professor_id, subject_id
        FROM weekly_teaching_models
       WHERE school_id = v_school AND status='ACTIVE' AND schedule_type='CLASS'
         AND course_id IS NOT NULL AND professor_id IS NOT NULL AND subject_id IS NOT NULL
    ) t;

  RETURN jsonb_build_object(
    'school_id', v_school,
    'school_nome', v_school_name,
    'semester_scope', v_scope,
    'classes_upserted', v_total_classes,
    'slots_upserted', v_total_slots,
    'classes_created', v_classes_upserted,
    'slots_created', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_anp', v_aulas_anp,
    'aulas_ignoradas', v_aulas_ignoradas,
    'planning_created', v_planning_created,
    'planning_deficit', v_planning_deficit,
    'occurrences_created', v_occurrences_created,
    'occ_deleted', v_occ_deleted,
    'bindings_upserted', v_bindings_upserted,
    'bindings_deactivated', v_bindings_deactivated,
    'preplanning_seed', COALESCE(v_preplanning_seed, '[]'::jsonb),
    'motivos', v_motivos
  );
END;
$function$;