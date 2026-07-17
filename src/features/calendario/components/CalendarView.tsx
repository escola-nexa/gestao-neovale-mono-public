import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths,
  getDay,
  isSameDay,
  isWithinInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AcademicCalendar, CalendarEventType, EVENT_TYPE_LABELS } from '@/types/academic';
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalendarViewProps {
  calendar: AcademicCalendar;
  canManage?: boolean;
}

const eventTypeColors: Record<CalendarEventType, string> = {
  LETIVO: 'bg-green-500',
  FERIADO: 'bg-red-500',
  RECESSO: 'bg-amber-500',
  EVENTO: 'bg-blue-500',
};

const eventTypeBgColors: Record<CalendarEventType, string> = {
  LETIVO: 'bg-green-50 border-green-200',
  FERIADO: 'bg-red-50 border-red-200',
  RECESSO: 'bg-amber-50 border-amber-200',
  EVENTO: 'bg-blue-50 border-blue-200',
};

// Cycle order for click-to-toggle
const TOGGLE_CYCLE: CalendarEventType[] = ['LETIVO', 'FERIADO', 'RECESSO'];

export function CalendarView({ calendar, canManage = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { updateEvent, createEvent, deleteEvent, refetch } = useAcademicCalendar(calendar.organization_id);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const events = calendar.events || [];
  const bimesters = calendar.bimesters || [];

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.event_date), day));
  };

  const getBimesterForDay = (day: Date) => {
    return bimesters.find(b => 
      isWithinInterval(day, { 
        start: new Date(b.start_date), 
        end: new Date(b.end_date) 
      })
    );
  };

  // Bimester summary with letivo/non-letivo counts
  const bimesterSummary = useMemo(() => {
    return bimesters.map(b => {
      const bEvents = events.filter(e => e.event_date >= b.start_date && e.event_date <= b.end_date);
      return {
        ...b,
        letivos: bEvents.filter(e => e.event_type === 'LETIVO').length,
        feriados: bEvents.filter(e => e.event_type === 'FERIADO').length,
        recessos: bEvents.filter(e => e.event_type === 'RECESSO').length,
        eventos: bEvents.filter(e => e.event_type === 'EVENTO').length,
        total: bEvents.length,
      };
    });
  }, [bimesters, events]);

  const totalLetivos = useMemo(() => events.filter(e => e.event_type === 'LETIVO').length, [events]);

  // Month summary
  const monthSummary = useMemo(() => {
    const monthEvents = events.filter(e => {
      const eventDate = new Date(e.event_date);
      return isSameMonth(eventDate, currentDate);
    });
    return {
      total: monthEvents.length,
      letivos: monthEvents.filter(e => e.event_type === 'LETIVO').length,
      feriados: monthEvents.filter(e => e.event_type === 'FERIADO').length,
      recessos: monthEvents.filter(e => e.event_type === 'RECESSO').length,
      eventos: monthEvents.filter(e => e.event_type === 'EVENTO').length,
    };
  }, [events, currentDate]);

  // Click-to-toggle handler
  const handleDayClick = useCallback(async (day: Date) => {
    if (!canManage) return;

    const dayStr = format(day, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.event_date === dayStr);
    
    // Only toggle non-EVENTO types
    const toggleableEvent = dayEvents.find(e => TOGGLE_CYCLE.includes(e.event_type));

    if (toggleableEvent) {
      const currentIdx = TOGGLE_CYCLE.indexOf(toggleableEvent.event_type);
      const nextIdx = (currentIdx + 1) % TOGGLE_CYCLE.length;
      const nextType = TOGGLE_CYCLE[nextIdx];

      await updateEvent(toggleableEvent.id, { event_type: nextType });
    } else if (dayEvents.length === 0) {
      // No event → create as LETIVO
      await createEvent({
        calendar_id: calendar.id,
        event_date: dayStr,
        event_type: 'LETIVO',
      });
    }
  }, [canManage, events, calendar.id, updateEvent, createEvent]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      {/* Calendar Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month Summary */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            <Badge variant="outline" className="bg-green-50">
              <span className={cn("w-2 h-2 rounded-full mr-2", eventTypeColors.LETIVO)} />
              Letivos: {monthSummary.letivos}
            </Badge>
            <Badge variant="outline" className="bg-red-50">
              <span className={cn("w-2 h-2 rounded-full mr-2", eventTypeColors.FERIADO)} />
              Feriados: {monthSummary.feriados}
            </Badge>
            <Badge variant="outline" className="bg-amber-50">
              <span className={cn("w-2 h-2 rounded-full mr-2", eventTypeColors.RECESSO)} />
              Recessos: {monthSummary.recessos}
            </Badge>
            <Badge variant="outline" className="bg-blue-50">
              <span className={cn("w-2 h-2 rounded-full mr-2", eventTypeColors.EVENTO)} />
              Eventos: {monthSummary.eventos}
            </Badge>
          </div>

          {/* Click hint */}
          {canManage && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <MousePointerClick className="h-3.5 w-3.5" />
              Clique em um dia para alternar: Letivo → Feriado → Recesso
            </div>
          )}

          {/* Calendar Grid */}
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div 
                  key={day} 
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for alignment */}
              {Array.from({ length: adjustedStartDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1" />
              ))}

              {/* Days */}
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const bimester = getBimesterForDay(day);
                const isCurrentDay = isToday(day);
                const hasEvents = dayEvents.length > 0;
                const primaryEvent = dayEvents[0];
                const isSunday = getDay(day) === 0;
                const isSaturday = getDay(day) === 6;
                const isWeekend = isSunday || isSaturday;

                const tooltipLines: string[] = [];
                if (bimester) tooltipLines.push(`${bimester.number}º Bimestre`);
                dayEvents.forEach(e => {
                  tooltipLines.push(`${EVENT_TYPE_LABELS[e.event_type]}${e.description ? ': ' + e.description : ''}`);
                });

                const dayContent = (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square p-1 border rounded-md text-sm flex flex-col transition-colors",
                      isCurrentDay && "ring-2 ring-primary",
                      hasEvents && primaryEvent && eventTypeBgColors[primaryEvent.event_type],
                      !hasEvents && !isWeekend && "hover:bg-muted/50",
                      isWeekend && !hasEvents && "bg-muted/30",
                      canManage && !isWeekend && "cursor-pointer hover:ring-1 hover:ring-primary/40",
                    )}
                  >
                    <span className={cn(
                      "font-medium text-xs",
                      isCurrentDay && "text-primary",
                      isSunday && "text-destructive",
                    )}>
                      {format(day, 'd')}
                    </span>
                    {bimester && (
                      <span className="text-[9px] text-muted-foreground leading-tight">
                        {bimester.number}ºB
                      </span>
                    )}
                    {hasEvents && (
                      <div className="flex flex-wrap gap-0.5 mt-auto">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span 
                            key={event.id}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              eventTypeColors[event.event_type]
                            )}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px]">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                );

                if (tooltipLines.length > 0) {
                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        {dayContent}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                        {tooltipLines.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return dayContent;
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Bimester Summary Sidebar */}
      <div className="space-y-4">
        {/* Total Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalLetivos}</div>
            <p className="text-xs text-muted-foreground">dias letivos no total</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Feriados</span>
                <span className="font-medium">{events.filter(e => e.event_type === 'FERIADO').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Recessos</span>
                <span className="font-medium">{events.filter(e => e.event_type === 'RECESSO').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Eventos</span>
                <span className="font-medium">{events.filter(e => e.event_type === 'EVENTO').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Bimester Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dias Letivos por Bimestre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bimesterSummary.length > 0 ? (
              bimesterSummary.map((b) => {
                const [, sm, sd] = b.start_date.split('-');
                const [, em, ed] = b.end_date.split('-');
                return (
                  <div key={b.id} className="p-2.5 bg-muted/50 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{b.number}º Bimestre</span>
                      <Badge variant="default" className="text-xs">{b.letivos} letivos</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {sd}/{sm} — {ed}/{em}
                    </p>
                    {(b.feriados > 0 || b.recessos > 0) && (
                      <div className="flex gap-1.5 flex-wrap">
                        {b.feriados > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-200 text-red-600">
                            {b.feriados} feriado{b.feriados > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {b.recessos > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-600">
                            {b.recessos} recesso{b.recessos > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum bimestre cadastrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <span className={cn("w-3 h-3 rounded-full", eventTypeColors[type as CalendarEventType])} />
                <span>{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
