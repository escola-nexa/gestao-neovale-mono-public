/**
 * Testes de integração — Bloqueio por alocação (cross-school + multi-tenant)
 *
 * Garante que ao gravar um novo slot em `weekly_teaching_models`:
 *  • Conflitamos APENAS com alocações da MESMA organização (RLS multi-tenant);
 *  • Conflito é detectado entre escolas distintas da mesma org;
 *  • Borda exata (08:00–09:00 vs 09:00–10:00) NÃO é conflito.
 *
 * O algoritmo testado é o mesmo replicado pelo RPC SQL
 * `check_teacher_external_conflicts`.
 */
import { describe, it, expect } from 'vitest';
import {
  findAllocationConflicts,
  isAllocationAllowed,
  toMin,
  type AllocationCandidate,
  type ExistingAllocation,
} from '@/features/rh/lib/scheduleConflicts';
import { computeRequiredPlanning } from '@/features/grade-horaria/utils/planningRule';

const ORG_A = 'org-aaaa';
const ORG_B = 'org-bbbb';
const PROF_KEY = 'ana silva|11999990001';

const candidate: AllocationCandidate = {
  teacherKey: PROF_KEY,
  weekday: 'MON',
  start: toMin('08:00'),
  end: toMin('09:00'),
};

function alloc(over: Partial<ExistingAllocation>): ExistingAllocation {
  return {
    organizationId: ORG_A,
    schoolId: 'esc-1',
    teacherKey: PROF_KEY,
    weekday: 'MON',
    start: toMin('08:00'),
    end: toMin('09:00'),
    ...over,
  };
}

describe('findAllocationConflicts — multi-tenant', () => {
  it('bloqueia conflito na MESMA escola/org', () => {
    const conflicts = findAllocationConflicts(
      candidate,
      [alloc({ schoolId: 'esc-1' })],
      ORG_A,
    );
    expect(conflicts).toHaveLength(1);
    expect(isAllocationAllowed(candidate, [alloc({ schoolId: 'esc-1' })], ORG_A)).toBe(false);
  });

  it('bloqueia conflito CROSS-ESCOLA na MESMA org', () => {
    const existing = [alloc({ schoolId: 'esc-2' })];
    expect(findAllocationConflicts(candidate, existing, ORG_A)).toHaveLength(1);
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(false);
  });

  it('IGNORA conflito de OUTRA organização (isolamento multi-tenant)', () => {
    const existing = [alloc({ organizationId: ORG_B, schoolId: 'esc-9' })];
    expect(findAllocationConflicts(candidate, existing, ORG_A)).toHaveLength(0);
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(true);
  });

  it('considera APENAS alocações da org passada — nunca vaza dado entre orgs', () => {
    const existing = [
      alloc({ organizationId: ORG_A, schoolId: 'esc-1' }),
      alloc({ organizationId: ORG_B, schoolId: 'esc-2' }),
    ];
    // Pergunta na perspectiva da Org B → só vê a alocação da Org B.
    const fromB = findAllocationConflicts(candidate, existing, ORG_B);
    expect(fromB).toHaveLength(1);
    expect(fromB[0].organizationId).toBe(ORG_B);
  });

  it('borda exata (fim==início) NÃO é conflito', () => {
    const existing = [alloc({ start: toMin('07:00'), end: toMin('08:00') })];
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(true);
  });

  it('dia diferente NÃO é conflito', () => {
    const existing = [alloc({ weekday: 'TUE' })];
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(true);
  });

  it('professor diferente NÃO é conflito', () => {
    const existing = [alloc({ teacherKey: 'outro|0000000' })];
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(true);
  });

  it('overlap parcial é detectado', () => {
    const existing = [alloc({ start: toMin('08:30'), end: toMin('09:30') })];
    expect(isAllocationAllowed(candidate, existing, ORG_A)).toBe(false);
  });
});

describe('computeRequiredPlanning — regra oficial 1/3 (canônica)', () => {
  it('0 aulas → 0 PLANNING', () => {
    expect(computeRequiredPlanning(0)).toBe(0);
  });
  it('1 ou 2 aulas → mínimo 1 PLANNING', () => {
    expect(computeRequiredPlanning(1)).toBe(1);
    expect(computeRequiredPlanning(2)).toBe(1);
  });
  it('arredonda matematicamente para o inteiro mais próximo', () => {
    expect(computeRequiredPlanning(3)).toBe(1);  // 1.0
    expect(computeRequiredPlanning(4)).toBe(1);  // 1.33 → 1
    expect(computeRequiredPlanning(5)).toBe(2);  // 1.66 → 2
    expect(computeRequiredPlanning(6)).toBe(2);  // 2.0
    expect(computeRequiredPlanning(9)).toBe(3);  // 3.0
    expect(computeRequiredPlanning(10)).toBe(3); // 3.33 → 3
    expect(computeRequiredPlanning(11)).toBe(4); // 3.66 → 4
  });
  it('sem teto superior — escala linear', () => {
    expect(computeRequiredPlanning(30)).toBe(10);
    expect(computeRequiredPlanning(60)).toBe(20);
  });
});

describe('ANP — isenção em findAllocationConflicts', () => {
  it('candidato ANP nunca conflita, mesmo com PRES existente sobreposto', () => {
    const conflicts = findAllocationConflicts(
      { ...candidate, classMode: 'ANP' },
      [alloc({ classMode: 'PRESENCIAL' })],
      ORG_A,
    );
    expect(conflicts).toHaveLength(0);
  });
  it('existente ANP é ignorado (candidato PRES não conflita)', () => {
    const conflicts = findAllocationConflicts(
      { ...candidate, classMode: 'PRESENCIAL' },
      [alloc({ classMode: 'ANP' })],
      ORG_A,
    );
    expect(conflicts).toHaveLength(0);
  });
  it('ANP × ANP — nenhum conflito', () => {
    const conflicts = findAllocationConflicts(
      { ...candidate, classMode: 'ANP' },
      [alloc({ classMode: 'ANP' })],
      ORG_A,
    );
    expect(conflicts).toHaveLength(0);
  });
  it('PRES × PRES sobrepostos = 1 conflito (controle)', () => {
    const conflicts = findAllocationConflicts(
      { ...candidate, classMode: 'PRESENCIAL' },
      [alloc({ classMode: 'PRESENCIAL' })],
      ORG_A,
    );
    expect(conflicts).toHaveLength(1);
  });
  it('isAllocationAllowed retorna true para candidato ANP', () => {
    expect(isAllocationAllowed(
      { ...candidate, classMode: 'ANP' },
      [alloc({ classMode: 'PRESENCIAL' })],
      ORG_A,
    )).toBe(true);
  });
});
