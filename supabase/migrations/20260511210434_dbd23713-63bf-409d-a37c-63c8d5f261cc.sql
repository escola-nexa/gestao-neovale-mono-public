-- =====================================================================
-- v2 da materialização da grade a partir das indicações da escola
-- =====================================================================

-- 1) Preview (read-only) — calcula o impacto antes de materializar
CREATE OR REPLACE FUNCTION public.preview_grade_from_indications(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_school uuid;
  v_user uuid := auth.uid();
  v_turmas_a_criar int := 0;
  v_turmas_existentes int := 0;
  v_slots_a_criar int := 0;
  v_slots_existentes int := 0;
  v_aulas_a_criar int := 0;
  v_aulas_ignoradas int := 0;
  v_ano_letivo_atual text := to_char(now(), 'YYYY');
  v_conflicts jsonb := '[]'::jsonb;
  v_slot_warnings jsonb := '[]'::jsonb;
  v_subject_warnings jsonb := '[]'::jsonb;
  r record;
  v_weekday weekday;
  v_start time;
  v_end time;
  v_label text;
  v_times text[];
  v_subj_ok boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT organization_id, school_id INTO v_org, v_school
    FROM external_links WHERE id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  -- Permissões: admin/coord/rh
  IF NOT (
    public.has_role(v_user, 'admin'::app_role)
    OR public.has_role(v_user, 'coordenador'::app_role)
    OR public.has_role(v_user, 'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Contagem de turmas (a criar vs existentes para o ano atual)
  FOR r IN
    SELECT hc.course_id, hc.nome
      FROM hr_indication_classes hc
     WHERE hc.external_link_id = p_link_id
  LOOP
    PERFORM 1 FROM class_groups cg
     WHERE cg.school_id = v_school
       AND cg.course_id = r.course_id
       AND cg.nome = r.nome
       AND cg.ano_letivo = v_ano_letivo_atual
     LIMIT 1;
    IF FOUND THEN
      v_turmas_existentes := v_turmas_existentes + 1;
    ELSE
      v_turmas_a_criar := v_turmas_a_criar + 1;
    END IF;
  END LOOP;

  -- Itera indicações APROVADAS com candidato_grade
  FOR r IN
    SELECT hi.id, hi.candidato_grade, hi.candidato_nome, hi.course_id, hi.professor_id, hi.talent_pool_candidate_id,
           hi.candidato_email, hi.candidato_telefone
      FROM hr_school_indications hi
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
      v_slot_warnings := v_slot_warnings || jsonb_build_object(
        'indication_id', r.id,
        'candidato', r.candidato_nome,
        'label', v_label,
        'reason', CASE WHEN v_weekday IS NULL THEN 'weekday inválido' ELSE 'horário não reconhecido' END
      );
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      CONTINUE;
    END IF;

    v_start := v_times[1]::time;
    v_end := v_times[2]::time;

    -- Slot já existe (mesma escola/dia/início/fim)?
    PERFORM 1 FROM school_time_slots
     WHERE school_id = v_school AND weekday = v_weekday
       AND start_time = v_start AND end_time = v_end
       AND status = 'ACTIVE'
     LIMIT 1;
    IF FOUND THEN
      v_slots_existentes := v_slots_existentes + 1;
    ELSE
      v_slots_a_criar := v_slots_a_criar + 1;
    END IF;

    -- Disciplina pertence ao curso?
    IF (r.candidato_grade->>'subject_id') IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM subjects s
         WHERE s.id = (r.candidato_grade->>'subject_id')::uuid
           AND s.course_id = r.course_id
      ) INTO v_subj_ok;
      IF NOT v_subj_ok THEN
        v_subject_warnings := v_subject_warnings || jsonb_build_object(
          'indication_id', r.id,
          'candidato', r.candidato_nome,
          'subject_id', r.candidato_grade->>'subject_id',
          'subject_nome', r.candidato_grade->>'subject_nome',
          'reason', 'disciplina não pertence ao curso'
        );
      END IF;
    END IF;

    v_aulas_a_criar := v_aulas_a_criar + 1;
  END LOOP;

  -- Conflitos: o mesmo professor (resolvido) já tem weekly_teaching_model ACTIVE em OUTRA escola
  -- com sobreposição de horário no mesmo weekday.
  WITH resolved AS (
    SELECT hi.id AS indication_id,
           hi.candidato_nome,
           COALESCE(
             hi.professor_id,
             (SELECT p.id FROM professors p
                WHERE p.organization_id = v_org
                  AND p.talent_pool_candidate_id = hi.talent_pool_candidate_id
                LIMIT 1),
             (SELECT p.id FROM professors p
                WHERE p.organization_id = v_org
                  AND lower(p.full_name) = lower(coalesce(hi.candidato_nome,''))
                  AND (lower(coalesce(p.email,'')) = lower(coalesce(hi.candidato_email,''))
                       OR coalesce(p.phone,'') = coalesce(hi.candidato_telefone,''))
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
     WHERE hi.external_link_id = p_link_id
       AND hi.status = 'APROVADA'
       AND hi.candidato_grade IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'indication_id', x.indication_id,
           'candidato', x.candidato_nome,
           'professor_id', x.professor_id,
           'weekday', x.wd,
           'conflict_school', sch.nome,
           'conflict_start', wtm.start_time,
           'conflict_end', wtm.end_time
         )), '[]'::jsonb)
    INTO v_conflicts
    FROM resolved x
    JOIN weekly_teaching_models wtm
      ON wtm.professor_id = x.professor_id
     AND wtm.status = 'ACTIVE'
     AND wtm.weekday = x.wd
     AND wtm.school_id <> v_school
     AND (
       (x.s >= wtm.start_time AND x.s < wtm.end_time)
       OR (x.e > wtm.start_time AND x.e <= wtm.end_time)
       OR (x.s <= wtm.start_time AND x.e >= wtm.end_time)
     )
    JOIN schools sch ON sch.id = wtm.school_id
   WHERE x.professor_id IS NOT NULL AND x.wd IS NOT NULL AND x.s IS NOT NULL;

  RETURN jsonb_build_object(
    'turmas_a_criar', v_turmas_a_criar,
    'turmas_existentes', v_turmas_existentes,
    'slots_a_criar', v_slots_a_criar,
    'slots_existentes', v_slots_existentes,
    'aulas_a_criar', v_aulas_a_criar,
    'aulas_ignoradas', v_aulas_ignoradas,
    'slot_warnings', v_slot_warnings,
    'subject_warnings', v_subject_warnings,
    'conflicts', v_conflicts
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.preview_grade_from_indications(uuid) TO authenticated;


-- 2) Atualiza materialização: dedup por (school,weekday,start,end) + validação de disciplina + ocorrências opcionais
DROP FUNCTION IF EXISTS public.materialize_grade_from_indications(uuid, text);
DROP FUNCTION IF EXISTS public.materialize_grade_from_indications(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_school uuid;
  v_user uuid := auth.uid();
  v_classes_upserted int := 0;
  v_slots_upserted int := 0;
  v_models_upserted int := 0;
  v_aulas_ignoradas int := 0;
  v_occurrences_created int := 0;
  v_motivos jsonb := '[]'::jsonb;
  v_pendentes int;
  v_recusadas int;
  v_aprovadas int;
  v_total int;
  v_class_group_ids uuid[] := ARRAY[]::uuid[];
  v_model_ids uuid[] := ARRAY[]::uuid[];
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

  -- 2) Idempotência: limpa modelos CLASS existentes para essas turmas
  IF array_length(v_class_group_ids, 1) > 0 THEN
    DELETE FROM weekly_teaching_models
     WHERE class_group_id = ANY(v_class_group_ids)
       AND schedule_type = 'CLASS';
  END IF;

  -- 3) Insere weekly_teaching_models a partir das indicações aprovadas
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

    -- Disciplina: valida vínculo curso×disciplina
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

    -- Slot: dedup por (school, weekday, start_time, end_time)
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
        -- Conflito de sobreposição: tenta reusar slot existente que cubra o intervalo
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

    -- class_group da turma
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

    -- Resolve professor
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

    -- Inserir modelo (capturando id para gerar ocorrências depois)
    BEGIN
      INSERT INTO weekly_teaching_models (
        organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
        weekday, start_time, end_time, status, schedule_type, school_time_slot_id
      ) VALUES (
        v_org, v_professor_id, v_school, r.course_id, v_class_group_id,
        v_subject_id, v_weekday, v_start, v_end, 'ACTIVE', 'CLASS', v_slot_id
      ) RETURNING id INTO v_model_id;
      v_models_upserted := v_models_upserted + 1;
      IF v_professor_id IS NOT NULL THEN
        v_model_ids := v_model_ids || v_model_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_aulas_ignoradas := v_aulas_ignoradas + 1;
      v_motivos := v_motivos || jsonb_build_object('indication_id', r.id, 'reason', SQLERRM);
    END;
  END LOOP;

  -- 4) Geração opcional de ocorrências anuais
  IF p_generate_occurrences AND array_length(v_model_ids, 1) > 0 THEN
    SELECT id INTO v_calendar_id
      FROM academic_calendars
     WHERE organization_id = v_org AND status = 'ACTIVE'
     LIMIT 1;

    IF v_calendar_id IS NOT NULL THEN
      WITH model_data AS (
        SELECT wtm.id, wtm.weekday, wtm.start_time, wtm.end_time,
               CASE wtm.weekday
                 WHEN 'SEGUNDA' THEN 1 WHEN 'TERCA' THEN 2 WHEN 'QUARTA' THEN 3
                 WHEN 'QUINTA' THEN 4 WHEN 'SEXTA' THEN 5 END AS dow
          FROM weekly_teaching_models wtm
         WHERE wtm.id = ANY(v_model_ids)
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

  -- 5) Marca o link como materializado
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
      'aulas_ignoradas', v_aulas_ignoradas,
      'occurrences_created', v_occurrences_created,
      'generate_occurrences', p_generate_occurrences
    )
  );

  RETURN jsonb_build_object(
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'aulas_ignoradas', v_aulas_ignoradas,
    'occurrences_created', v_occurrences_created,
    'motivos', v_motivos,
    'materialized_at', now(),
    'ano_letivo', p_ano_letivo
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;
