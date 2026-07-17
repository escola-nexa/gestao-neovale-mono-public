/**
 * Padrões de horários (tempos) por turno usados no Portal do Diretor.
 * Replica o layout das imagens de referência (matutino, vespertino, noturno),
 * mas o diretor pode editar/adicionar/remover livremente.
 */

export type Turno = 'manha' | 'tarde' | 'noite';

export interface TimeSlot {
  id: string;
  nome: string;     // ex: "1º tempo", "5º tempo - ANP"
  inicio: string;   // "HH:MM"
  fim: string;      // "HH:MM"
}

function uid() {
  return crypto.randomUUID();
}

export function defaultMatutino(): TimeSlot[] {
  return [
    { id: uid(), nome: '1º tempo', inicio: '07:00', fim: '07:50' },
    { id: uid(), nome: '2º tempo', inicio: '07:50', fim: '08:40' },
    { id: uid(), nome: '3º tempo', inicio: '08:40', fim: '09:30' },
    { id: uid(), nome: '4º tempo', inicio: '09:40', fim: '10:30' },
    { id: uid(), nome: '5º tempo', inicio: '10:30', fim: '11:20' },
    { id: uid(), nome: '6º tempo', inicio: '11:20', fim: '12:10' },
  ];
}

export function defaultVespertino(): TimeSlot[] {
  return [
    { id: uid(), nome: '1º tempo', inicio: '13:00', fim: '13:50' },
    { id: uid(), nome: '2º tempo', inicio: '13:50', fim: '14:40' },
    { id: uid(), nome: '3º tempo', inicio: '14:40', fim: '15:30' },
    { id: uid(), nome: '4º tempo', inicio: '15:40', fim: '16:30' },
    { id: uid(), nome: '5º tempo', inicio: '16:30', fim: '17:20' },
    { id: uid(), nome: '6º tempo', inicio: '17:20', fim: '18:10' },
  ];
}

export function defaultNoturno(): TimeSlot[] {
  return [
    { id: uid(), nome: '1º tempo', inicio: '18:30', fim: '19:20' },
    { id: uid(), nome: '2º tempo', inicio: '19:20', fim: '20:10' },
    { id: uid(), nome: '3º tempo', inicio: '20:20', fim: '21:10' },
    { id: uid(), nome: '4º tempo', inicio: '21:10', fim: '22:00' },
    { id: uid(), nome: '5º tempo - ANP', inicio: '22:00', fim: '22:50' },
    { id: uid(), nome: '6º tempo - ANP', inicio: '22:50', fim: '23:40' },
  ];
}

export function defaultTimeSlotsByTurno(): Record<Turno, TimeSlot[]> {
  return {
    manha: defaultMatutino(),
    tarde: defaultVespertino(),
    noite: defaultNoturno(),
  };
}

/** Cria 1 novo tempo "limpo" para o diretor preencher. */
export function emptyTimeSlot(nome = 'Novo tempo'): TimeSlot {
  return { id: uid(), nome, inicio: '07:00', fim: '07:50' };
}

/** Diferença em minutos entre dois "HH:MM"; 0 se inválido. */
export function durationMinutes(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  if ([hi, mi, hf, mf].some(n => Number.isNaN(n))) return 0;
  const start = hi * 60 + mi;
  const end = hf * 60 + mf;
  return Math.max(0, end - start);
}

/** Mostra duração em "Xh Ymin" ou "Ymin". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
