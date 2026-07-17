/**
 * Regra oficial de horas de planejamento por professor × escola.
 *
 * Fonte canônica: Grade Horária → "Planejamento Professor".
 * Fórmula: max(1, round(aulas / 3))
 *
 * - `classCount` = quantidade de slots CLASS (status=ACTIVE) que o professor
 *   possui NAQUELA escola (todas as turmas/cursos).
 * - Sem teto superior.
 * - Mesma fórmula é replicada no SQL `materialize_grade_from_indications`.
 */
export function computeRequiredPlanning(classCount: number): number {
  if (!classCount || classCount <= 0) return 0;
  return Math.max(1, Math.round(classCount / 3));
}

export const PLANNING_RATIO_LABEL = '1/3 da carga horária de aula';
