import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TodayClass } from '../hooks/useDashboardData';

interface WeeklyCalendarCardProps {
  classes: TodayClass[];
  loading: boolean;
}

const WEEKDAY_MAP: Record<string, number> = {
  SEGUNDA: 0, TERCA: 1, QUARTA: 2, QUINTA: 3, SEXTA: 4,
};

export function WeeklyCalendarCard({ classes, loading }: WeeklyCalendarCardProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  // Group classes by weekday offset
  const classesByDay = new Map<number, TodayClass[]>();
  classes.forEach(cls => {
    const dayIdx = WEEKDAY_MAP[cls.weekday];
    if (dayIdx !== undefined) {
      const arr = classesByDay.get(dayIdx) || [];
      arr.push(cls);
      classesByDay.set(dayIdx, arr);
    }
  });

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-primary" />
          Minha Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {weekDays.map((day, idx) => {
            const dayClasses = classesByDay.get(idx) || [];
            const isTodayDay = isToday(day);
            return (
              <div
                key={idx}
                className={`rounded-lg border p-2 min-h-[80px] transition-colors ${
                  isTodayDay
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border'
                }`}
              >
                <div className="text-center mb-1.5">
                  <p className={`text-[10px] uppercase font-medium ${isTodayDay ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={`text-sm font-bold ${isTodayDay ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'dd')}
                  </p>
                </div>
                {dayClasses.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center">—</p>
                ) : (
                  <div className="space-y-1">
                    {dayClasses.slice(0, 3).map((cls, i) => {
                      const label = cls.subjects[0] || 'Aula';
                      const extra = cls.subjects.length > 1 ? ` (+${cls.subjects.length - 1})` : '';
                      return (
                        <div
                          key={i}
                          className="text-[10px] leading-tight p-1 rounded bg-primary/10 text-primary truncate"
                          title={`${cls.subjects.join(' / ')} - ${cls.classGroupName} (${cls.startTime}-${cls.endTime})`}
                        >
                          <span className="font-medium">{cls.startTime}</span>{' '}
                          <span className="hidden sm:inline">{label}{extra}</span>
                          <span className="sm:hidden">{label.substring(0, 3)}{extra}</span>
                        </div>
                      );
                    })}
                    {dayClasses.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayClasses.length - 3}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
