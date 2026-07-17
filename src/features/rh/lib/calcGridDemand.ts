/**
 * Cálculo de demanda baseado na grade horária preenchida no Portal do Diretor.
 *
 * Regra:
 *  - Cada célula da grade (turma × dia × tempo × disciplina) é 1 SLOT.
 *  - Cada slot precisa de 1 indicação de professor (com Nome+Telefone+Formação).
 *  - O mesmo professor pode aparecer em vários slots (reuso explícito por nome).
 *  - Carga horária total = soma das durações de cada slot, em horas.
 *  - Profissionais únicos sugeridos = ceil(CH_total / teto_ch_professor).
 */

import { TimeSlot, Turno, durationMinutes } from './defaultSchoolHours';

export interface GradeDemand {
  total_slots: number;
  total_minutos: number;
  total_horas: number;
  profissionais_sugeridos: number;
  /** Maior nº de turmas com aula ao mesmo tempo (pico de simultaneidade). */
  pico_simultaneidade: number;
  /** Quanto a regra de simultaneidade aumentou em relação ao mínimo por carga horária. */
  ajuste_por_conflito: number;
}

/** Slot mínimo necessário para o cálculo de simultaneidade. */
export interface ScheduleLite {
  classId: string;
  turno: Turno;
  weekday: 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT';
  time_slot_id: string;
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Calcula o pico de simultaneidade: o maior número de TURMAS distintas
 * com aula ao mesmo tempo (mesmo dia + intervalo de horário sobreposto).
 *
 * Como um professor não pode estar em duas turmas ao mesmo tempo,
 * esse pico é o piso mínimo de professores necessários.
 */
export function calcPeakSimultaneity(
  slots: ScheduleLite[],
  timeSlotsByTurno: Record<Turno, TimeSlot[]>,
): number {
  if (slots.length === 0) return 0;
  // Resolve cada slot para { weekday, classId, start, end } em minutos
  const resolved: { weekday: string; classId: string; start: number; end: number }[] = [];
  for (const s of slots) {
    const ts = timeSlotsByTurno[s.turno]?.find((t) => t.id === s.time_slot_id);
    if (!ts) continue;
    resolved.push({
      weekday: s.weekday,
      classId: s.classId,
      start: timeToMin(ts.inicio),
      end: timeToMin(ts.fim),
    });
  }
  if (resolved.length === 0) return 0;

  // Para cada dia, faz sweep-line nos eventos (start=+1, end=-1) por TURMA distinta.
  // Como uma mesma turma pode ter dois slots colados, contamos turmas distintas
  // ativas em cada instante (não nº de aulas).
  const byDay = new Map<string, { classId: string; start: number; end: number }[]>();
  for (const r of resolved) {
    if (!byDay.has(r.weekday)) byDay.set(r.weekday, []);
    byDay.get(r.weekday)!.push(r);
  }

  let peak = 0;
  byDay.forEach((items) => {
    // Constrói pontos de tempo únicos (starts e ends).
    const points = new Set<number>();
    items.forEach((it) => { points.add(it.start); points.add(it.end); });
    const sorted = Array.from(points).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const t = sorted[i];
      const tNext = sorted[i + 1];
      if (tNext <= t) continue;
      // turmas distintas ativas no intervalo [t, tNext)
      const active = new Set<string>();
      for (const it of items) {
        if (it.start <= t && it.end > t) active.add(it.classId);
      }
      if (active.size > peak) peak = active.size;
    }
  });

  return peak;
}

/**
 * @param slotsCount número de slots preenchidos
 * @param totalMinutos soma das durações em minutos
 * @param tetoChProfessor horas-aula/semana por professor (ex: 24)
 * @param picoSimultaneidade maior nº de turmas com aula ao mesmo tempo (opcional)
 *
 * Sugestão final = max(ceil(horas/teto), pico_simultaneidade).
 * Isso garante que mesmo com pouca CH, se houver choque de horário
 * entre turmas, o nº de professores sugeridos respeita a regra de
 * "1 professor não pode estar em 2 turmas ao mesmo tempo".
 */
export function calcGridDemand(
  slotsCount: number,
  totalMinutos: number,
  tetoChProfessor: number,
  picoSimultaneidade = 0,
): GradeDemand {
  const horas = totalMinutos / 60;
  const teto = tetoChProfessor > 0 ? tetoChProfessor : 24;
  const porCarga = slotsCount === 0 ? 0 : Math.max(1, Math.ceil(horas / teto));
  const sugeridos = slotsCount === 0 ? 0 : Math.max(porCarga, picoSimultaneidade);
  return {
    total_slots: slotsCount,
    total_minutos: totalMinutos,
    total_horas: Math.round(horas * 10) / 10,
    profissionais_sugeridos: sugeridos,
    pico_simultaneidade: picoSimultaneidade,
    ajuste_por_conflito: Math.max(0, sugeridos - porCarga),
  };
}

/** Soma minutos de uma lista de slots conhecidos pelo seu time_slot_id. */
export function sumDurationFromSlots(
  slotIds: string[],
  pool: Record<string, TimeSlot>,
): number {
  let total = 0;
  for (const id of slotIds) {
    const ts = pool[id];
    if (!ts) continue;
    total += durationMinutes(ts.inicio, ts.fim);
  }
  return total;
}

export const WEEKDAYS: Array<{ key: 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'; label: string }> = [
  { key: 'MON', label: 'Segunda' },
  { key: 'TUE', label: 'Terça' },
  { key: 'WED', label: 'Quarta' },
  { key: 'THU', label: 'Quinta' },
  { key: 'FRI', label: 'Sexta' },
  { key: 'SAT', label: 'Sábado' },
];

export type Weekday = (typeof WEEKDAYS)[number]['key'];
