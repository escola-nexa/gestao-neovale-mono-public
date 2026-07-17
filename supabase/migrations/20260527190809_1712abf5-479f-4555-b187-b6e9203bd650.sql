CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(
  p_link_id uuid,
  p_ano_letivo int,
  p_generate_occurrences boolean DEFAULT true,
  p_semester_scope text DEFAULT 'ALL',
  p_planning_filter jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Delega para a versão anterior, mas sobrescreve target de PL para CH-based.
  -- Implementação: reutiliza tudo, exceto o cálculo de v_target dentro do loop PLANNING.
  -- Para manter coesão, redefinimos a função inteira abaixo via OR REPLACE secundário.
  RAISE EXCEPTION 'placeholder-should-not-run';
END;
$$;

-- Reescreve a função real com o cálculo CH-based.
CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications_internal(
  p_link_id uuid,
  p_ano_letivo int,
  p_generate_occurrences boolean DEFAULT true,
  p_semester_scope text DEFAULT 'ALL',
  p_planning_filter jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link record; v_org uuid; v_school uuid; v_course uuid;
  v_class_count int := 0; v_slot_count int := 0; v_models_created int := 0;
  v_occ_created int := 0; v_existing_binding_id uuid; v_binding_id uuid;
  v_planning_created int := 0; v_planning_deficit int := 0;
  v_pl_class_group_id uuid; v_pl_course_id uuid; v_pl_model_id uuid;
  v_anp_excluded int := 0;
  v_pl_breakdown jsonb := '[]'::jsonb;
  v_scope text := UPPER(COALESCE(p_semester_scope,'ALL'));
  v_planning_model_ids uuid[] := ARRAY[]::uuid[];
  v_preplanning_seed jsonb := '[]'::jsonb;
  v_pl_filter_map jsonb := '{}'::jsonb;
  v_pl_filter_enabled boolean;
  v_pl_filter_count int;
  v_skip_reason text;
  v_prof_nome text;
  rec record; cls record; ind record; slot record; sem text; free_slot record;
  bind record; week_offset int; occ_date date;
  prof record; v_target int; v_already int; v_to_create int; v_created_now int;
  v_ch_sum numeric;
BEGIN
  SELECT * INTO v_link FROM public.hr_school_indication_links WHERE id = p_link_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link % não encontrado', p_link_id; END IF;
  v_org := v_link.organization_id; v_school := v_link.school_id; v_course := v_link.course_id;

  IF v_scope NOT IN ('ALL','FIRST','SECOND') THEN v_scope := 'ALL'; END IF;

  IF p_planning_filter IS NOT NULL AND jsonb_typeof(p_planning_filter) = 'array' THEN
    SELECT COALESCE(jsonb_object_agg(elem->>'professor_id', elem), '{}'::jsonb)
      INTO v_pl_filter_map
      FROM jsonb_array_elements(p_planning_filter) elem
      WHERE elem ? 'professor_id';
  END IF;

  -- Desativa CLASS conforme escopo (mantém ANNUAL no SECOND)
  IF v_scope = 'ALL' THEN
    UPDATE weekly_teaching_models SET status='INACTIVE', updated_at=now()
     WHERE school_id = v_school AND schedule_type='CLASS' AND status='ACTIVE'
       AND course_id = v_course;
  ELSIF v_scope = 'FIRST' THEN
    UPDATE weekly_teaching_models w SET status='INACTIVE', updated_at=now()
     WHERE w.school_id = v_school AND w.schedule_type='CLASS' AND w.status='ACTIVE'
       AND w.course_id = v_course
       AND EXISTS (
         SELECT 1 FROM subjects s WHERE s.id = w.subject_id
           AND COALESCE(s.semester,'ANNUAL') IN ('FIRST','ANNUAL')
       );
  ELSIF v_scope = 'SECOND' THEN
    UPDATE weekly_teaching_models w SET status='INACTIVE', updated_at=now()
     WHERE w.school_id = v_school AND w.schedule_type='CLASS' AND w.status='ACTIVE'
       AND w.course_id = v_course
       AND EXISTS (
         SELECT 1 FROM subjects s WHERE s.id = w.subject_id
           AND COALESCE(s.semester,'ANNUAL') = 'SECOND'
       );
  END IF;

  -- Sempre desativa PLANNING — a regra recalcula com base nas CLASS ACTIVE atuais
  UPDATE weekly_teaching_models SET status='INACTIVE', updated_at=now()
   WHERE school_id = v_school AND schedule_type = 'PLANNING'
     AND status='ACTIVE' AND course_id = v_course;

  -- (Inserção de CLASS preservada: redirecionamos para a função auxiliar legada)
  -- Para evitar duplicar 200+ linhas, chamamos o materializador legado de CLASS apenas.
  PERFORM public._materialize_classes_only(p_link_id, v_scope);

  -- Recoleta contadores básicos
  SELECT count(*) INTO v_models_created FROM weekly_teaching_models
   WHERE school_id = v_school AND course_id = v_course AND status='ACTIVE' AND schedule_type='CLASS';

  -- PLANNING: gerar em QUALQUER escopo, baseado em CH semanal real (CH/3).
  FOR prof IN
    SELECT DISTINCT wtm.professor_id, p.full_name AS prof_nome
      FROM weekly_teaching_models wtm
      JOIN professors p ON p.id = wtm.professor_id
     WHERE wtm.school_id = v_school AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
       AND wtm.professor_id IS NOT NULL
  LOOP
    v_prof_nome := COALESCE(prof.prof_nome, 'Professor');

    v_pl_filter_enabled := TRUE;
    v_pl_filter_count := NULL;
    IF v_pl_filter_map ? (prof.professor_id::text) THEN
      v_pl_filter_enabled := COALESCE((v_pl_filter_map->prof.professor_id::text->>'enabled')::boolean, TRUE);
      v_pl_filter_count   := NULLIF(v_pl_filter_map->prof.professor_id::text->>'count','')::int;
    END IF;

    -- CH semanal: soma carga_horaria_semanal por (turma, disciplina) distintos
    SELECT COALESCE(SUM(s.carga_horaria_semanal), 0)
      INTO v_ch_sum
      FROM (
        SELECT DISTINCT wtm2.class_group_id, wtm2.subject_id
          FROM weekly_teaching_models wtm2
         WHERE wtm2.school_id = v_school AND wtm2.professor_id = prof.professor_id
           AND wtm2.status='ACTIVE' AND wtm2.schedule_type='CLASS'
           AND wtm2.subject_id IS NOT NULL
      ) pares
      JOIN subjects s ON s.id = pares.subject_id;

    IF v_ch_sum > 0 THEN
      v_target := GREATEST(1, ROUND(v_ch_sum / 3.0)::int);
    ELSE
      -- fallback antigo (turmas/3) caso não haja CH cadastrada
      SELECT COUNT(DISTINCT wtm2.class_group_id) INTO v_target
        FROM weekly_teaching_models wtm2
       WHERE wtm2.school_id = v_school AND wtm2.professor_id = prof.professor_id
         AND wtm2.status='ACTIVE' AND wtm2.schedule_type='CLASS';
      v_target := GREATEST(1, ROUND(v_target::numeric / 3.0)::int);
    END IF;

    IF v_pl_filter_count IS NOT NULL THEN
      v_target := GREATEST(0, v_pl_filter_count);
    END IF;

    IF NOT v_pl_filter_enabled THEN
      v_pl_breakdown := v_pl_breakdown || jsonb_build_object(
        'professor_id', prof.professor_id, 'professor_nome', v_prof_nome,
        'target', v_target, 'created', 0,
        'skipped_reason', 'desmarcado pelo administrador'
      );
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_already
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id = v_school AND wtm.professor_id = prof.professor_id
       AND wtm.status='ACTIVE' AND wtm.schedule_type='PLANNING';
    v_to_create := GREATEST(0, v_target - v_already);
    v_created_now := 0;
    v_skip_reason := NULL;

    IF v_to_create > 0 THEN
      SELECT course_id, class_group_id INTO v_pl_course_id, v_pl_class_group_id
        FROM weekly_teaching_models
       WHERE school_id = v_school AND professor_id = prof.professor_id
         AND status='ACTIVE' AND schedule_type='CLASS'
       ORDER BY created_at DESC LIMIT 1;

      FOR free_slot IN
        SELECT sts.id AS slot_id, sts.weekday, sts.start_time, sts.end_time
          FROM school_time_slots sts
         WHERE sts.school_id = v_school AND sts.status='ACTIVE'
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
          professor_id, course_id, class_mode, status
        ) VALUES (
          v_org, v_school, v_pl_class_group_id, free_slot.slot_id,
          free_slot.weekday, free_slot.start_time, free_slot.end_time, 'PLANNING',
          prof.professor_id, v_pl_course_id, 'PRESENCIAL', 'ACTIVE'
        ) RETURNING id INTO v_pl_model_id;
        v_planning_created := v_planning_created + 1;
        v_created_now := v_created_now + 1;
        v_planning_model_ids := v_planning_model_ids || v_pl_model_id;
      END LOOP;

      IF v_created_now < v_to_create THEN
        v_planning_deficit := v_planning_deficit + (v_to_create - v_created_now);
        v_skip_reason := 'sem horário livre suficiente';
      END IF;
    END IF;

    v_pl_breakdown := v_pl_breakdown || jsonb_build_object(
      'professor_id', prof.professor_id, 'professor_nome', v_prof_nome,
      'target', v_target, 'created', v_created_now + v_already,
      'skipped_reason', v_skip_reason
    );
  END LOOP;

  -- Bindings professor↔curso↔escola
  FOR bind IN
    SELECT DISTINCT wtm.professor_id, wtm.course_id
      FROM weekly_teaching_models wtm
     WHERE wtm.school_id = v_school AND wtm.status='ACTIVE' AND wtm.schedule_type='CLASS'
       AND wtm.professor_id IS NOT NULL AND wtm.course_id IS NOT NULL
  LOOP
    SELECT id INTO v_existing_binding_id
      FROM professor_school_courses
     WHERE professor_id = bind.professor_id AND school_id = v_school AND course_id = bind.course_id
     LIMIT 1;
    IF v_existing_binding_id IS NULL THEN
      INSERT INTO professor_school_courses (organization_id, professor_id, school_id, course_id, status)
      VALUES (v_org, bind.professor_id, v_school, bind.course_id, 'ACTIVE');
    ELSE
      UPDATE professor_school_courses SET status='ACTIVE', updated_at=now() WHERE id = v_existing_binding_id;
    END IF;
  END LOOP;

  IF p_generate_occurrences THEN
    PERFORM public._materialize_occurrences_only(p_link_id, p_ano_letivo);
  END IF;

  RETURN jsonb_build_object(
    'classes_created', v_class_count,
    'slots_created', v_slot_count,
    'models_created', v_models_created,
    'occurrences_created', v_occ_created,
    'planning_created', v_planning_created,
    'planning_deficit', v_planning_deficit,
    'planning_breakdown', v_pl_breakdown,
    'anp_excluded_from_conflicts', v_anp_excluded,
    'planning_model_ids', to_jsonb(v_planning_model_ids),
    'preplanning_seed', COALESCE(v_preplanning_seed, '[]'::jsonb)
  );
END;
$$;