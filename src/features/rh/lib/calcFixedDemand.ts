/**
 * Regra fixa de carga horária por turma — Portal do Diretor v2.
 *
 * Cada turma exige sempre 10h/semana, distribuídas em 4 funções:
 *   - PEM   :  2h/semana (Projeto Empresarial Mentorado)
 *   - UCI   :  4h/semana (Unidade Curricular I)
 *   - UCII  :  2h/semana (Unidade Curricular II)
 *   - UCIII :  2h/semana (Unidade Curricular III)
 *
 * Cada função é exercida por um professor diferente → 4 professores por turma.
 * (O sistema permite que o mesmo professor cubra mais de uma função,
 *  mas o cadastro inicial sempre gera 4 vagas.)
 */

export type FuncaoCurricular = 'PEM' | 'UCI' | 'UCII' | 'UCIII';

export interface RegraFixa {
  pem: number;
  uci: number;
  ucii: number;
  uciii: number;
  total_por_turma: number;
}

export const DEFAULT_REGRA_FIXA: RegraFixa = {
  pem: 2,
  uci: 4,
  ucii: 2,
  uciii: 2,
  total_por_turma: 10,
};

export const FUNCOES: FuncaoCurricular[] = ['PEM', 'UCI', 'UCII', 'UCIII'];

export const FUNCAO_LABEL: Record<FuncaoCurricular, string> = {
  PEM: 'PEM — Projeto Empresarial Mentorado',
  UCI: 'UCI — Unidade Curricular I',
  UCII: 'UCII — Unidade Curricular II',
  UCIII: 'UCIII — Unidade Curricular III',
};

export function horasDaFuncao(funcao: FuncaoCurricular, regra: RegraFixa = DEFAULT_REGRA_FIXA): number {
  switch (funcao) {
    case 'PEM': return regra.pem;
    case 'UCI': return regra.uci;
    case 'UCII': return regra.ucii;
    case 'UCIII': return regra.uciii;
  }
}

export interface DemandaCurso {
  qtd_turmas: number;
  professores_por_turma: number; // sempre 4 (PEM + UCI + UCII + UCIII)
  total_horas_curso: number;     // qtd_turmas * 10h
  professores_estimados: number; // ceil(total_horas / teto)
}

export function calcFixedDemand(
  qtd_turmas: number,
  teto_ch_professor: number,
  regra: RegraFixa = DEFAULT_REGRA_FIXA,
): DemandaCurso {
  const total = qtd_turmas * regra.total_por_turma;
  const teto = teto_ch_professor > 0 ? teto_ch_professor : 24;
  return {
    qtd_turmas,
    professores_por_turma: FUNCOES.length, // 4
    total_horas_curso: total,
    professores_estimados: Math.max(1, Math.ceil(total / teto)),
  };
}
