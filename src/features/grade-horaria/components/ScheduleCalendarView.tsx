import { useState, useMemo, forwardRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import type { ClassOccurrence, WeeklyModelWithRelations } from '../hooks/useWeeklySchedule';
import { PlanningObservationButton } from './PlanningObservationButton';


interface ScheduleCalendarViewProps {
  occurrences: ClassOccurrence[];
  models: WeeklyModelWithRelations[];
}

export const ScheduleCalendarView = forwardRef<HTMLDivElement, ScheduleCalendarViewProps>(
  function ScheduleCalendarView({ occurrences, models }, ref) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const { data: anpMap } = useAnpSubjectMap();

    // Normalize date string to avoid timezone issues
    // We expect YYYY-MM-DD from the backend (which is a DATE type in PG), but JS Date might parse with timezone
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      // If it comes as full ISO with time, split it. If it's just YYYY-MM-DD, use it as is.
      return dateStr.split('T')[0];
    };

    const modelsMap = useMemo(() => {
      const map = new Map<string, WeeklyModelWithRelations>();
      models.forEach(m => map.set(m.id, m));
      return map;
    }, [models]);

    const occurrencesByDate = useMemo(() => {
      const map = new Map<string, ClassOccurrence[]>();
      occurrences.forEach(occ => {
        const dateKey = normalizeDate(occ.occurrence_date);
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(occ);
      });

      // Sort by start time for each day
      map.forEach(list => {
        list.sort((a, b) => a.start_time.localeCompare(b.start_time));
      });

      return map;
    }, [occurrences]);

    const monthDays = useMemo(() => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const getOccurrencesForDate = (date: Date): ClassOccurrence[] => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return occurrencesByDate.get(dateKey) || [];
    };

    const getStatusColor = (status: string, model?: WeeklyModelWithRelations) => {
      if (model?.schedule_type === 'PLANNING') {
        switch (status) {
          case 'SCHEDULED': return 'bg-amber-500';
          case 'COMPLETED': return 'bg-amber-700';
          case 'CANCELLED': return 'bg-red-500';
          default: return 'bg-gray-500';
        }
      }
      switch (status) {
        case 'SCHEDULED': return 'bg-blue-500';
        case 'COMPLETED': return 'bg-green-500';
        case 'CANCELLED': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };

    // calculate if we have any data to show
    const hasData = occurrences.length > 0;

    // Find the first month with data if current view is empty
    const firstMonthWithData = useMemo(() => {
      if (!hasData) return null;

      // Check if current month has data
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const hasDataInCurrentMonth = occurrences.some(occ =>
        normalizeDate(occ.occurrence_date).startsWith(currentMonthStr)
      );

      if (hasDataInCurrentMonth) return null;

      // Find closest month with data
      const sortedOccurrences = [...occurrences].sort((a, b) =>
        a.occurrence_date.localeCompare(b.occurrence_date)
      );

      // Prefer future dates if available, otherwise just first date
      const today = new Date().toISOString().split('T')[0];
      const futureOcc = sortedOccurrences.find(o => o.occurrence_date >= today);

      if (futureOcc) {
        return parseISO(futureOcc.occurrence_date);
      }

      return parseISO(sortedOccurrences[0].occurrence_date);
    }, [occurrences, currentMonth, hasData]);

    const handleJumpToData = () => {
      if (firstMonthWithData) {
        setCurrentMonth(firstMonthWithData);
      }
    };

    const selectedDateOccurrences = selectedDate ? getOccurrencesForDate(selectedDate) : [];

    if (!hasData) {
      return (
        <div ref={ref} className="text-center py-16 px-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma aula gerada ainda</h3>
              <p className="text-sm text-muted-foreground">
                {models.length > 0
                  ? 'Você possui horários cadastrados. Clique no botão "Gerar Todas as Aulas" no topo da página para criar as ocorrências de aula no calendário.'
                  : 'Para visualizar o calendário de aulas, você precisa:'}
              </p>
              {models.length === 0 && (
                <ol className="text-sm text-muted-foreground mt-3 space-y-1 text-left">
                  <li>1. Clicar em "Novo Horário" para cadastrar horários de aula</li>
                  <li>2. Clicar em "Gerar Todas as Aulas" para criar as ocorrências</li>
                  <li>3. Visualizar as aulas geradas neste calendário</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {firstMonthWithData && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleJumpToData}
              className="hidden sm:flex"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Ir para {format(firstMonthWithData, 'MMMM yyyy', { locale: ptBR })}
            </Button>
          )}
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first of month */}
          {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[6rem] bg-muted/30 rounded" />
          ))}

          {monthDays.map(day => {
            const dayOccurrences = getOccurrencesForDate(day);
            const hasOccurrences = dayOccurrences.length > 0;

            return (
              <div
                key={day.toISOString()}
                onClick={() => hasOccurrences && setSelectedDate(day)}
                className={`
                min-h-[6rem] p-1 rounded border transition-colors relative
                ${isToday(day) ? 'border-primary bg-primary/5' : 'border-border'}
                ${hasOccurrences ? 'cursor-pointer hover:bg-muted/50' : ''}
                ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/20' : ''}
              `}
              >
                <div className={`
                text-sm font-medium mb-1
                ${isToday(day) ? 'text-primary' : ''}
                ${day.getDay() === 0 ? 'text-red-500' : ''}
              `}>
                  {format(day, 'd')}
                </div>

                {hasOccurrences && (
                  <div className="space-y-1">
                    {dayOccurrences.slice(0, 3).map(occ => {
                      const model = modelsMap.get(occ.weekly_model_id);
                      const subjIsAnp = model?.subject_id ? anpMap?.bySubject.has(model.subject_id) : false;
                      const slotIsAnp = (model as any)?.class_mode === 'ANP';
                      const anpTag = subjIsAnp ? ' (ANP)' : slotIsAnp ? ' [Slot ANP]' : '';
                      return (
                        <div
                          key={occ.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${getStatusColor(occ.status, model)} text-white`}
                          title={`${occ.start_time.slice(0, 5)} - ${model?.schedule_type === 'PLANNING' ? '📋 ' : ''}${model?.subject_name || ''}${anpTag}`}
                        >
                          {occ.start_time.slice(0, 5)} {model?.schedule_type === 'PLANNING' ? '📋' : ''}{(subjIsAnp || slotIsAnp) ? '🅰️' : ''}{model?.subject_name?.slice(0, 8) || '...'}
                        </div>
                      );
                    })}
                    {dayOccurrences.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center font-medium">
                        +{dayOccurrences.length - 3} mais
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-sm pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Aula Agendada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Aula Realizada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Planejamento Agendado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Cancelada</span>
          </div>
        </div>

        {/* Day Detail Dialog */}
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Aulas de {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3 pb-2">
                {selectedDateOccurrences.map(occ => {
                  const model = modelsMap.get(occ.weekly_model_id);
                  return (
                    <Card key={occ.id} className="overflow-hidden">
                      <div className={`h-1.5 w-full ${getStatusColor(occ.status, model)}`} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                              {model?.schedule_type === 'PLANNING' && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Planejamento</Badge>
                              )}
                              <SubjectNameWithAnp
                                name={model?.subject_name || 'Disciplina'}
                                isAnp={model?.subject_id ? anpMap?.bySubject.has(model.subject_id) : false}
                              />
                              {(model as any)?.class_mode === 'ANP' && (
                                <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-[10px] px-1.5">
                                  Slot ANP
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <span className="font-medium text-foreground mr-1">
                                {occ.start_time.slice(0, 5)} - {occ.end_time.slice(0, 5)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Prof. {model?.professor_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {model?.class_group_name} • {model?.course_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {model?.schedule_type === 'PLANNING' && (
                              <PlanningObservationButton model={model} />
                            )}
                            <Badge variant={
                              occ.status === 'COMPLETED' ? 'default' :
                                occ.status === 'CANCELLED' ? 'destructive' : 'secondary'
                            }>
                              {occ.status === 'SCHEDULED' ? 'Agendada' :
                                occ.status === 'COMPLETED' ? 'Realizada' : 'Cancelada'}
                            </Badge>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  });

ScheduleCalendarView.displayName = 'ScheduleCalendarView';
