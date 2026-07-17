/**
 * Testes de integração — Regra de conflito de horário (intra-link)
 *
 * Cobre o algoritmo PURO usado no Portal do Diretor (Fase 5) e replicado
 * em telas administrativas. Garante que o mesmo professor não pode ocupar
 * dois slots em turmas distintas com sobreposição real de tempo, inclusive
 * cross-turno (manhã × tarde quando os horários se tocam).
 */
import { describe, it, expect } from 'vitest';
import {
  detectIntraLinkConflicts,
  intervalsOverlap,
  toMin,
  type ScheduleSlot,
} from '@/features/rh/lib/scheduleConflicts';

const PROF_A = { key: 'ana silva|11999990001', name: 'Ana Silva' };
const PROF_B = { key: 'bruno costa|11999990002', name: 'Bruno Costa' };

function slot(over: Partial<ScheduleSlot>): ScheduleSlot {
  return {
    slotId: 'sl-' + Math.random().toString(36).slice(2, 7),
    classId: 'turmaX',
    subjectId: 'discY',
    turno: 'manha',
    weekday: 'MON',
    start: toMin('08:00'),
    end: toMin('09:00'),
    teacherKey: PROF_A.key,
    teacherName: PROF_A.name,
    ...over,
  };
}

describe('intervalsOverlap', () => {
  it('detecta sobreposição parcial', () => {
    expect(intervalsOverlap(60, 120, 90, 150)).toBe(true);
  });
  it('borda exata NÃO conta como conflito (intervalo aberto à direita)', () => {
    expect(intervalsOverlap(60, 120, 120, 180)).toBe(false);
  });
  it('intervalos disjuntos', () => {
    expect(intervalsOverlap(60, 90, 120, 150)).toBe(false);
  });
});

describe('detectIntraLinkConflicts', () => {
  it('NÃO acusa conflito para o mesmo professor em horários distintos', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', start: toMin('08:00'), end: toMin('09:00') }),
      slot({ classId: 't2', start: toMin('09:00'), end: toMin('10:00') }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('acusa conflito quando o mesmo professor está em 2 turmas no mesmo horário', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', start: toMin('08:00'), end: toMin('09:00') }),
      slot({ classId: 't2', start: toMin('08:00'), end: toMin('09:00') }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].teacherKey).toBe(PROF_A.key);
    expect(conflicts[0].overlapStart).toBe(toMin('08:00'));
    expect(conflicts[0].overlapEnd).toBe(toMin('09:00'));
  });

  it('acusa conflito CROSS-TURNO (manhã × tarde) com sobreposição', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', turno: 'manha', start: toMin('11:30'), end: toMin('12:30') }),
      slot({ classId: 't2', turno: 'tarde', start: toMin('12:00'), end: toMin('13:00') }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].sameTurno).toBe(false);
    expect(conflicts[0].overlapStart).toBe(toMin('12:00'));
    expect(conflicts[0].overlapEnd).toBe(toMin('12:30'));
  });

  it('NÃO acusa conflito em dias diferentes da semana', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', weekday: 'MON' }),
      slot({ classId: 't2', weekday: 'TUE' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('NÃO acusa conflito quando os slots são da MESMA turma (caso esperado: 2 aulas seguidas)', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', subjectId: 'd1' }),
      slot({ classId: 't1', subjectId: 'd2' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('professores DIFERENTES no mesmo horário/turmas distintas → não conflitam', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', teacherKey: PROF_A.key, teacherName: PROF_A.name }),
      slot({ classId: 't2', teacherKey: PROF_B.key, teacherName: PROF_B.name }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('ignora slots sem indicação de professor (teacherKey vazio)', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', teacherKey: '' }),
      slot({ classId: 't2', teacherKey: '' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('deduplica conflitos quando mais de 2 turmas batem no mesmo intervalo', () => {
    // 3 turmas para o mesmo professor no mesmo horário → C(3,2) = 3 pares.
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1' }),
      slot({ classId: 't2' }),
      slot({ classId: 't3' }),
    ]);
    expect(conflicts).toHaveLength(3);
    const keys = new Set(conflicts.map((c) => c.key));
    expect(keys.size).toBe(3); // chaves distintas (par de turmas ordenado)
  });
});

describe('ANP — isenção de conflito', () => {
  it('PRES × PRES sobrepostos = 1 conflito (controle)', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', classMode: 'PRESENCIAL' }),
      slot({ classId: 't2', classMode: 'PRESENCIAL' }),
    ]);
    expect(conflicts).toHaveLength(1);
  });
  it('ANP × PRES sobrepostos = 0 conflito', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', classMode: 'ANP' }),
      slot({ classId: 't2', classMode: 'PRESENCIAL' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
  it('PRES × ANP sobrepostos = 0 conflito', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', classMode: 'PRESENCIAL' }),
      slot({ classId: 't2', classMode: 'ANP' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
  it('ANP × ANP sobrepostos = 0 conflito', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1', classMode: 'ANP' }),
      slot({ classId: 't2', classMode: 'ANP' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
  it('classMode ausente é tratado como PRESENCIAL', () => {
    const conflicts = detectIntraLinkConflicts([
      slot({ classId: 't1' }),
      slot({ classId: 't2' }),
    ]);
    expect(conflicts).toHaveLength(1);
  });
});
