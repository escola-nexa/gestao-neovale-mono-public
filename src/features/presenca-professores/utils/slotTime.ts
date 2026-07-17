/**
 * Formatação fiel à Grade Horária.
 *
 * Os horários em `teacher_attendance_entries.scheduled_*` são gerados no
 * servidor (UTC) como `(occurrence_date::timestamp + slot.start_time)::timestamptz`,
 * o que significa que os componentes "parede" do horário ficam preservados em UTC.
 *
 * Formatá-los na timezone do navegador (BRT, UTC-3) deslocaria o relógio
 * (07:00 da grade vira 04:00). Por isso forçamos `timeZone: 'UTC'` para
 * recuperar exatamente o mesmo `HH:mm` cadastrado em `school_time_slots`.
 */

const BRAZIL_WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatSlotTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hourCycle: 'h23',
  });
}

export function formatSlotRange(startIso: string, endIso: string): string {
  return `${formatSlotTime(startIso)} – ${formatSlotTime(endIso)}`;
}

/** Ex.: "22/05 qui" */
export function formatSlotDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const weekday = BRAZIL_WEEKDAYS_SHORT[d.getUTCDay()];
  return `${day}/${month} ${weekday}`;
}

/** Ex.: "22/mai/2026" */
export function formatSlotDateLong(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_SHORT[d.getUTCMonth()];
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

export function minutesToHm(min: number): string {
  const m = Math.max(0, Math.round(min || 0));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}
