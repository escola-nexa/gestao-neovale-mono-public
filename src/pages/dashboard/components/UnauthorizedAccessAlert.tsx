import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UnauthorizedAccessAlert() {
  const { organizationId } = useOrganization();

  const { data: deniedCount = 0, isLoading } = useQuery({
    queryKey: ['denied-access-count-24h', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      return dashboardApi.getDeniedAccessCount(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });

  if (isLoading || deniedCount === 0) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Tentativas de Acesso Não Autorizado</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span>
          {deniedCount} tentativa{deniedCount > 1 ? 's' : ''} de acesso externo negada{deniedCount > 1 ? 's' : ''} nas últimas 24 horas.
        </span>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link to="/compartilhamento/logs">Ver Logs</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
