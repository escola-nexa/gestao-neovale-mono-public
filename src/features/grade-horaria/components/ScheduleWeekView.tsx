import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ClipboardList, Building2 } from 'lucide-react';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';
import type { WeeklyModelWithRelations } from '../hooks/useWeeklySchedule';
import { PlanningObservationButton } from './PlanningObservationButton';


interface ScheduleWeekViewProps {
  models: WeeklyModelWithRelations[];
  groupBy?: 'school' | 'professor';
}

export function ScheduleWeekView({ models, groupBy = 'school' }: ScheduleWeekViewProps) {
  const { data: anpMap } = useAnpSubjectMap();
  const groupedByWeekday = useMemo(() => {
    const grouped: Record<Weekday, WeeklyModelWithRelations[]> = {
      SEGUNDA: [],
      TERCA: [],
      QUARTA: [],
      QUINTA: [],
      SEXTA: [],
    };

    models.forEach(model => {
      if (grouped[model.weekday as Weekday]) {
        grouped[model.weekday as Weekday].push(model);
      }
    });

    // Sort by start time
    Object.keys(grouped).forEach(key => {
      grouped[key as Weekday].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [models]);

  const getColorForModel = (model: WeeklyModelWithRelations): string => {
    // Planning type has a distinct amber color
    if (model.schedule_type === 'PLANNING') {
      return 'bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100';
    }

    // Class type uses subject-based colors
    const colors = [
      'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100',
      'bg-green-50 border-green-400 text-green-900 dark:bg-green-950/30 dark:text-green-100',
      'bg-purple-50 border-purple-400 text-purple-900 dark:bg-purple-950/30 dark:text-purple-100',
      'bg-orange-50 border-orange-400 text-orange-900 dark:bg-orange-950/30 dark:text-orange-100',
      'bg-pink-50 border-pink-400 text-pink-900 dark:bg-pink-950/30 dark:text-pink-100',
      'bg-cyan-50 border-cyan-400 text-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100',
      'bg-red-50 border-red-400 text-red-900 dark:bg-red-950/30 dark:text-red-100',
    ];
    
    const subjectId = model.subject_id || model.id;
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (models.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum horário cadastrado para exibir
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20 border-l-4 border-primary" />
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Aulas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border-l-4 border-amber-400" />
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            Planejamento
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-5 gap-2 min-w-[800px]">
          {WEEKDAY_OPTIONS.map(({ value, label }) => (
            <div key={value} className="space-y-2">
              <div className="text-center font-medium py-2 bg-muted rounded-t-lg">
                {label.split('-')[0]}
              </div>
              <div className="space-y-2 min-h-[400px]">
                {groupedByWeekday[value as Weekday].length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Sem horários
                  </div>
                ) : (
                  groupedByWeekday[value as Weekday].map(model => (
                    <Card 
                      key={model.id} 
                      className={`border-l-4 ${getColorForModel(model)}`}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start gap-1.5">
                          {model.schedule_type === 'PLANNING' ? (
                            <ClipboardList className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="font-medium text-sm truncate flex-1 min-w-0">
                            <SubjectNameWithAnp
                              name={model.subject_name || (model.schedule_type === 'PLANNING' ? 'Planejamento' : 'Aula')}
                              isAnp={model.subject_id ? anpMap?.bySubject.has(model.subject_id) : false}
                              compact
                            />
                          </div>
                          {model.schedule_type === 'PLANNING' && (
                            <PlanningObservationButton model={model} className="-mr-1 -mt-1" />
                          )}
                        </div>
                        {(model as any).class_mode === 'ANP' && (
                          <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-[9px] px-1 h-4 w-fit" title="Aula no slot ANP">
                            Slot ANP
                          </Badge>
                        )}

                        <div className="text-xs opacity-75">
                          {model.start_time.slice(0, 5)} - {model.end_time.slice(0, 5)}
                        </div>
                        {model.school_name && (
                          <div className="text-xs truncate opacity-80 flex items-center gap-1 font-medium" title={model.school_name}>
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{model.school_name}</span>
                          </div>
                        )}
                        {model.class_group_name && (
                          <div className="text-xs truncate opacity-75">
                            {model.class_group_name}
                          </div>
                        )}
                        <div className="text-xs truncate opacity-75">
                          {model.professor_name}
                        </div>
                        <div className="text-xs truncate opacity-60">
                          {model.course_name}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}