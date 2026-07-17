
-- ===========================================================================
-- 1) LIMPEZA DE DUPLICATAS EXISTENTES
-- ===========================================================================
-- Para cada (external_link_id, course_id, nome, turno) mantém a turma com
-- MENOR created_at como canônica. Migra todas as hr_school_indications das
-- duplicatas para a canônica e remove as duplicatas. Só atua em indicações
-- ainda PENDENTE e não alocadas — registros já aprovados/alocados são preservados.

WITH canonical AS (
  SELECT
    id,
    external_link_id,
    course_id,
    nome,
    turno,
    row_number() OVER (
      PARTITION BY external_link_id, course_id, nome, turno
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    first_value(id) OVER (
      PARTITION BY external_link_id, course_id, nome, turno
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM public.hr_indication_classes
),
dupes AS (
  SELECT id AS dup_id, canonical_id
  FROM canonical
  WHERE rn > 1 AND id <> canonical_id
)
UPDATE public.hr_school_indications hi
SET indication_class_id = d.canonical_id
FROM dupes d
WHERE hi.indication_class_id = d.dup_id;

-- Remove turmas duplicadas que já não têm indicação apontando (depois do UPDATE acima).
DELETE FROM public.hr_indication_classes ic
USING (
  SELECT id, external_link_id, course_id, nome, turno,
         row_number() OVER (
           PARTITION BY external_link_id, course_id, nome, turno
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.hr_indication_classes
) c
WHERE ic.id = c.id
  AND c.rn > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.hr_school_indications hi WHERE hi.indication_class_id = ic.id
  );

-- Deduplica indicações por (link, class, nome, telefone, subject_id, weekday, time_slot_label).
-- Mantém a mais antiga; só apaga se TODAS as duplicatas estiverem PENDENTE e sem class_group_id.
WITH ind_keyed AS (
  SELECT
    id,
    status,
    class_group_id,
    row_number() OVER (
      PARTITION BY
        external_link_id,
        indication_class_id,
        lower(coalesce(candidato_nome, '')),
        coalesce(candidato_telefone, ''),
        coalesce(candidato_grade->>'subject_id', ''),
        coalesce(candidato_grade->>'weekday', ''),
        coalesce(candidato_grade->>'time_slot_label', '')
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    count(*) FILTER (
      WHERE status <> 'PENDENTE'::hr_indication_status OR class_group_id IS NOT NULL
    ) OVER (
      PARTITION BY
        external_link_id,
        indication_class_id,
        lower(coalesce(candidato_nome, '')),
        coalesce(candidato_telefone, ''),
        coalesce(candidato_grade->>'subject_id', ''),
        coalesce(candidato_grade->>'weekday', ''),
        coalesce(candidato_grade->>'time_slot_label', '')
    ) AS protected_in_group
  FROM public.hr_school_indications
)
DELETE FROM public.hr_school_indications hi
USING ind_keyed k
WHERE hi.id = k.id
  AND k.rn > 1
  AND k.protected_in_group = 0;

-- ===========================================================================
-- 2) ÍNDICES (defesa em profundidade + performance)
-- ===========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_indication_classes_link_course_nome_turno
  ON public.hr_indication_classes (external_link_id, course_id, nome, turno);

CREATE INDEX IF NOT EXISTS idx_hr_school_indications_link_course
  ON public.hr_school_indications (external_link_id, course_id);

CREATE INDEX IF NOT EXISTS idx_hr_indication_classes_link_course
  ON public.hr_indication_classes (external_link_id, course_id);

-- ===========================================================================
-- 3) RPC IDEMPOTENTE — submit_school_indication_full
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.submit_school_indication_full(
  p_token text,
  p_keyword text,
  p_course_id uuid,
  p_classes jsonb,
  p_indications jsonb,
  p_indicado_por_nome text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link RECORD;
  v_org uuid;
  v_school uuid;
  v_class jsonb;
  v_class_id uuid;
  v_class_ids uuid[] := ARRAY[]::uuid[];
  v_ind jsonb;
  v_count int := 0;
  v_indicado text;
  v_grade jsonb;
  v_disciplinas jsonb;
  v_sem_indicacao boolean;
  v_from_school boolean;
  v_nome text;
  v_telefone text;
  v_email text;
  v_formacao text;
  v_protected int;
BEGIN
  SELECT * INTO v_link
    FROM external_links
   WHERE token = p_token
     AND content_type = 'hr_school_indication'
     AND is_active = true
   LIMIT 1;
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link inválido';
  END IF;

  IF v_link.materialized_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este link já foi materializado em grade horária pelo R.H. e não aceita novos envios. Solicite ao R.H. um novo link.';
  END IF;

  IF NOT public.is_active_quarterly_keyword(v_link.organization_id, p_keyword) THEN
    RAISE EXCEPTION 'Palavra-chave inválida ou expirada';
  END IF;

  v_org := v_link.organization_id;
  v_school := v_link.school_id;
  v_indicado := nullif(trim(coalesce(p_indicado_por_nome, '')), '');
  IF v_indicado IS NULL THEN
    v_indicado := 'Diretor da escola';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM course_schools
     WHERE school_id = v_school AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Curso não vinculado à escola';
  END IF;

  -- IDEMPOTÊNCIA: bloqueia se já houver indicação aprovada/alocada/convertida
  -- para esse (link, curso) — caso contrário substituiria trabalho do R.H.
  SELECT count(*) INTO v_protected
    FROM hr_school_indications
   WHERE external_link_id = v_link.id
     AND course_id = p_course_id
     AND (status <> 'PENDENTE'::hr_indication_status OR class_group_id IS NOT NULL);

  IF v_protected > 0 THEN
    RAISE EXCEPTION 'Este curso já tem % indicação(ões) aprovada(s)/alocada(s) pelo R.H. Não é possível reenviar. Solicite ao R.H. para revisar antes de tentar novamente.', v_protected;
  END IF;

  -- Apaga indicações PENDENTE não alocadas deste (link, curso) — só "rascunho do banco".
  DELETE FROM hr_school_indications
   WHERE external_link_id = v_link.id
     AND course_id = p_course_id
     AND status = 'PENDENTE'::hr_indication_status
     AND class_group_id IS NULL;

  -- Apaga turmas órfãs deste (link, curso) — agora seguro porque não há mais indicação apontando.
  DELETE FROM hr_indication_classes ic
   WHERE ic.external_link_id = v_link.id
     AND ic.course_id = p_course_id
     AND NOT EXISTS (
       SELECT 1 FROM hr_school_indications hi WHERE hi.indication_class_id = ic.id
     );

  -- Insere turmas novas
  FOR v_class IN SELECT * FROM jsonb_array_elements(p_classes) LOOP
    INSERT INTO hr_indication_classes(
      organization_id, external_link_id, school_id, course_id,
      nome, turno, qtd_professores_indicados
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      coalesce(v_class->>'nome', ''),
      coalesce(v_class->>'turno', 'manha'),
      coalesce((v_class->>'qtd')::int, 3)
    )
    RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || v_class_id;
  END LOOP;

  -- Insere indicações
  FOR v_ind IN SELECT * FROM jsonb_array_elements(p_indications) LOOP
    v_sem_indicacao := coalesce((v_ind->>'sem_indicacao')::boolean, false);
    v_from_school := coalesce((v_ind->>'from_school')::boolean, false);

    IF v_sem_indicacao THEN
      v_nome := '[SEM INDICAÇÃO — A DEFINIR PELO R.H.]';
      v_telefone := NULL;
      v_email := NULL;
      v_formacao := 'A definir';
    ELSE
      IF nullif(trim(coalesce(v_ind->>'nome', '')), '') IS NULL THEN
        RAISE EXCEPTION 'Nome obrigatório para todos os professores indicados';
      END IF;
      IF NOT v_from_school AND nullif(trim(coalesce(v_ind->>'telefone', '')), '') IS NULL THEN
        RAISE EXCEPTION 'Telefone obrigatório para professores indicados de fora da escola';
      END IF;
      v_nome := trim(v_ind->>'nome');
      v_telefone := nullif(trim(coalesce(v_ind->>'telefone', '')), '');
      v_email := nullif(trim(coalesce(v_ind->>'email', '')), '');
      v_formacao := nullif(trim(coalesce(v_ind->>'formacao', '')), '');
    END IF;

    v_grade := v_ind->'grade';
    IF (v_ind ? 'disciplinas') THEN
      v_disciplinas := v_ind->'disciplinas';
    ELSE
      v_disciplinas := to_jsonb(nullif(trim(coalesce(v_ind->>'funcao', '')), ''));
    END IF;

    INSERT INTO hr_school_indications(
      organization_id, external_link_id, school_id, course_id,
      indication_class_id,
      candidato_nome, candidato_telefone, candidato_email,
      candidato_formacao,
      indicado_por_nome,
      origem,
      status,
      candidato_disciplinas,
      candidato_grade
    ) VALUES (
      v_org, v_link.id, v_school, p_course_id,
      v_class_ids[(v_ind->>'class_index')::int + 1],
      v_nome,
      v_telefone,
      v_email,
      v_formacao,
      v_indicado,
      'PORTAL_ESCOLA',
      'PENDENTE'::hr_indication_status,
      v_disciplinas,
      v_grade
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'classes', coalesce(array_length(v_class_ids, 1), 0),
    'indications', v_count
  );
END;
$function$;
