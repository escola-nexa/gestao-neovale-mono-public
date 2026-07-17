
-- Função: valida cobertura completa de um link de indicação
CREATE OR REPLACE FUNCTION public.check_link_grade_completeness(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid; v_school uuid; v_course uuid; v_ano text;
  v_missing_classes jsonb := '[]'::jsonb;
  v_incomplete jsonb := '[]'::jsonb;
  v_total_missing int := 0;
  v_total_incomplete int := 0;
  v_total_subjects_missing int := 0;
  v_ok boolean;
BEGIN
  SELECT el.organization_id, el.school_id, el.course_id,
         COALESCE(el.ano_letivo::text, extract(year from now())::text)
    INTO v_org, v_school, v_course, v_ano
    FROM external_links el
   WHERE el.id = p_link_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado';
  END IF;

  -- 1) Turmas ATIVAS da (escola, curso, ano_letivo) que NÃO estão neste link.
  --    Considera somente turmas pré-existentes; novas turmas nascem do próprio link.
  WITH link_class_names AS (
    SELECT lower(trim(nome)) AS nome
      FROM hr_indication_classes
     WHERE external_link_id = p_link_id
  ),
  active_classes AS (
    SELECT id, nome, course_id
      FROM class_groups
     WHERE school_id = v_school
       AND course_id = v_course
       AND ano_letivo = v_ano
       AND status = 'ativo'
  ),
  missing AS (
    SELECT ac.id AS class_group_id, ac.nome, ac.course_id
      FROM active_classes ac
     WHERE lower(trim(ac.nome)) NOT IN (SELECT nome FROM link_class_names)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'course_id', course_id,
            'class_group_id', class_group_id,
            'class_name', nome
         ) ORDER BY nome), '[]'::jsonb),
         count(*)
    INTO v_missing_classes, v_total_missing
    FROM missing;

  -- 2) Para cada turma INDICADA neste link, verifica se todas as disciplinas
  --    do curso têm a CH semanal totalmente alocada nas indicações APROVADAS.
  --
  --    CH exigida por disciplina:
  --      - se houver linhas em class_subject_modality para a turma (após materializar
  --        teríamos class_group_id; antes não temos), usar SUM(ch_presencial+ch_anp);
  --      - senão, usar subjects.carga_horaria_semanal.
  --
  --    Antes da 1ª materialização normalmente NÃO existe class_group ainda
  --    (a turma é criada pelo materialize). Por isso, casamos por (course_id, subject)
  --    e usamos a CH default de subjects.carga_horaria_semanal.
  WITH ind_classes AS (
    SELECT hic.id AS indication_class_id, hic.nome AS class_name, hic.course_id
      FROM hr_indication_classes hic
     WHERE hic.external_link_id = p_link_id
  ),
  course_subj AS (
    SELECT s.id AS subject_id, s.nome AS subject_nome, s.carga_horaria_semanal AS ch_required
      FROM subjects s
     WHERE s.course_id = v_course
       AND s.status = 'ativo'
  ),
  ind_counts AS (
    SELECT
      hsi.indication_class_id,
      (hsi.candidato_grade->>'subject_id')::uuid AS subject_id,
      count(*) AS ch_indicated
      FROM hr_school_indications hsi
     WHERE hsi.external_link_id = p_link_id
       AND hsi.status = 'APROVADA'
       AND hsi.candidato_grade ? 'subject_id'
     GROUP BY hsi.indication_class_id, (hsi.candidato_grade->>'subject_id')::uuid
  ),
  per_class AS (
    SELECT
      ic.indication_class_id,
      ic.class_name,
      cs.subject_id,
      cs.subject_nome,
      cs.ch_required,
      COALESCE(ind.ch_indicated, 0) AS ch_indicated
      FROM ind_classes ic
      CROSS JOIN course_subj cs
      LEFT JOIN ind_counts ind
             ON ind.indication_class_id = ic.indication_class_id
            AND ind.subject_id = cs.subject_id
  ),
  pending AS (
    SELECT
      indication_class_id,
      class_name,
      jsonb_agg(jsonb_build_object(
        'subject_id', subject_id,
        'subject_name', subject_nome,
        'ch_required', ch_required,
        'ch_indicated', ch_indicated,
        'ch_missing', GREATEST(ch_required - ch_indicated, 0)
      ) ORDER BY subject_nome) AS missing_subjects,
      sum(GREATEST(ch_required - ch_indicated, 0)) AS total_missing_ch,
      count(*) FILTER (WHERE ch_indicated < ch_required) AS subjects_missing
      FROM per_class
     GROUP BY indication_class_id, class_name
    HAVING count(*) FILTER (WHERE ch_indicated < ch_required) > 0
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'indication_class_id', indication_class_id,
      'class_name', class_name,
      'subjects_missing', subjects_missing,
      'total_missing_ch', total_missing_ch,
      'missing_subjects', (
        SELECT jsonb_agg(s) FROM jsonb_array_elements(missing_subjects) s
         WHERE (s->>'ch_missing')::int > 0
      )
    ) ORDER BY class_name), '[]'::jsonb),
    count(*),
    COALESCE(sum(subjects_missing), 0)
    INTO v_incomplete, v_total_incomplete, v_total_subjects_missing
    FROM pending;

  v_ok := (v_total_missing = 0 AND v_total_incomplete = 0);

  RETURN jsonb_build_object(
    'ok', v_ok,
    'school_id', v_school,
    'course_id', v_course,
    'ano_letivo', v_ano,
    'total_missing_classes', v_total_missing,
    'total_incomplete_classes', v_total_incomplete,
    'total_subjects_missing', v_total_subjects_missing,
    'missing_classes', v_missing_classes,
    'incomplete_classes', v_incomplete
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_link_grade_completeness(uuid) TO authenticated;

-- Patch: materialize_grade_from_indications passa a validar cobertura antes de gerar.
-- Estratégia: wrappermos a função existente sem reescrevê-la inteira — inserimos
-- a checagem via "BEFORE" através de uma função guard chamada no início.
-- Como a função é um único bloco PL/pgSQL, criamos uma nova versão que apenas
-- adiciona a validação e DELEGA ao corpo original via dynamic SQL? Não.
-- Em vez disso, criamos uma RPC wrapper: materialize_grade_from_indications_safe
-- — porém o front já chama materialize_grade_from_indications.
-- Solução simples: criamos um trigger-like guard chamando check_link_grade_completeness
-- dentro de uma função BEFORE invocada explicitamente. Como não dá pra "hookar" em SQL,
-- redefinimos materialize_grade_from_indications adicionando 6 linhas no topo que
-- chamam o validador e fazem RAISE. Para evitar reescrever 500 linhas, fazemos:
--   1) Renomeamos a original para _internal
--   2) Criamos um wrapper público com mesma assinatura que valida e chama _internal
ALTER FUNCTION public.materialize_grade_from_indications(uuid, text, boolean)
  RENAME TO materialize_grade_from_indications_internal;

CREATE OR REPLACE FUNCTION public.materialize_grade_from_indications(
  p_link_id uuid,
  p_ano_letivo text,
  p_generate_occurrences boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_check jsonb;
  v_msg text;
BEGIN
  -- Validação de cobertura: bloqueia se faltar turma ou CH semanal de qualquer disciplina
  v_check := public.check_link_grade_completeness(p_link_id);
  IF NOT (v_check->>'ok')::boolean THEN
    v_msg := format(
      'GRADE_INCOMPLETA: %s turma(s) sem indicação · %s turma(s) com CH parcial · %s disciplina(s) faltante(s). Detalhes: %s',
      v_check->>'total_missing_classes',
      v_check->>'total_incomplete_classes',
      v_check->>'total_subjects_missing',
      v_check::text
    );
    RAISE EXCEPTION '%', v_msg;
  END IF;

  -- Cobertura ok → delega ao corpo original
  RETURN public.materialize_grade_from_indications_internal(p_link_id, p_ano_letivo, p_generate_occurrences);
END;
$$;

GRANT EXECUTE ON FUNCTION public.materialize_grade_from_indications(uuid, text, boolean) TO authenticated;
