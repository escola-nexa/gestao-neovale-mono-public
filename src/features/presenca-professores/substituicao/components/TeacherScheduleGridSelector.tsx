import { useMemo } from 'react';
import { Clock, CheckSquare, Square, School as SchoolIcon, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ProfessorWeeklyClass,
  WEEKDAYS_PT,
  longWeekdayLabel,
  weekdayFromDateString,
} from '../hooks/useProfessorWeeklyGrid';
import type { Weekday } from '@/types/academic';

interface Props {
  classes: ProfessorWeeklyClass[];
  activeDate: string;
  selectedIds: Set<string>;
  onToggle: (cls: ProfessorWeeklyClass) => void;
  /** Marca/desmarca todas as aulas elegíveis (do dia ativo) */
  onToggleAllActiveDay: (mode: 'select' | 'clear') => void;
  /** Opcional: filtro por escola (vazio = todas) */
  schoolFilter?: string;
}

/** Cores estáveis por escola via hash do id. */
function colorForSchool(schoolId: string): { bg: string; ring: string; chip: string } {
  const palette = [
    { bg: 'bg-blue-50 dark:bg-blue-950/30',     ring: 'ring-blue-300',     chip: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'ring-emerald-300', chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' },
    { bg: 'bg-amber-50 dark:bg-amber-950/30',   ring: 'ring-amber-300',    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
    { bg: 'bg-violet-50 dark:bg-violet-950/30', ring: 'ring-violet-300',   chip: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100' },
    { bg: 'bg-rose-50 dark:bg-rose-950/30',     ring: 'ring-rose-300',     chip: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100' },
    { bg: 'bg-cyan-50 dark:bg-cyan-950/30',     ring: 'ring-cyan-300',     chip: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100' },
  ];
  let h = 0;
  for (let i = 0; i < schoolId.length; i++) h = (h * 31 + schoolId.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function TeacherScheduleGridSelector({
  classes, activeDate, selectedIds, onToggle, onToggleAllActiveDay, schoolFilter,
}: Props) {
  const activeWd: Weekday | null = weekdayFromDateString(activeDate);
  const activeWdLabel = longWeekdayLabel(activeDate);

  const filtered = useMemo(
    () => classes.filter(c => !schoolFilter || c.school_id === schoolFilter),
    [classes, schoolFilter]
  );

  // Quais dias da semana têm aulas?
  const presentWeekdays = useMemo(() => {
    const s = new Set<Weekday>();
    filtered.forEach(c => s.add(c.weekday));
    return WEEKDAYS_PT.filter(w => s.has(w.db));
  }, [filtered]);

  // Linhas = tempos únicos ordenados por slot_number, depois start_time.
  // Key: school_time_slot_id ?? `${start_time}-${end_time}-${slot_label}`
  type RowKey = string;
  interface Row {
    key: RowKey;
    label: string;
    slot_number: number | null;
    start: string;
    end: string;
  }
  const rows: Row[] = useMemo(() => {
    const map = new Map<RowKey, Row>();
    filtered.forEach(c => {
      const key = c.school_time_slot_id ?? `${c.start_time}-${c.end_time}-${c.slot_label}`;
      if (!map.has(key)) {
        map.set(key, {
          key, label: c.slot_label, slot_number: c.slot_number,
          start: c.start_time, end: c.end_time,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.slot_number ?? 99) - (b.slot_number ?? 99) || a.start.localeCompare(b.start)
    );
  }, [filtered]);

  // Mapa célula (rowKey, weekday) -> aulas
  const cellMap = useMemo(() => {
    const m = new Map<string, ProfessorWeeklyClass[]>();
    filtered.forEach(c => {
      const rk = c.school_time_slot_id ?? `${c.start_time}-${c.end_time}-${c.slot_label}`;
      const k = `${rk}__${c.weekday}`;
      const arr = m.get(k) || [];
      arr.push(c);
      m.set(k, arr);
    });
    return m;
  }, [filtered]);

  // Aulas elegíveis no dia ativo (selecionáveis)
  const activeDayClasses = useMemo(
    () => activeWd ? filtered.filter(c => c.weekday === activeWd) : [],
    [filtered, activeWd]
  );
  const allActiveSelected = activeDayClasses.length > 0
    && activeDayClasses.every(c => selectedIds.has(c.id));

  // Legenda de escolas presentes
  const schools = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    filtered.forEach(c => m.set(c.school_id, { id: c.school_id, name: c.school_name }));
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  if (!classes.length) {
    return (
      <div className="rounded-xl border bg-card p-6 flex items-start gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
        <div>O professor selecionado não possui aulas cadastradas na grade horária ativa.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold uppercase tracking-wide">Grade horária</div>
          {activeWdLabel && (
            <Badge variant="outline" className="text-[11px]">
              Dia ativo: <span className="lowercase ml-1">{activeWdLabel}</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeDayClasses.length > 0 && (
            <Button
              variant="outline" size="sm" className="h-8"
              onClick={() => onToggleAllActiveDay(allActiveSelected ? 'clear' : 'select')}
            >
              {allActiveSelected
                ? <><Square className="h-3.5 w-3.5 mr-1" /> Limpar dia</>
                : <><CheckSquare className="h-3.5 w-3.5 mr-1" /> Selecionar dia</>}
            </Button>
          )}
        </div>
      </div>

      {/* Legenda escolas */}
      {schools.length > 1 && (
        <div className="px-4 pt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <SchoolIcon className="h-3 w-3" /> Escolas:
          </span>
          {schools.map(s => {
            const c = colorForSchool(s.id);
            return (
              <span key={s.id} className={cn('text-[11px] px-2 py-0.5 rounded-full', c.chip)}>
                {s.name}
              </span>
            );
          })}
        </div>
      )}

      <div className="p-3 overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-1 min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-2 py-1 w-28">
                Tempo
              </th>
              {presentWeekdays.map(w => {
                const isActive = w.db === activeWd;
                return (
                  <th
                    key={w.db}
                    className={cn(
                      'text-center text-[11px] uppercase tracking-wide font-medium px-1 py-1',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {w.short}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td className="align-top px-2 py-1">
                  <div className="text-xs font-semibold">{row.label}</div>
                  <div className="text-[10px] text-muted-foreground">{row.start}–{row.end}</div>
                </td>
                {presentWeekdays.map(w => {
                  const cellKey = `${row.key}__${w.db}`;
                  const items = cellMap.get(cellKey) || [];
                  const isActiveCol = w.db === activeWd;
                  return (
                    <td key={cellKey} className="align-top">
                      {items.length === 0 ? (
                        <div className="h-full min-h-[44px] rounded-md bg-muted/20" />
                      ) : (
                        <div className="space-y-1">
                          {items.map(c => {
                            const sel = selectedIds.has(c.id);
                            const color = colorForSchool(c.school_id);
                            const selectable = isActiveCol;
                            return (
                              <button
                                type="button"
                                key={c.id}
                                disabled={!selectable}
                                onClick={() => onToggle(c)}
                                title={selectable
                                  ? `${c.school_name} · ${c.class_group_name} · ${c.subject_name}`
                                  : `Selecione uma data de ${w.long.toLowerCase()} para marcar esta aula`}
                                className={cn(
                                  'w-full text-left rounded-md border px-2 py-1.5 transition-all',
                                  color.bg,
                                  selectable ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 ' + color.ring : 'opacity-50 cursor-not-allowed',
                                  sel && 'ring-2 ring-primary ring-offset-1 border-primary'
                                )}
                              >
                                <div className="text-[11px] font-semibold leading-tight line-clamp-1">
                                  {c.class_group_name}
                                </div>
                                <div className="text-[10px] leading-tight line-clamp-1 text-muted-foreground">
                                  {c.subject_name}
                                </div>
                                <div className="text-[10px] leading-tight text-muted-foreground/80 mt-0.5">
                                  {c.school_name}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[11px] text-muted-foreground border-t bg-muted/30">
        Apenas as aulas da coluna do <b>dia ativo</b> podem ser selecionadas. Mude a data no painel ao lado para marcar aulas em outro dia da semana.
      </div>
    </div>
  );
}
