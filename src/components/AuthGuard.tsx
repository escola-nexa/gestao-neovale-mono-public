import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredModule?: string;
  allowedRoles?: string[];
}

export function AuthGuard({ children, requiredModule, allowedRoles }: AuthGuardProps) {
  const { isAuthenticated, isLoading, canAccessModule, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredModule && !canAccessModule(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Validação direta do perfil — R.H. é restrito por UI mesmo sendo
  // equiparado a Coordenador no backend (RLS/edge functions).
  if (allowedRoles && user?.perfil && !allowedRoles.includes(user.perfil)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
