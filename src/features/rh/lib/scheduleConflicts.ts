/**
 * Helpers PUROS de detecção de conflitos de horário de professores.
 *
 * Cobrem os 3 cenários que o sistema usa para impedir sobreposição:
 *
 *  1) INTRA-LINK   — mesmo professor em 2 turmas do MESMO link de indicação.
 *  2) CROSS-SCHOOL — mesmo professor já alocado em OUTRA escola
 *                    (multi-tenant via filtro por `organization_id`).
 *  3) ALLOCATION   — bloqueio antes de gravar no `weekly_teaching_models`
 *                    quando há overlap real no mesmo (weekday, intervalo).
 *
 * Estes módulos NÃO importam React nem Supabase — são chamados pela UI
 * (ExternalSchoolIndicationPage, SchoolTimeSlotsPage, etc.) e replicados
 * no SQL do RPC `check_teacher_external_conflicts` para coerência.
 */

export type WeekdayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export type Turno = 'manha' | 'tarde' | 'noite';

export interface ScheduleSlot {
  slotId: string;
  classId: string;
  subjectId: string;
  turno: Turno;
  weekday: WeekdayCode;
  /** minutos desde 00:00 — fechado à esquerda */
  start: number;
  /** minutos desde 00:00 — aberto à direita */
  end: number;
  /** identidade do professor; vazio = slot sem indicação */
  teacherKey: string;
  teacherName?: string;
  /** ANP (Aula Não Presencial) NUNCA gera conflito. Default: PRESENCIAL. */
  classMode?: 'PRESENCIAL' | 'ANP';
}

export interface IntraLinkConflict {
  key: string;
  teacherKey: string;
  teacherName: string;
  weekday: WeekdayCode;
  overlapStart: number;
  overlapEnd: number;
  sameTurno: boolean;
  sideA: { slotId: string; classId: string; subjectId: string; turno: Turno };
  sideB: { slotId: string; classId: string; subjectId: string; turno: Turno };
}

/** True se [aStart,aEnd) e [bStart,bEnd) se sobrepõem. */
export function intervalsOverlap(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** "HH:MM" → minutos. */
export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Detecta TODOS os pares de slots em CONFLITO dentro do mesmo link
 * (mesmo professor, mesmo dia, intervalos sobrepostos, turmas distintas).
 * Cobre cross-turno automaticamente.
 */
export function detectIntraLinkConflicts(slots: ScheduleSlot[]): IntraLinkConflict[] {
  const valid = slots.filter((s) => s.teacherKey && s.teacherKey !== '|');
  const byProfDay = new Map<string, ScheduleSlot[]>();
  valid.forEach((s) => {
    const k = `${s.teacherKey}|${s.weekday}`;
    const arr = byProfDay.get(k) ?? [];
    arr.push(s);
    byProfDay.set(k, arr);
  });

  const seen = new Set<string>();
  const out: IntraLinkConflict[] = [];
  byProfDay.forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.classId === b.classId) continue;
        // ANP isenta: aulas não-presenciais nunca conflitam.
        if ((a.classMode ?? 'PRESENCIAL') === 'ANP') continue;
        if ((b.classMode ?? 'PRESENCIAL') === 'ANP') continue;
        if (!intervalsOverlap(a.start, a.end, b.start, b.end)) continue;
        const ovStart = Math.max(a.start, b.start);
        const ovEnd = Math.min(a.end, b.end);
        const sortedClasses = [a.classId, b.classId].sort().join('+');
        const key = `${a.teacherKey}|${a.weekday}|${ovStart}|${ovEnd}|${sortedClasses}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          key,
          teacherKey: a.teacherKey,
          teacherName: a.teacherName ?? b.teacherName ?? '',
          weekday: a.weekday,
          overlapStart: ovStart,
          overlapEnd: ovEnd,
          sameTurno: a.turno === b.turno,
          sideA: { slotId: a.slotId, classId: a.classId, subjectId: a.subjectId, turno: a.turno },
          sideB: { slotId: b.slotId, classId: b.classId, subjectId: b.subjectId, turno: b.turno },
        });
      }
    }
  });
  return out;
}

export interface AllocationCandidate {
  teacherKey: string;
  weekday: WeekdayCode;
  start: number;
  end: number;
  /** ANP nunca conflita. Default: PRESENCIAL. */
  classMode?: 'PRESENCIAL' | 'ANP';
}

export interface ExistingAllocation {
  /** discriminador multi-tenant — só conflitam alocações da MESMA org. */
  organizationId: string;
  schoolId: string;
  teacherKey: string;
  weekday: WeekdayCode;
  start: number;
  end: number;
  /** ANP nunca conflita. Default: PRESENCIAL. */
  classMode?: 'PRESENCIAL' | 'ANP';
}

/**
 * Decide se um candidato a alocação CONFLITA com alguma alocação existente
 * dentro da MESMA organização (multi-tenant). Alocações de outras orgs são
 * ignoradas mesmo que tenham o mesmo `teacherKey`, garantindo isolamento.
 *
 * Retorna a lista das alocações conflitantes (vazia = livre).
 */
export function findAllocationConflicts(
  candidate: AllocationCandidate,
  existing: ExistingAllocation[],
  organizationId: string,
): ExistingAllocation[] {
  // ANP isenta — candidato ANP nunca conflita.
  if ((candidate.classMode ?? 'PRESENCIAL') === 'ANP') return [];
  return existing.filter((e) =>
    e.organizationId === organizationId
    && e.teacherKey === candidate.teacherKey
    && e.weekday === candidate.weekday
    && (e.classMode ?? 'PRESENCIAL') === 'PRESENCIAL'
    && intervalsOverlap(candidate.start, candidate.end, e.start, e.end),
  );
}

/** True se a alocação é PERMITIDA (sem conflito) na org dada. */
export function isAllocationAllowed(
  candidate: AllocationCandidate,
  existing: ExistingAllocation[],
  organizationId: string,
): boolean {
  return findAllocationConflicts(candidate, existing, organizationId).length === 0;
}
