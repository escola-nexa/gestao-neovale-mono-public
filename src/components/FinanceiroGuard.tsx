import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * FinanceiroGuard — protege rotas do módulo Financeiro global.
 *
 * Regras:
 * - Só perfis `admin` e `financeiro` podem entrar.
 * - O perfil `financeiro` NÃO recebe automaticamente acessos
 *   a operações de RH / financeiro de substituição. Cada ação
 *   sensível continua validada por suas próprias permissões
 *   server-side (RLS / RPC / edge function).
 * - Toda consulta dentro deste módulo deve respeitar
 *   `organization_id` no backend.
 */
interface FinanceiroGuardProps {
  children: React.ReactNode;
}

export function FinanceiroGuard({ children }: FinanceiroGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed = user?.perfil === 'admin' || user?.perfil === 'financeiro';
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
