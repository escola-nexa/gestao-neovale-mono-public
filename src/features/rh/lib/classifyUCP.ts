/**
 * Classificador automático de UCP a partir do nome da disciplina.
 *
 * Regras (em ordem):
 *  - "UCP I"   (sem II/III à frente)        → UCP1
 *  - "UCP II"  (sem III à frente)           → UCP2
 *  - "UCP III"                              → UCP3
 *  - "Empresa Pedagógica" / "Pedagógica"    → PEDAGOGICA
 *  - qualquer outra coisa                   → OUTRA
 *
 * O admin pode sobrescrever via tabela `hr_subject_ucp_overrides`.
 */
export type UcpType = 'UCP1' | 'UCP2' | 'UCP3' | 'PEDAGOGICA' | 'OUTRA';

export const UCP_LABELS: Record<UcpType, string> = {
  UCP1: 'UCP I',
  UCP2: 'UCP II',
  UCP3: 'UCP III',
  PEDAGOGICA: 'Pedagógica',
  OUTRA: 'Outra',
};

export const UCP_COLORS: Record<UcpType, string> = {
  UCP1: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300',
  UCP2: 'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300',
  UCP3: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  PEDAGOGICA: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
  OUTRA: 'bg-muted text-muted-foreground border-border',
};

const RE_UCP3 = /\bUCP\s*III\b/i;
const RE_UCP2 = /\bUCP\s*II\b(?!I)/i;
const RE_UCP1 = /\bUCP\s*I\b(?!I)/i;
const RE_PEDAG = /(empresa\s+pedag|pedag[oó]gica)/i;

export function classifyUCP(subjectName: string | null | undefined): UcpType {
  if (!subjectName) return 'OUTRA';
  const s = subjectName.trim();
  if (RE_UCP3.test(s)) return 'UCP3';
  if (RE_UCP2.test(s)) return 'UCP2';
  if (RE_UCP1.test(s)) return 'UCP1';
  if (RE_PEDAG.test(s)) return 'PEDAGOGICA';
  return 'OUTRA';
}

/**
 * Aplica override (se houver) por cima da classificação automática.
 */
export function resolveUCP(
  subjectName: string,
  overrides: Map<string, UcpType> | undefined,
  subjectId: string,
): UcpType {
  const override = overrides?.get(subjectId);
  if (override) return override;
  return classifyUCP(subjectName);
}
