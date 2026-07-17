import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useMyTSRFinancialAccess } from '../hooks/useTeacherSubstitutionFinancial';

interface Props {
  children: ReactNode;
  /** Renderizado quando não há acesso. Default: card de bloqueio. */
  fallback?: ReactNode;
  /** Quando true, renderiza null em vez do fallback (útil para esconder abas). */
  silent?: boolean;
}

export function FinancialAccessGuard({ children, fallback, silent }: Props) {
  const { data, isLoading } = useMyTSRFinancialAccess();

  if (isLoading) {
    return silent ? null : (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Verificando permissão…</CardContent></Card>
    );
  }

  if (!data?.canAccess) {
    if (silent) return null;
    return (
      fallback ?? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center gap-2">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <div className="text-base font-medium">Acesso financeiro restrito</div>
            <div className="text-sm text-muted-foreground max-w-md">
              Esta área é exclusiva do Admin e dos usuários de R.H. autorizados nominalmente.
              Solicite acesso ao Admin da sua organização.
            </div>
          </CardContent>
        </Card>
      )
    );
  }

  return <>{children}</>;
}

/** Hook utilitário para condicional sem renderização. */
export function useHasFinancialAccess() {
  const { data } = useMyTSRFinancialAccess();
  return Boolean(data?.canAccess);
}
