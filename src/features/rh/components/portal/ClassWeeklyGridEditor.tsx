import { Sun, Sunset, Moon, Eraser, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TimeSlot, Turno, durationMinutes, formatDuration } from '../../lib/defaultSchoolHours';
import { WEEKDAYS, Weekday } from '../../lib/calcGridDemand';

export interface SubjectOption {
  id: string;
  nome: string;
  /** Carga horária semanal em horas (vinda do cadastro de Disciplinas). */
  carga_horaria_semanal?: number | null;
}

export interface ScheduleSlot {
  id: string;
  classId: string;
  turno: Turno;
  weekday: Weekday;
  time_slot_id: string;
  subject_id: string;
  /** Marca a aula como ANP (Aula Não Presencial). Default false. */
  is_anp?: boolean;
}

interface TurnoVisual {
  label: string;
  icon: typeof Sun;
  /** chip colorido (badge de período / etiqueta secundária) */
  chip: string;
  /** período aproximado exibido no header */
  period: string;
  /** fundo suave para a faixa secundária e cabeçalho da tabela */
  softBg: string;
  /** cor da borda lateral grossa do card do turno */
  leftBorder: string;
  /** badge do ícone na tarja escura: fundo + ring na cor do turno */
  iconRing: string;
  /** cor do eyebrow "TURNO" sobre fundo escuro */
  eyebrow: string;
}

const TURNO_INFO: Record<Turno, TurnoVisual> = {
  manha: {
    label: 'Matutino',
    icon: Sun,
    chip: 'bg-amber-100 text-amber-800 border-amber-300',
    period: '07h–12h',
    softBg: 'bg-amber-50',
    leftBorder: 'border-l-amber-400',
    iconRing: 'bg-amber-100 text-amber-700 ring-2 ring-amber-300',
    eyebrow: 'text-amber-300',
  },
  tarde: {
    label: 'Vespertino',
    icon: Sunset,
    chip: 'bg-orange-100 text-orange-800 border-orange-300',
    period: '13h–18h',
    softBg: 'bg-orange-50',
    leftBorder: 'border-l-orange-400',
    iconRing: 'bg-orange-100 text-orange-700 ring-2 ring-orange-300',
    eyebrow: 'text-orange-300',
  },
  noite: {
    label: 'Noturno',
    icon: Moon,
    chip: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    period: '19h–22h',
    softBg: 'bg-indigo-50',
    leftBorder: 'border-l-indigo-500',
    iconRing: 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300',
    eyebrow: 'text-indigo-300',
  },
};

interface ClassWeeklyGridEditorProps {
  className: string;
  classId: string;
  /** turnos visíveis (1 normalmente, 2 quando integral) */
  turnos: Turno[];
  /** tempos disponíveis por turno */
  timeSlotsByTurno: Record<Turno, TimeSlot[]>;
  /** todos os slots da grade dessa turma */
  schedule: ScheduleSlot[];
  /** disciplinas do curso */
  subjects: SubjectOption[];
  /** Override por disciplina (subject_id → aulas/sem) declarado pelo diretor na Etapa 2.
   *  Quando ausente, usa-se `carga_horaria_semanal` do cadastro. */
  subjectWeeklyLoad?: Record<string, number>;
  includeSaturday: boolean;
  onToggleSaturday: (v: boolean) => void;
  /** seta/limpa a disciplina de uma célula (turno × weekday × time_slot) */
  onSetCell: (turno: Turno, weekday: Weekday, time_slot_id: string, subject_id: string | null) => void;
  /** marca/desmarca uma célula como ANP */
  onToggleAnp?: (turno: Turno, weekday: Weekday, time_slot_id: string, isAnp: boolean) => void;
  /** limpa todos os slots dessa turma */
  onClearAll: () => void;
}

export function ClassWeeklyGridEditor({
  className,
  classId,
  turnos,
  timeSlotsByTurno,
  schedule,
  subjects,
  subjectWeeklyLoad,
  includeSaturday,
  onToggleSaturday,
  onSetCell,
  onToggleAnp,
  onClearAll,
}: ClassWeeklyGridEditorProps) {
  const visibleDays = WEEKDAYS.filter((d) => includeSaturday || d.key !== 'SAT');

  function getCell(turno: Turno, weekday: Weekday, time_slot_id: string) {
    return schedule.find(
      (s) => s.classId === classId && s.turno === turno && s.weekday === weekday && s.time_slot_id === time_slot_id,
    );
  }
  function getCellSubjectId(turno: Turno, weekday: Weekday, time_slot_id: string): string {
    return getCell(turno, weekday, time_slot_id)?.subject_id ?? '';
  }

  /** Meta de aulas/sem priorizando o override declarado na Etapa 2. */
  function getTargetLessons(s: SubjectOption): number {
    const override = subjectWeeklyLoad?.[s.id];
    if (typeof override === 'number' && !Number.isNaN(override)) return Math.max(0, Math.floor(override));
    return Math.max(0, Math.floor(s.carga_horaria_semanal ?? 0));
  }

  // Stats simples
  const filled = schedule.filter((s) => s.classId === classId);
  const totalMin = filled.reduce((sum, s) => {
    const ts = timeSlotsByTurno[s.turno].find((t) => t.id === s.time_slot_id);
    return sum + (ts ? durationMinutes(ts.inicio, ts.fim) : 0);
  }, 0);

  // Contagem de aulas por disciplina (cada slot = 1 hora-aula, valor inteiro)
  const lessonsBySubject = new Map<string, number>();
  filled.forEach((s) => {
    lessonsBySubject.set(s.subject_id, (lessonsBySubject.get(s.subject_id) ?? 0) + 1);
  });
  const subjectStats = subjects.map((s) => {
    const allocLessons = lessonsBySubject.get(s.id) ?? 0; // nº de aulas alocadas
    const targetLessons = getTargetLessons(s);            // meta vinda do override ou cadastro
    let status: 'ok' | 'low' | 'over' | 'none' = 'none';
    if (targetLessons > 0) {
      if (allocLessons > targetLessons) status = 'over';
      else if (allocLessons === targetLessons) status = 'ok';
      else status = 'low';
    }
    const remaining = Math.max(0, targetLessons - allocLessons);
    const pct = targetLessons > 0 ? Math.min(100, Math.round((allocLessons / targetLessons) * 100)) : 0;
    return { ...s, allocLessons, targetLessons, status, remaining, pct };
  });

  // Ordena: faltantes primeiro (mais faltam → menos faltam), depois completas, depois excedidas
  const orderedStats = [...subjectStats].sort((a, b) => {
    const rank = (st: typeof a.status) => (st === 'low' ? 0 : st === 'ok' ? 1 : st === 'over' ? 2 : 3);
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return b.remaining - a.remaining;
  });

  // Totais agregados (em aulas)
  const totalAlloc = subjectStats.reduce((sum, s) => sum + s.allocLessons, 0);
  const totalTarget = subjectStats.reduce((sum, s) => sum + s.targetLessons, 0);
  const totalPct = totalTarget > 0 ? Math.min(100, Math.round((totalAlloc / totalTarget) * 100)) : 0;

  // Disciplinas que já atingiram (ou ultrapassaram) a meta de aulas
  const fullSubjectIds = new Set(
    subjectStats.filter((s) => s.targetLessons > 0 && s.allocLessons >= s.targetLessons).map((s) => s.id),
  );

  function getOptionsForCell(currentValue: string) {
    return subjects
      .filter((s) => s.id === currentValue || !fullSubjectIds.has(s.id))
      .map((s) => {
        const target = getTargetLessons(s);
        return {
          value: s.id,
          label: target > 0 ? `${s.nome} (${target}h/sem)` : s.nome,
        };
      });
  }

  const isComplete = totalTarget > 0 && totalPct === 100;

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-colors ${
      isComplete ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-[#1B1E2C]/10'
    }`}>
      {/* Cabeçalho da turma — escuro Neovale */}
      <div className="px-4 py-3 bg-[#1B1E2C] text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFDA45] text-[#1B1E2C]">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#FFDA45] font-bold">Turma</div>
              <div className="font-bold text-white text-lg break-words leading-tight">{className || '(sem nome)'}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/10 text-white hover:bg-white/10 border border-white/15 font-mono text-[11px]">
              {filled.length} aula{filled.length === 1 ? '' : 's'} · {formatDuration(totalMin)}/sem
            </Badge>
            <div className="flex items-center gap-2 rounded-md bg-white/10 border border-white/15 px-2 py-1">
              <Switch id={`sat-${classId}`} checked={includeSaturday} onCheckedChange={onToggleSaturday} />
              <Label htmlFor={`sat-${classId}`} className="text-xs text-white/85 cursor-pointer select-none">Sábado</Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={filled.length === 0}
              className="text-white/75 hover:text-white hover:bg-red-500/30 disabled:opacity-40"
            >
              <Eraser className="h-3 w-3 mr-1" /> Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Painel de Carga Horária por Disciplina */}
      {subjectStats.some((s) => s.targetLessons > 0) && (
        <div className="px-4 py-3 border-b border-[#1B1E2C]/10 bg-[#FAFBFD] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#1B1E2C]/65 font-bold">
              Carga horária por disciplina
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#1B1E2C]/75 font-mono font-semibold">
                {totalAlloc} / {totalTarget} aulas
              </span>
              <div className="w-28 h-2 bg-[#1B1E2C]/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isComplete ? 'bg-emerald-500' : totalPct > 0 ? 'bg-[#FFDA45]' : 'bg-[#1B1E2C]/20'
                  }`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <span className={`text-[11px] font-mono font-bold w-9 text-right ${isComplete ? 'text-emerald-700' : 'text-[#1B1E2C]/80'}`}>
                {totalPct}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {orderedStats.map((s) => {
              const target = s.targetLessons;
              const alloc = s.allocLessons;
              const remaining = s.remaining;
              const isOk = s.status === 'ok';
              const isOver = s.status === 'over';
              const isLow = s.status === 'low' && alloc > 0;
              const isEmpty = s.status === 'low' && alloc === 0;

              const borderCls = isOver
                ? 'border-red-300 bg-red-50'
                : isOk
                  ? 'border-emerald-300 bg-emerald-50'
                  : isLow
                    ? 'border-[#FFDA45] bg-[#FFFCEB]'
                    : 'border-[#1B1E2C]/10 bg-white';
              const barCls = isOver
                ? 'bg-red-500'
                : isOk
                  ? 'bg-emerald-500'
                  : isLow
                    ? 'bg-[#FFDA45]'
                    : 'bg-[#1B1E2C]/20';
              const statusLabel = isOver
                ? `+${alloc - target} excedida`
                : isOk
                  ? '✓ Completa'
                  : isEmpty
                    ? `Faltam ${remaining}`
                    : `Faltam ${remaining}`;
              const statusColor = isOver
                ? 'text-red-700'
                : isOk
                  ? 'text-emerald-700'
                  : isLow
                    ? 'text-[#1B1E2C]'
                    : 'text-[#1B1E2C]/55';

              return (
                <div
                  key={s.id}
                  className={`rounded-md border ${borderCls} px-2.5 py-2 space-y-1.5 transition-colors`}
                  title={
                    isOver
                      ? `Excedeu em ${alloc - target} aula(s) (${alloc}/${target})`
                      : isOk
                        ? `Carga horária completa (${alloc}/${target} aulas)`
                        : `Faltam ${remaining} aula(s) para completar (${alloc}/${target})`
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] font-semibold text-[#1B1E2C] leading-tight break-words flex-1 min-w-0">
                      {s.nome}
                    </div>
                    <div className="text-[10px] font-mono font-semibold text-[#1B1E2C]/65 whitespace-nowrap shrink-0">
                      {alloc}/{target}h
                    </div>
                  </div>
                  <div className="h-1 bg-[#1B1E2C]/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${barCls}`}
                      style={{ width: `${Math.min(100, s.pct)}%` }}
                    />
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                    {statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-3 sm:p-4 space-y-5 bg-white">
        {turnos.map((turno) => {
          const meta = TURNO_INFO[turno];
          const { label, icon: Icon, chip, period, softBg, leftBorder, iconRing, eyebrow } = meta;
          const tempos = timeSlotsByTurno[turno];
          if (tempos.length === 0) return null;
          const intervaloTotal = `${tempos[0].inicio} – ${tempos[tempos.length - 1].fim}`;

          return (
            <div
              key={turno}
              className={`rounded-xl border border-[#1B1E2C]/10 border-l-4 ${leftBorder} bg-white overflow-hidden shadow-sm`}
            >
              {/* Tarja escura de destaque do turno */}
              <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 bg-[#1B1E2C] text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconRing}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className={`text-[10px] uppercase tracking-[0.2em] font-bold ${eyebrow}`}>
                      Turno
                    </div>
                    <div className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                      {label}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${chip} text-[10px] font-mono font-bold border ml-1`}
                  >
                    {period}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden md:inline text-[11px] font-mono text-white/60">
                    {intervaloTotal}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-white/25 bg-white/5 text-white/85 font-mono text-[10px] px-1.5"
                  >
                    {tempos.length} tempo{tempos.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              </div>

              {/* Faixa secundária colorida — separa visualmente os turnos */}
              <div className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-1 ${softBg} border-b border-[#1B1E2C]/10`}>
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B1E2C]/70">
                  Grade do turno
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#1B1E2C]/50 font-semibold hidden sm:inline">
                  Tempos do turno
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed min-w-[640px]">
                  <colgroup>
                    <col className="w-[110px] sm:w-[130px]" />
                    {visibleDays.map((d) => (
                      <col key={d.key} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className={softBg}>
                      <th className={`text-left px-2 py-2 font-bold text-[#1B1E2C]/70 text-[10px] uppercase tracking-wide border-b border-[#1B1E2C]/10 sticky left-0 ${softBg} z-10`}>
                        Tempo
                      </th>
                      {visibleDays.map((d) => (
                        <th key={d.key} className="text-left px-2 py-2 font-bold text-[#1B1E2C]/70 text-[10px] uppercase tracking-wide border-b border-[#1B1E2C]/10">
                          <span className="hidden sm:inline">{d.label}</span>
                          <span className="sm:hidden">{d.label.slice(0, 3)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tempos.map((ts, rowIdx) => (
                      <tr
                        key={ts.id}
                        className={`border-b border-[#1B1E2C]/5 last:border-0 ${
                          rowIdx % 2 === 1 ? 'bg-[#FAFBFD]/60' : 'bg-white'
                        }`}
                      >
                        <td className={`px-2 py-1.5 align-middle sticky left-0 z-10 ${
                          rowIdx % 2 === 1 ? 'bg-[#FAFBFD]' : 'bg-white'
                        }`}>
                          <div className="font-bold text-[#1B1E2C] text-[11px] sm:text-xs leading-tight">{ts.nome}</div>
                          <div className="text-[#1B1E2C]/55 font-mono text-[10px]">
                            {ts.inicio}–{ts.fim}
                          </div>
                        </td>
                        {visibleDays.map((d) => {
                          const cell = getCell(turno, d.key, ts.id);
                          const v = cell?.subject_id ?? '';
                          const filledCell = !!v;
                          const isAnp = !!cell?.is_anp;
                          const anpId = `anp-${classId}-${turno}-${d.key}-${ts.id}`;
                          return (
                            <td key={d.key} className="px-1 py-1 align-middle">
                              <div className="space-y-1">
                                <SearchableSelect
                                  value={v || undefined}
                                  onValueChange={(val) => onSetCell(turno, d.key, ts.id, val || null)}
                                  options={getOptionsForCell(v)}
                                  placeholder="—"
                                  searchPlaceholder="Buscar disciplina…"
                                  emptyMessage="Sem disciplinas"
                                  allowClear
                                  triggerClassName={`h-8 text-xs w-full transition-colors ${
                                    filledCell
                                      ? isAnp
                                        ? 'bg-indigo-50 border-indigo-400 text-[#1B1E2C] font-semibold hover:bg-indigo-100 ring-1 ring-indigo-300'
                                        : 'bg-[#FFDA45]/25 border-[#FFDA45] text-[#1B1E2C] font-semibold hover:bg-[#FFDA45]/40'
                                      : 'bg-white border-[#1B1E2C]/15 text-[#1B1E2C]/70 hover:border-[#FFDA45]'
                                  }`}
                                />
                                {filledCell && onToggleAnp && (
                                  <label
                                    htmlFor={anpId}
                                    className={`flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 transition-colors select-none ${
                                      isAnp
                                        ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
                                        : 'text-[#1B1E2C]/55 hover:bg-[#1B1E2C]/5'
                                    }`}
                                    title="Marcar como Aula Não Presencial"
                                  >
                                    <Checkbox
                                      id={anpId}
                                      checked={isAnp}
                                      onCheckedChange={(c) => onToggleAnp(turno, d.key, ts.id, c === true)}
                                      className="h-3 w-3"
                                    />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">ANP</span>
                                  </label>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
