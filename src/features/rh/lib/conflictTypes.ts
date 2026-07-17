/**
 * Tipos compartilhados para a Modal de Conflito de Horário do Professor.
 * Usados por:
 *  - Portal externo do diretor (intra-link e cross-school)
 *  - RhLinkConferirPage (cross-school via materialize preview)
 *  - Grade Horária Admin (admin-grid)
 */
export type ConflictKind = 'intra-link' | 'cross-school' | 'admin-grid';

export type WeekdayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export type TurnoCode = 'manha' | 'tarde' | 'noite';

export const WEEKDAY_LABEL_PT: Record<WeekdayCode, string> = {
  MON: 'Segunda',
  TUE: 'Terça',
  WED: 'Quarta',
  THU: 'Quinta',
  FRI: 'Sexta',
  SAT: 'Sábado',
};

export const TURNO_LABEL: Record<TurnoCode, string> = {
  manha: 'Matutino',
  tarde: 'Vespertino',
  noite: 'Noturno',
};

export interface ConflictSide {
  /** Identificador do slot (apenas em intra-link / admin) */
  slotId?: string;
  classId?: string;
  className: string;
  schoolId?: string;
  schoolName?: string;
  turno?: TurnoCode;
  subjectId?: string;
  subjectName?: string;
  /** Quando vem de cross-school: identifica que essa alocação está em OUTRA escola já materializada */
  isExternalSchool?: boolean;
}

export type ConflictAction =
  | { type: 'change-teacher'; slotId?: string; classId: string; subjectId?: string }
  | { type: 'set-no-indication'; slotId?: string; classId: string; subjectId?: string }
  | { type: 'move-slot'; slotId: string }
  | { type: 'open-grade'; classId?: string; schoolId?: string }
  | { type: 'reject-indication'; indicationId: string; reason?: string };

export interface ConflictSuggestion {
  label: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  action: ConflictAction;
}

export interface ConflictItem {
  /** Chave estável (mesma chave = mesmo conflito) */
  key: string;
  kind: ConflictKind;
  teacherName: string;
  teacherPhoneMasked?: string;
  weekday: WeekdayCode;
  /** Faixa SOBREPOSTA (HH:MM) — não a faixa total dos slots */
  overlapStart: string;
  overlapEnd: string;
  /** Lados envolvidos no conflito (geralmente 2) */
  sides: ConflictSide[];
  sameTurno?: boolean;
  suggestions: ConflictSuggestion[];
}

/** Mascara telefone preservando últimos 4 dígitos. */
export function maskPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `••• ${digits.slice(-4)}`;
}
