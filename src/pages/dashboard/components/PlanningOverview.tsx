import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanningStats } from '../hooks/useDashboardData';

interface PlanningOverviewProps {
  stats: PlanningStats | null;
  loading: boolean;
  isProfessor: boolean;
}

export function PlanningOverview({ stats, loading, isProfessor }: PlanningOverviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      label: isProfessor ? 'Em rascunho' : 'Rascunho / Em edição',
      value: stats?.draft ?? 0,
      color: 'bg-muted text-muted-foreground',
    },
    {
      label: isProfessor ? 'Enviados para revisão' : 'Aguardando revisão',
      value: stats?.pendingReview ?? 0,
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    {
      label: isProfessor ? 'Devolvidos para ajuste' : 'Devolvidos ao professor',
      value: stats?.returned ?? 0,
      color: 'bg-destructive/10 text-destructive',
    },
    {
      label: 'Aguardando assinatura',
      value: stats?.awaitingSignature ?? 0,
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Assinados',
      value: stats?.signed ?? 0,
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Planejamentos
        </CardTitle>
        <CardDescription>
          {isProfessor ? 'Resumo dos seus planejamentos' : 'Visão geral dos planejamentos da rede'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-2.5 rounded-lg border"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <Badge className={item.color}>
                {item.value}
              </Badge>
            </div>
          ))}
        </div>
        <Button variant="ghost" asChild className="w-full mt-3">
          <Link to="/planejamento">
            Ver todos os planejamentos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
