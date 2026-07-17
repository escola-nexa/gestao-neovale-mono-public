import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, ArrowRight, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { TodayClass } from '../hooks/useDashboardData';

interface TodayClassesCardProps {
  classes: TodayClass[];
  loading: boolean;
}

export function TodayClassesCard({ classes, loading }: TodayClassesCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Aulas de Hoje
        </CardTitle>
        <CardDescription>
          {classes.length > 0
            ? `${classes.length} aula${classes.length > 1 ? 's' : ''} programada${classes.length > 1 ? 's' : ''}`
            : 'Nenhuma aula programada para hoje'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Dia livre de aulas!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => {
              const [primary, ...rest] = cls.subjects;
              return (
                <div
                  key={cls.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border"
                >
                  <div className="flex-shrink-0 w-16 text-center pt-0.5">
                    <span className="text-xs font-semibold text-primary block">
                      {cls.startTime}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {cls.endTime}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium break-words">{primary}</p>
                      {rest.length > 0 && (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-sky-300 bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-700"
                        >
                          <Layers className="h-3 w-3" />
                          UC · {cls.subjects.length} disciplinas
                        </Badge>
                      )}
                    </div>
                    {rest.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                        + {rest.join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {cls.classGroupName} · {cls.schoolName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Button variant="ghost" asChild className="w-full mt-3">
          <Link to="/grade-horaria">
            Ver grade completa
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
