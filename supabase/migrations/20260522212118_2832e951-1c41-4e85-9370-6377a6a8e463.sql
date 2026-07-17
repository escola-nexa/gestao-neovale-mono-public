-- Patch materialize_grade_from_indications_internal:
-- A quantidade-alvo de slots PLANNING por professor passa a ser
--   max(1, round(num_aulas_semanais / 3))
-- em vez de
--   max(1, round(soma_horas_aulas / 3))
-- mantendo paridade com a Conferência por professor (regra canônica
-- src/features/grade-horaria/utils/planningRule.ts).
--
-- Implementação: dentro do CTE prof_slot_hours, o slot_h passa a ser
-- 1 (contagem) em vez de duração em horas. As outras seções da função
-- (CH efetiva, teto, geração de aulas CLASS, ocorrências) NÃO são tocadas.
DO $patch$
DECLARE
  src text;
  patched text;
BEGIN
  src := pg_get_functiondef('public.materialize_grade_from_indications_internal(uuid, text, boolean)'::regprocedure);

  patched := replace(
    src,
    $old$    WITH prof_slot_hours AS (
      SELECT professor_id, SUM(slot_h) AS total_h_eff
        FROM (
          SELECT DISTINCT wtm.professor_id, wtm.weekday, wtm.start_time, wtm.end_time, wtm.class_group_id, wtm.class_mode,
                 CASE WHEN COALESCE(wtm.class_mode,'PRESENCIAL') = 'ANP' THEN 1.0
                      ELSE EXTRACT(EPOCH FROM (wtm.end_time-wtm.start_time))/3600.0 END AS slot_h
            FROM weekly_teaching_models wtm
           WHERE wtm.school_id = v_school
             AND wtm.schedule_type = 'CLASS'
             AND wtm.status = 'ACTIVE'
             AND wtm.professor_id IS NOT NULL
        ) u
       GROUP BY professor_id
    )$old$,
    $new$    WITH prof_slot_hours AS (
      -- total_h_eff aqui passa a representar a CONTAGEM de slots únicos
      -- (aulas semanais) do professor na escola, para alinhar com a
      -- Conferência por professor: PL = max(1, round(aulas / 3)).
      SELECT professor_id, COUNT(*)::numeric AS total_h_eff
        FROM (
          SELECT DISTINCT wtm.professor_id, wtm.weekday, wtm.start_time, wtm.end_time
            FROM weekly_teaching_models wtm
           WHERE wtm.school_id = v_school
             AND wtm.schedule_type = 'CLASS'
             AND wtm.status = 'ACTIVE'
             AND wtm.professor_id IS NOT NULL
        ) u
       GROUP BY professor_id
    )$new$
  );

  IF patched = src THEN
    RAISE EXCEPTION 'materialize_grade_from_indications_internal: bloco-alvo do cálculo de PL não encontrado para patch (versão inesperada)';
  END IF;

  EXECUTE patched;
END
$patch$;