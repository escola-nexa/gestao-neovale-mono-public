-- 1) Novas colunas no external_links para rastrear a materialização
ALTER TABLE public.external_links
  ADD COLUMN IF NOT EXISTS materialized_at timestamptz,
  ADD COLUMN IF NOT EXISTS materialized_by uuid,
  ADD COLUMN IF NOT EXISTS materialized_ano_letivo text;

-- 2) Atualiza list_school_indication_links para incluir materialized_at + contagens por status
DROP FUNCTION IF EXISTS public.list_school_indication_links();

CREATE OR REPLACE FUNCTION public.list_school_indication_links()
 RETURNS TABLE(
   link_id uuid, school_id uuid, school_nome text, qtd_cursos integer,
   token text, keyword text, is_active boolean, expires_at timestamp with time zone,
   created_at timestamp with time zone, qtd_indicacoes integer, qtd_turmas integer,
   qtd_professores integer, qtd_aulas integer,
   qtd_aprovadas integer, qtd_pendentes integer, qtd_recusadas integer,
   materialized_at timestamp with time zone, materialized_ano_letivo text
 )
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_org IS NULL THEN
    SELECT organization_id INTO v_org FROM profiles WHERE id = auth.uid() LIMIT 1;
  END IF;
  IF v_org IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    el.id AS link_id,
    s.id AS school_id,
    s.nome AS school_nome,
    (SELECT count(*)::int
       FROM course_schools cs
       JOIN courses c ON c.id = cs.course_id
      WHERE cs.school_id = s.id AND c.status = 'ativo') AS qtd_cursos,
    el.token,
    NULL::text AS keyword,
    el.is_active,
    el.expires_at,
    el.created_at,
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_indicacoes,
    (SELECT count(*)::int FROM hr_indication_classes hc WHERE hc.external_link_id = el.id) AS qtd_turmas,
    (SELECT count(DISTINCT COALESCE(
        NULLIF(lower(hi.candidato_email), ''),
        NULLIF(hi.candidato_telefone, ''),
        hi.id::text
      ))::int
       FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id) AS qtd_professores,
    (SELECT count(*)::int FROM hr_school_indications hi WHERE hi.external_link_id = el.id) AS qtd_aulas,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status = 'APROVADA') AS qtd_aprovadas,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status IN ('PENDENTE','EM_ANALISE')) AS qtd_pendentes,
    (SELECT count(*)::int FROM hr_school_indications hi
      WHERE hi.external_link_id = el.id AND hi.status = 'RECUSADA') AS qtd_recusadas,
    el.materialized_at,
    el.materialized_ano_letivo
  FROM external_links el
  JOIN schools s ON s.id = el.school_id
  WHERE el.organization_id = v_org
    AND el.content_type = 'hr_school_indication'
  ORDER BY s.nome;
END;
$function$;

-- 3) Função para materializar grade a partir das indicações aprovadas
CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text
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
  v_pendentes int;
  v_recusadas int;
  v_aprovadas int;
  v_total int;
  v_class_group_ids uuid[] := ARRAY[]::uuid[];
  r record;
  v_class_group_id uuid;
  v_weekday weekday;
  v_start time;
  v_end time;
  v_slot_id uuid;
  v_slot_number int;
  v_professor_id uuid;
  v_label text;
  v_times_match text[];
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

  -- Validar: só permite gerar se todas as indicações estão APROVADAS
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

  -- 3.1 Upsert das turmas (class_groups) a partir de hr_indication_classes
  FOR r IN
    SELECT hc.id AS indication_class_id, hc.course_id, hc.nome, hc.turno
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

  -- 3.2 Limpa modelos CLASS existentes para as turmas afetadas (idempotência)
  IF array_length(v_class_group_ids, 1) > 0 THEN
    DELETE FROM weekly_teaching_models
     WHERE class_group_id = ANY(v_class_group_ids)
       AND schedule_type = 'CLASS';
  END IF;

  -- 3.3 Insere weekly_teaching_models a partir de cada indicação aprovada com candidato_grade
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
    -- Mapear weekday do payload (FRI -> SEXTA)
    v_weekday := CASE upper(coalesce(r.candidato_grade->>'weekday',''))
      WHEN 'MON' THEN 'SEGUNDA'::weekday
      WHEN 'TUE' THEN 'TERCA'::weekday
      WHEN 'WED' THEN 'QUARTA'::weekday
      WHEN 'THU' THEN 'QUINTA'::weekday
      WHEN 'FRI' THEN 'SEXTA'::weekday
      ELSE NULL
    END;
    IF v_weekday IS NULL THEN CONTINUE; END IF;

    -- Extrair HH:MM–HH:MM do label do diretor
    v_label := coalesce(r.candidato_grade->>'time_slot_label','');
    v_times_match := regexp_match(v_label, '(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})');
    IF v_times_match IS NULL THEN CONTINUE; END IF;
    v_start := v_times_match[1]::time;
    v_end := v_times_match[2]::time;

    -- Extrair slot_number do label "Xº tempo …" (fallback 1)
    v_slot_number := coalesce(
      NULLIF(regexp_replace(v_label, '^(\d+).*$', '\1'), v_label)::int,
      1
    );

    -- Upsert school_time_slot (ACTIVE) — reusa se já houver no mesmo (school,weekday,slot_number)
    SELECT id INTO v_slot_id
      FROM school_time_slots
     WHERE school_id = v_school AND weekday = v_weekday
       AND slot_number = v_slot_number AND status = 'ACTIVE'
     LIMIT 1;

    IF v_slot_id IS NULL THEN
      BEGIN
        INSERT INTO school_time_slots (organization_id, school_id, weekday, slot_number, slot_label, start_time, end_time, status)
        VALUES (v_org, v_school, v_weekday, v_slot_number, v_label, v_start, v_end, 'ACTIVE')
        RETURNING id INTO v_slot_id;
        v_slots_upserted := v_slots_upserted + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Em caso de conflito de horários (validate_school_time_slot), tenta achar slot existente que cubra o intervalo
        SELECT id INTO v_slot_id FROM school_time_slots
         WHERE school_id = v_school AND weekday = v_weekday AND status='ACTIVE'
           AND start_time = v_start AND end_time = v_end
         LIMIT 1;
        IF v_slot_id IS NULL THEN
          RAISE NOTICE 'Slot não criado (% %): %', v_weekday, v_label, SQLERRM;
          CONTINUE;
        END IF;
      END;
    END IF;

    -- class_group da turma (deve existir do passo 3.1)
    SELECT cg.id INTO v_class_group_id
      FROM hr_indication_classes hc
      JOIN class_groups cg ON cg.school_id = v_school
                          AND cg.course_id = hc.course_id
                          AND cg.nome = hc.nome
                          AND cg.ano_letivo = p_ano_letivo
     WHERE hc.id = r.indication_class_id
     LIMIT 1;
    IF v_class_group_id IS NULL THEN CONTINUE; END IF;

    -- Professor: primeiro tenta o professor_id direto, depois por talent_pool_candidate convertido
    v_professor_id := r.professor_id;
    IF v_professor_id IS NULL AND r.talent_pool_candidate_id IS NOT NULL THEN
      SELECT id INTO v_professor_id FROM professors
       WHERE talent_pool_candidate_id = r.talent_pool_candidate_id
         AND organization_id = v_org
       LIMIT 1;
    END IF;
    IF v_professor_id IS NULL THEN
      -- fallback por nome+email para professores já cadastrados
      SELECT p.id INTO v_professor_id FROM professors p
       WHERE p.organization_id = v_org
         AND lower(p.full_name) = lower(coalesce(r.candidato_nome,''))
         AND (
           lower(coalesce(p.email,'')) = lower(coalesce(r.candidato_email,''))
           OR coalesce(p.phone,'') = coalesce(r.candidato_telefone,'')
         )
       LIMIT 1;
    END IF;

    -- Inserir weekly_teaching_model (deixar professor null = vaga se não encontrar)
    INSERT INTO weekly_teaching_models (
      organization_id, professor_id, school_id, course_id, class_group_id, subject_id,
      weekday, start_time, end_time, status, schedule_type, school_time_slot_id
    ) VALUES (
      v_org, v_professor_id, v_school, r.course_id, v_class_group_id,
      NULLIF(r.candidato_grade->>'subject_id','')::uuid,
      v_weekday, v_start, v_end, 'ACTIVE', 'CLASS', v_slot_id
    );
    v_models_upserted := v_models_upserted + 1;
  END LOOP;

  -- 3.4 Marca o link como materializado
  UPDATE external_links
     SET materialized_at = now(),
         materialized_by = v_user,
         materialized_ano_letivo = p_ano_letivo,
         updated_at = now()
   WHERE id = p_link_id;

  -- 3.5 Auditoria
  INSERT INTO audit_events (organization_id, actor_id, module, action, details)
  VALUES (
    v_org, v_user, 'rh_links_escolas', 'materialize_grade',
    jsonb_build_object(
      'link_id', p_link_id,
      'school_id', v_school,
      'ano_letivo', p_ano_letivo,
      'classes_upserted', v_classes_upserted,
      'slots_upserted', v_slots_upserted,
      'models_upserted', v_models_upserted
    )
  );

  RETURN jsonb_build_object(
    'classes_upserted', v_classes_upserted,
    'slots_upserted', v_slots_upserted,
    'models_upserted', v_models_upserted,
    'materialized_at', now(),
    'ano_letivo', p_ano_letivo
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text) TO authenticated;