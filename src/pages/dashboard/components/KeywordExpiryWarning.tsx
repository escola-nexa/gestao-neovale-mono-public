import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function KeywordExpiryWarning() {
  const { organizationId } = useOrganization();

  const { data: hasActiveKeyword, isLoading } = useQuery({
    queryKey: ['active-keyword-check', organizationId],
    queryFn: async () => {
      if (!organizationId) return true;
      return dashboardApi.hasActiveKeyword(organizationId);
    },
    enabled: !!organizationId,
  });

  if (isLoading || hasActiveKeyword) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Palavra-chave trimestral expirada ou inexistente</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span>Os acessos externos estão bloqueados. Cadastre uma nova palavra-chave para liberá-los.</span>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link to="/compartilhamento">Cadastrar Palavra-Chave</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
