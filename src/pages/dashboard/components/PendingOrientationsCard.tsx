import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OrientationPending } from '../hooks/useDashboardData';

const typeLabels: Record<string, string> = {
  VISITA_TECNICA: 'Visita Técnica',
  REUNIAO_PEDAGOGICA: 'Reunião Pedagógica',
  ACOMPANHAMENTO_AULA: 'Acompanhamento de Aula',
  ORIENTACAO_INDIVIDUAL: 'Orientação Individual',
  FORMACAO_CONTINUADA: 'Formação Continuada',
};

interface PendingOrientationsCardProps {
  orientations: OrientationPending[];
  loading: boolean;
}

export function PendingOrientationsCard({ orientations, loading }: PendingOrientationsCardProps) {
  if (loading) return null;
  if (orientations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" />
          Orientações Pendentes
        </CardTitle>
        <CardDescription>
          {orientations.length} orientação{orientations.length > 1 ? 'ões' : ''} aguardando ação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {orientations.map((o) => (
            <Link
              key={o.id}
              to={`/orientacoes`}
              className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {typeLabels[o.type] || o.type.replace(/_/g, ' ')}
                </p>
                {o.scheduledDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(o.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Badge variant={o.status === 'AGENDADO' ? 'secondary' : 'default'} className="text-xs">
                {o.status === 'AGENDADO' ? 'Agendada' : 'Assinar'}
              </Badge>
            </Link>
          ))}
        </div>
        <Button variant="ghost" asChild className="w-full mt-3">
          <Link to="/orientacoes">
            Ver todas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
