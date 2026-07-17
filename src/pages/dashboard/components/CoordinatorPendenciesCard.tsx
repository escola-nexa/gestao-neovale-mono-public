import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, MessageSquare, ClipboardCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { CoordinatorPendencies } from '../hooks/useDashboardData';

interface CoordinatorPendenciesCardProps {
  pendencies: CoordinatorPendencies | null;
  loading: boolean;
}

export function CoordinatorPendenciesCard({ pendencies, loading }: CoordinatorPendenciesCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!pendencies) return null;

  const totalPendencies = pendencies.planningsToReview + pendencies.orientationsOverdue + pendencies.attendancePendingToday;

  const items = [
    {
      label: 'Planejamentos para revisar',
      value: pendencies.planningsToReview,
      icon: FileText,
      href: '/planejamento',
      urgent: pendencies.planningsToReview > 0,
      badgeClass: pendencies.planningsToReview > 0
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
        : 'bg-muted text-muted-foreground',
    },
    {
      label: 'Orientações em atraso',
      value: pendencies.orientationsOverdue,
      icon: MessageSquare,
      href: '/orientacoes',
      urgent: pendencies.orientationsOverdue > 0,
      badgeClass: pendencies.orientationsOverdue > 0
        ? 'bg-destructive/15 text-destructive border-destructive/20'
        : 'bg-muted text-muted-foreground',
    },
    {
      label: 'Frequências pendentes hoje',
      value: pendencies.attendancePendingToday,
      icon: ClipboardCheck,
      href: '/frequencia',
      urgent: pendencies.attendancePendingToday > 0,
      badgeClass: pendencies.attendancePendingToday > 0
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
        : 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <Card className={totalPendencies > 0 ? 'border-amber-500/30' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`h-5 w-5 ${totalPendencies > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          Pendências do Dia
          {totalPendencies > 0 && (
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs ml-auto">
              {totalPendencies} pendente{totalPendencies > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent ${
                item.urgent ? 'border-amber-500/20' : ''
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item.urgent ? 'bg-amber-500/10' : 'bg-muted'
              }`}>
                <item.icon className={`h-4 w-4 ${item.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
              </div>
              <Badge variant="outline" className={item.badgeClass}>
                {item.value}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
        {totalPendencies === 0 && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center mt-3 font-medium">
            ✓ Tudo em dia!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
