import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Info, CheckCircle2, MousePointerClick, AlertTriangle, Loader2 } from 'lucide-react';
import { useAttendance, AttendanceStatus } from '../hooks/useAttendance';
import { frequenciaApi } from '../api';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Student {
  id: string;
  nome_completo: string;
}

interface TimeSlot {
  weekday: string;
  start_time: string;
  end_time: string;
}

/** A column in the grid = one date + one time slot */
interface GridColumn {
  date: Date;
  dateStr: string;
  startTime: string;
  endTime: string;
  slotLabel: string; // e.g. "07:00 - 07:40"
}

interface AttendanceGridProps {
  classGroupId: string;
  subjectId: string;
  professorId: string | null;
  onFinish?: () => void;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const STATUS_CYCLE: (AttendanceStatus | null)[] = [null, 'P', 'F', 'A'];

const statusDisplay = (status: AttendanceStatus | null) => {
  switch (status) {
    case 'P': return '.';
    case 'F': return 'F';
    case 'A': return '-';
    default: return '';
  }
};

const statusClass = (status: AttendanceStatus | null) => {
  switch (status) {
    case 'P': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-700';
    case 'F': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-300 dark:ring-red-700';
    case 'A': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-2 ring-amber-300 dark:ring-amber-700';
    default: return 'bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/30';
  }
};

const statusLabel = (status: AttendanceStatus | null) => {
  switch (status) {
    case 'P': return 'Presente';
    case 'F': return 'Falta';
    case 'A': return 'Abono';
    default: return 'Não registrado';
  }
};

const WEEKDAY_TO_JS: Record<string, number> = {
  'SEGUNDA': 1, 'TERCA': 2, 'QUARTA': 3, 'QUINTA': 4, 'SEXTA': 5,
};

export function AttendanceGrid({ classGroupId, subjectId, professorId, onFinish }: AttendanceGridProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastClickedCell, setLastClickedCell] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const { records, isLoading, fetchRecords, upsertRecord, deleteRecord, getRecord, resolvedProfessorId } = useAttendance(classGroupId, subjectId, professorId);
  const [bindingChecked, setBindingChecked] = useState(false);

  // Mark binding as checked after first render cycle so the warning only shows once we know
  useEffect(() => {
    const t = setTimeout(() => setBindingChecked(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Fetch professor's time slots for this class/subject
  useEffect(() => {
    if (!classGroupId || !subjectId) return;
    const load = async () => {
      const data = await frequenciaApi.getTimeSlots(classGroupId, subjectId, professorId);
      if (data && data.length > 0) {
        // Sort by weekday then start_time
        const sorted = [...data].sort((a: any, b: any) => {
          const dayDiff = (WEEKDAY_TO_JS[a.weekday] || 0) - (WEEKDAY_TO_JS[b.weekday] || 0);
          if (dayDiff !== 0) return dayDiff;
          return (a.start_time || '').localeCompare(b.start_time || '');
        });
        setTimeSlots(sorted.map((d: any) => ({
          weekday: d.weekday,
          start_time: d.start_time,
          end_time: d.end_time,
        })));
      } else {
        setTimeSlots([]);
      }
    };
    load();
  }, [classGroupId, subjectId, professorId]);

  // Fetch students
  useEffect(() => {
    const load = async () => {
      const list = await frequenciaApi.getStudents(classGroupId);
      setStudents(list);
    };
    load();
  }, [classGroupId]);

  // Build allowed weekdays set from time slots
  const allowedWeekdays = useMemo(() => {
    if (timeSlots.length === 0) return new Set<number>();
    return new Set(timeSlots.map(ts => WEEKDAY_TO_JS[ts.weekday]).filter(Boolean));
  }, [timeSlots]);

  // Get time slots for a specific JS day number
  const getSlotsForDay = useCallback((jsDay: number): TimeSlot[] => {
    const weekdayName = Object.entries(WEEKDAY_TO_JS).find(([_, v]) => v === jsDay)?.[0];
    if (!weekdayName) return [];
    return timeSlots.filter(ts => ts.weekday === weekdayName);
  }, [timeSlots]);

  // Compute date range
  const dateRange = useMemo(() => {
    if (allowedWeekdays.size === 0) return [] as Date[];
    const filterDays = (dates: Date[]) => dates.filter(d => allowedWeekdays.has(d.getDay()));

    if (viewMode === 'daily') {
      const d = new Date(referenceDate);
      if (!allowedWeekdays.has(d.getDay())) return [];
      return [d];
    }
    if (viewMode === 'weekly') {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      return filterDays(eachDayOfInterval({ start, end }));
    }
    const start = startOfMonth(referenceDate);
    const end = endOfMonth(referenceDate);
    return filterDays(eachDayOfInterval({ start, end }));
  }, [viewMode, referenceDate, allowedWeekdays]);

  // Build grid columns: each date × each time slot for that day
  const gridColumns = useMemo((): GridColumn[] => {
    const cols: GridColumn[] = [];
    for (const date of dateRange) {
      const daySlots = getSlotsForDay(date.getDay());
      for (const slot of daySlots) {
        const startLabel = slot.start_time?.substring(0, 5) || '';
        const endLabel = slot.end_time?.substring(0, 5) || '';
        cols.push({
          date,
          dateStr: format(date, 'yyyy-MM-dd'),
          startTime: slot.start_time,
          endTime: slot.end_time,
          slotLabel: `${startLabel} - ${endLabel}`,
        });
      }
    }
    return cols;
  }, [dateRange, getSlotsForDay]);

  // Fetch records for range
  useEffect(() => {
    if (dateRange.length > 0) {
      const start = format(dateRange[0], 'yyyy-MM-dd');
      const end = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');
      fetchRecords(start, end);
    }
  }, [dateRange, fetchRecords]);

  const handleCellClick = async (studentId: string, col: GridColumn) => {
    const current = getRecord(studentId, col.dateStr, col.startTime);
    const currentIdx = STATUS_CYCLE.indexOf(current);
    const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length;
    const next = STATUS_CYCLE[nextIdx];

    const cellKey = `${studentId}-${col.dateStr}-${col.startTime}`;
    setLastClickedCell(cellKey);
    setTimeout(() => setLastClickedCell(null), 600);

    setIsSaving(true);
    const ok = next === null
      ? await deleteRecord(studentId, col.dateStr, col.startTime)
      : await upsertRecord(studentId, col.dateStr, next, col.startTime);
    setIsSaving(false);
    if (ok) setLastSavedAt(new Date());
  };

  const navigate = (direction: number) => {
    const d = new Date(referenceDate);
    if (viewMode === 'daily') d.setDate(d.getDate() + direction);
    else if (viewMode === 'weekly') d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setReferenceDate(d);
  };

  const periodLabel = useMemo(() => {
    if (viewMode === 'daily') return format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
    if (viewMode === 'weekly') {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
    }
    return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR });
  }, [viewMode, referenceDate]);

  const showNoBindingWarning = bindingChecked && !resolvedProfessorId;

  // Group columns by date for header rendering
  const groupedByDate = useMemo(() => {
    const map = new Map<string, GridColumn[]>();
    for (const col of gridColumns) {
      const key = col.dateStr;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(col);
    }
    return map;
  }, [gridColumns]);

   return (
    <div className="space-y-4 min-w-0 w-full">
      {/* No binding warning */}
      {showNoBindingWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <strong>Vínculo não encontrado.</strong> Nenhum vínculo professor↔turma↔disciplina foi encontrado para você. Solicite ao coordenador a regularização da sua grade — sem isso a chamada não pode ser salva.
          </AlertDescription>
        </Alert>
      )}

      {/* Instruction Banner */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-5 w-5 text-primary" />
        <AlertDescription className="text-sm text-foreground">
          <strong className="text-primary">Como registrar a frequência:</strong>
          <ol className="mt-2 ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>Clique na célula ao lado do nome do aluno, na coluna da hora-aula desejada.</li>
            <li>Cada clique alterna entre: <span className="font-semibold text-emerald-600">Presente (.)</span> → <span className="font-semibold text-red-600">Falta (F)</span> → <span className="font-semibold text-amber-600">Abono (-)</span> → Limpar.</li>
            <li><strong className="text-primary">Cada clique salva automaticamente.</strong> Você pode sair da tela a qualquer momento — não é necessário "Enviar".</li>
          </ol>
        </AlertDescription>
      </Alert>


      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center capitalize">{periodLabel}</span>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReferenceDate(new Date())}>Hoje</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm p-4 rounded-lg bg-primary/10 border-2 border-primary/30 shadow-sm">
        <span className="flex items-center gap-2 font-bold text-primary text-base">
          <MousePointerClick className="h-5 w-5 text-primary" /> Clique para alternar:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-100 text-emerald-700 font-bold ring-2 ring-emerald-300 text-sm">.</span>
          <span className="font-medium">Presença</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-md flex items-center justify-center bg-red-100 text-red-700 font-bold ring-2 ring-red-300 text-sm">F</span>
          <span className="font-medium">Falta</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-md flex items-center justify-center bg-amber-100 text-amber-700 font-bold ring-2 ring-amber-300 text-sm">-</span>
          <span className="font-medium">Abono</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-md flex items-center justify-center bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/30 text-sm"></span>
          <span className="font-medium">Não registrado</span>
        </span>
      </div>

      {/* Grid */}
      {timeSlots.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">Nenhum horário de aula cadastrado</p>
          <p className="text-sm mt-1">Cadastre os horários de aula na Grade Horária antes de registrar a frequência.</p>
        </div>
      ) : gridColumns.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">Nenhuma aula neste período</p>
          <p className="text-sm mt-1">Não há aulas cadastradas para este período. Navegue para outra data.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg shadow-sm min-w-0 w-full">
          <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', minWidth: `${50 + 200 + gridColumns.length * 80}px` }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '200px' }} />
              {gridColumns.map((col, i) => (
                <col key={i} style={{ width: '80px' }} />
              ))}
            </colgroup>
            <thead>
              {/* Row 1: Date headers with colspan for multiple slots */}
              <tr className="bg-muted">
                <th rowSpan={2} className="text-center p-1 sticky left-0 z-20 border-r whitespace-nowrap bg-muted text-xs">#</th>
                <th rowSpan={2} className="text-left p-2 sticky left-[40px] z-20 border-r whitespace-nowrap bg-muted text-xs">Aluno</th>
                {Array.from(groupedByDate.entries()).map(([dateStr, cols]) => (
                  <th
                    key={dateStr}
                    colSpan={cols.length}
                    className={cn(
                      "p-1 text-center whitespace-nowrap border-x",
                      isToday(cols[0].date) && "bg-primary/10"
                    )}
                  >
                    <div className="text-xs text-muted-foreground uppercase font-bold">
                      {format(cols[0].date, 'EEEE', { locale: ptBR })}
                    </div>
                    <div className="font-semibold text-base">{format(cols[0].date, 'dd')}</div>
                  </th>
                ))}
              </tr>
              {/* Row 2: Time slot labels */}
              <tr className="bg-muted/70">
                {gridColumns.map((col, i) => (
                  <th key={i} className="p-1 text-center whitespace-nowrap text-xs text-muted-foreground border-x">
                    {col.slotLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const rowBg = idx % 2 === 0 ? 'bg-card' : 'bg-muted';
                return (
                  <tr key={student.id} className={cn("transition-colors", rowBg)}>
                    <td className={cn("p-1 sticky left-0 z-10 border-r text-muted-foreground text-xs text-center whitespace-nowrap", rowBg)}>
                      {idx + 1}
                    </td>
                    <td className={cn("p-2 sticky left-[40px] z-10 border-r font-medium whitespace-nowrap overflow-hidden text-ellipsis text-sm", rowBg)}
                        title={student.nome_completo}>
                      {student.nome_completo}
                    </td>
                    {gridColumns.map((col, i) => {
                      const status = getRecord(student.id, col.dateStr, col.startTime);
                      const cellKey = `${student.id}-${col.dateStr}-${col.startTime}`;
                      const isJustClicked = lastClickedCell === cellKey;
                      return (
                        <td key={i} className={cn("p-1 text-center whitespace-nowrap", isToday(col.date) && "bg-primary/5")}>
                          <button
                            onClick={() => handleCellClick(student.id, col)}
                            className={cn(
                              "w-9 h-9 rounded-md font-bold text-sm cursor-pointer transition-all duration-200",
                              "hover:scale-110 hover:shadow-md active:scale-95",
                              statusClass(status),
                              isJustClicked && "animate-pulse scale-110"
                            )}
                            title={`${student.nome_completo} - ${format(col.date, 'dd/MM')} ${col.slotLabel} - ${statusLabel(status)}`}
                          >
                            {statusDisplay(status)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={gridColumns.length + 2} className="p-8 text-center text-muted-foreground">
                    Nenhum aluno matriculado nesta turma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Auto-save status + Finish */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Salvando...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Salvo automaticamente às {format(lastSavedAt, 'HH:mm:ss')}</span>
            </>
          ) : (
            <>
              <Info className="h-4 w-4" />
              <span>Cada clique salva automaticamente</span>
            </>
          )}
        </div>
        {onFinish && (
          <Button
            size="lg"
            variant="default"
            onClick={onFinish}
            className="gap-2 px-8 text-base font-semibold"
          >
            <CheckCircle2 className="h-5 w-5" />
            Concluir e voltar
          </Button>
        )}
      </div>
    </div>
  );
}
