import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CalendarDays, ArrowRight, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { BimesterInfo, PlanningStats } from '../hooks/useDashboardData';

interface BimesterCountdownCardProps {
  bimesterInfo: BimesterInfo | null;
  planningStats: PlanningStats | null;
  loading: boolean;
  isProfessor: boolean;
}

export function BimesterCountdownCard({ bimesterInfo, planningStats, loading, isProfessor }: BimesterCountdownCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!bimesterInfo) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Período Letivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-muted-foreground">Calendário não configurado</p>
            {!isProfessor && (
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link to="/calendario">Configurar</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const planningProgress = planningStats && planningStats.total > 0
    ? Math.round((planningStats.signed / planningStats.total) * 100)
    : 0;

  const urgencyColor = bimesterInfo.daysRemaining !== null && bimesterInfo.daysRemaining <= 7
    ? 'text-destructive'
    : bimesterInfo.daysRemaining !== null && bimesterInfo.daysRemaining <= 15
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-primary';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-primary" />
          {bimesterInfo.currentBimester}º Bimestre · {bimesterInfo.academicYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Countdown */}
          {bimesterInfo.daysRemaining !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="text-center min-w-[60px]">
                <p className={`text-2xl font-bold ${urgencyColor}`}>
                  {bimesterInfo.daysRemaining}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  dia{bimesterInfo.daysRemaining !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Para encerrar o bimestre</p>
                {bimesterInfo.bimesterEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Encerra em {new Date(bimesterInfo.bimesterEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Planning progress */}
          {planningStats && planningStats.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Planejamentos assinados</span>
                <span className="font-semibold">{planningStats.signed}/{planningStats.total}</span>
              </div>
              <Progress value={planningProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{planningProgress}% concluído</p>
            </div>
          )}

          <Button variant="ghost" asChild className="w-full mt-1">
            <Link to="/calendario">
              Ver Calendário
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
