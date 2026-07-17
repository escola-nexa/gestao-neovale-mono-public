/**
 * Cálculo de quantidade de professores recomendada por turma.
 * Baseado SEMPRE na carga horária real das disciplinas do curso e no teto do professor (hr_settings).
 *
 * Regras (alinhadas ao plano):
 *   ch_total_curso  = soma das carga_horaria_semanal das disciplinas do curso
 *   prof_min_turma  = max(2, ceil(ch_total / teto_ch_professor))
 *   prof_sugerido   = clamp para 3 quando o mínimo for <= 3, senão respeita o mínimo
 *   total_vagas     = qtd_turmas × prof_sugerido (diretor pode aumentar)
 */
export interface SubjectCH {
  id: string;
  nome: string;
  carga_horaria_semanal: number | null;
}

export interface DemandResult {
  ch_total_curso: number;
  teto_ch_professor: number;
  prof_min_por_turma: number;
  prof_sugerido_por_turma: number;
  detalhe: string;
}

const MIN_PROF = 2;
const PADRAO_PROF = 3;

export function calcDemand(subjects: SubjectCH[], teto_ch_professor: number): DemandResult {
  const ch_total = subjects.reduce((sum, s) => sum + (s.carga_horaria_semanal ?? 0), 0);
  const teto = teto_ch_professor > 0 ? teto_ch_professor : 24;
  const ideal = Math.ceil(ch_total / teto);
  const prof_min = Math.max(MIN_PROF, ideal);
  const prof_sugerido = prof_min <= PADRAO_PROF ? PADRAO_PROF : prof_min;

  return {
    ch_total_curso: ch_total,
    teto_ch_professor: teto,
    prof_min_por_turma: prof_min,
    prof_sugerido_por_turma: prof_sugerido,
    detalhe: `${subjects.length} disciplina(s) totalizando ${ch_total}h/semana. Com teto de ${teto}h por professor, sugerimos ${prof_sugerido} professores por turma (mínimo ${MIN_PROF}).`,
  };
}
