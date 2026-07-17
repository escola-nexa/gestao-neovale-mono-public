import { useEffect, useState } from 'react';
import { AlertTriangle, AlertOctagon, School } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAbsenceAlerts, useSchoolAbsenceAlerts, StudentAttendanceSummary, SchoolAbsenceSummary } from '../hooks/useAttendance';
import { cn } from '@/lib/utils';

interface AbsenceAlertsProps {
  classGroupId: string;
  subjectId: string;
}

type AlertFilter = 'all' | 'warning' | 'danger';

export function AbsenceAlerts({ classGroupId, subjectId }: AbsenceAlertsProps) {
  const { summaries, isLoading, fetchAlerts } = useAbsenceAlerts(classGroupId, subjectId);
  const [filter, setFilter] = useState<AlertFilter>('all');

  useEffect(() => {
    if (classGroupId && subjectId) fetchAlerts();
  }, [classGroupId, subjectId, fetchAlerts]);

  const filtered = summaries.filter(s => {
    if (filter === 'warning') return s.alert_level === 'warning';
    if (filter === 'danger') return s.alert_level === 'danger';
    return true;
  });

  const warningCount = summaries.filter(s => s.alert_level === 'warning').length;
  const dangerCount = summaries.filter(s => s.alert_level === 'danger').length;

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando alertas...</div>;
  if (summaries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          Todos ({summaries.length})
        </Button>
        <Button variant={filter === 'warning' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('warning')}
          className={filter === 'warning' ? '' : 'border-warning text-warning hover:bg-warning/10'}>
          <AlertTriangle className="h-4 w-4 mr-1" /> Em Alerta ({warningCount})
        </Button>
        <Button variant={filter === 'danger' ? 'destructive' : 'outline'} size="sm" onClick={() => setFilter('danger')}
          className={filter === 'danger' ? '' : 'border-destructive text-destructive hover:bg-destructive/10'}>
          <AlertOctagon className="h-4 w-4 mr-1" /> Reprovado ({dangerCount})
        </Button>
      </div>

      <div className="space-y-1">
        {filtered.map(s => (
          <div key={s.student_id} className={cn(
            "flex items-center justify-between p-2 rounded-lg border",
            s.alert_level === 'danger' && "border-destructive/50 bg-destructive/5",
            s.alert_level === 'warning' && "border-warning/50 bg-warning/5",
          )}>
            <div className="flex items-center gap-2">
              {s.alert_level === 'danger' && (
                <AlertOctagon className="h-5 w-5 text-destructive animate-pulse" style={{ filter: 'drop-shadow(0 0 6px hsl(0 84% 60%))' }} />
              )}
              {s.alert_level === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-warning animate-pulse" style={{ filter: 'drop-shadow(0 0 6px hsl(38 92% 50%))' }} />
              )}
              <span className={cn("font-medium text-sm",
                s.alert_level === 'danger' && "text-destructive",
                s.alert_level === 'warning' && "text-warning",
              )}>
                {s.student_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={s.alert_level === 'danger' ? 'destructive' : s.alert_level === 'warning' ? 'secondary' : 'outline'}>
                {s.absence_percentage}% faltas
              </Badge>
              <span className="text-xs text-muted-foreground">
                {s.total_absences}/{s.total_classes} aulas
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno neste filtro.</p>
        )}
      </div>
    </div>
  );
}

/** School-level absence alerts panel */
interface SchoolAbsenceAlertsProps {
  schoolId: string;
}

export function SchoolAbsenceAlerts({ schoolId }: SchoolAbsenceAlertsProps) {
  const { summaries, isLoading, fetchAlerts } = useSchoolAbsenceAlerts(schoolId);
  const [filter, setFilter] = useState<AlertFilter>('all');

  useEffect(() => {
    if (schoolId) fetchAlerts();
  }, [schoolId, fetchAlerts]);

  const filtered = summaries.filter(s => {
    if (filter === 'warning') return s.alert_level === 'warning';
    if (filter === 'danger') return s.alert_level === 'danger';
    return true;
  });

  const warningCount = summaries.filter(s => s.alert_level === 'warning').length;
  const dangerCount = summaries.filter(s => s.alert_level === 'danger').length;

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando alertas da escola...</div>;
  
  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum aluno com faltas significativas nesta escola.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          Todos ({summaries.length})
        </Button>
        <Button variant={filter === 'warning' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('warning')}
          className={filter === 'warning' ? '' : 'border-warning text-warning hover:bg-warning/10'}>
          <AlertTriangle className="h-4 w-4 mr-1" /> Em Alerta ({warningCount})
        </Button>
        <Button variant={filter === 'danger' ? 'destructive' : 'outline'} size="sm" onClick={() => setFilter('danger')}
          className={filter === 'danger' ? '' : 'border-destructive text-destructive hover:bg-destructive/10'}>
          <AlertOctagon className="h-4 w-4 mr-1" /> Reprovado ({dangerCount})
        </Button>
      </div>

      <div className="space-y-1">
        {filtered.map((s, i) => (
          <div key={`${s.student_id}-${i}`} className={cn(
            "flex items-center justify-between p-2 rounded-lg border",
            s.alert_level === 'danger' && "border-destructive/50 bg-destructive/5",
            s.alert_level === 'warning' && "border-warning/50 bg-warning/5",
          )}>
            <div className="flex items-center gap-2 min-w-0">
              {s.alert_level === 'danger' && (
                <AlertOctagon className="h-5 w-5 text-destructive shrink-0 animate-pulse" style={{ filter: 'drop-shadow(0 0 6px hsl(0 84% 60%))' }} />
              )}
              {s.alert_level === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 animate-pulse" style={{ filter: 'drop-shadow(0 0 6px hsl(38 92% 50%))' }} />
              )}
              <div className="min-w-0">
                <span className={cn("font-medium text-sm block truncate",
                  s.alert_level === 'danger' && "text-destructive",
                  s.alert_level === 'warning' && "text-warning",
                )}>
                  {s.student_name}
                </span>
                <span className="text-[11px] text-muted-foreground truncate block">{s.class_group_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={s.alert_level === 'danger' ? 'destructive' : 'secondary'}>
                {s.absence_percentage}% faltas
              </Badge>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {s.total_absences}/{s.total_records}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno neste filtro.</p>
        )}
      </div>
    </div>
  );
}
