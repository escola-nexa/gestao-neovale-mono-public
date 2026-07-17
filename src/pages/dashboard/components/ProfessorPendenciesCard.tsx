import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, PenLine, ClipboardCheck, MessageSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfessorPendencies } from '../hooks/useDashboardData';

interface ProfessorPendenciesCardProps {
  pendencies: ProfessorPendencies | null;
  loading: boolean;
}

export function ProfessorPendenciesCard({ pendencies, loading }: ProfessorPendenciesCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!pendencies) return null;

  const items = [
    {
      label: 'Planejamentos devolvidos',
      value: pendencies.planningsReturned,
      icon: FileText,
      href: '/planejamento',
      show: pendencies.planningsReturned > 0,
      badgeClass: 'bg-destructive/15 text-destructive border-destructive/20',
    },
    {
      label: 'Planejamentos para assinar',
      value: pendencies.planningsToSign,
      icon: PenLine,
      href: '/planejamento',
      show: pendencies.planningsToSign > 0,
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
    },
    {
      label: 'Planejamentos em rascunho',
      value: pendencies.planningsDraft,
      icon: FileText,
      href: '/planejamento',
      show: pendencies.planningsDraft > 0,
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
    {
      label: 'Orientações para assinar',
      value: pendencies.orientationsToSign,
      icon: MessageSquare,
      href: '/orientacoes',
      show: pendencies.orientationsToSign > 0,
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
    {
      label: 'Chamadas pendentes hoje',
      value: pendencies.attendancePendingToday,
      icon: ClipboardCheck,
      href: '/frequencia',
      show: pendencies.attendancePendingToday > 0,
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
  ].filter(i => i.show);

  const totalPendencies = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <Card className={totalPendencies > 0 ? 'border-amber-500/30' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`h-5 w-5 ${totalPendencies > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          Minhas Pendências
          {totalPendencies > 0 && (
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs ml-auto">
              {totalPendencies}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center py-3 font-medium">
            ✓ Sem pendências!
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:bg-accent"
              >
                <item.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1">{item.label}</span>
                <Badge variant="outline" className={item.badgeClass}>
                  {item.value}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
