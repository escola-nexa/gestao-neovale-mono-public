import { useEffect, useState, useCallback } from 'react';
import { globalApi } from './globalApi';
import { useAuth } from '@/contexts/AuthContext';
import { Organization, AppRole } from '@/types/academic';

interface UseOrganizationReturn {
  organization: Organization | null;
  organizationId: string | null;
  userRole: AppRole | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrganization(): UseOrganizationReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isAuthenticated || !user?.id) {
        setOrganization(null);
        setUserRole(null);
        if (!authLoading) {
          setError(isAuthenticated ? null : 'Usuário não autenticado');
        }
        return;
      }

      if (import.meta.env.VITE_API_PROVIDER === 'nestjs') {
        const token = localStorage.getItem('nest_access_token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.organizationId) {
              setOrganization({ id: payload.organizationId, name: 'Organização Atual' } as Organization);
              setUserRole(payload.role as AppRole);
              return;
            }
          } catch(e) {
            console.error('Error parsing token in useOrganization', e);
          }
        }
      }

      const data = await globalApi.getUserRoleAndOrganization(user.id);

      if (data && (data as any).organizations) {
        setOrganization((data as any).organizations as unknown as Organization);
        setUserRole((data as any).role as AppRole);
      } else {
        setOrganization(null);
        setUserRole(null);
        setError('Usuário não vinculado a nenhuma organização');
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Erro ao carregar organização');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, authLoading]);

  useEffect(() => {
    // Aguarda o AuthContext terminar a hidratação antes de consultar.
    if (authLoading) return;
    fetchOrganization();
  }, [authLoading, fetchOrganization]);

  return {
    organization,
    organizationId: organization?.id || null,
    userRole,
    isLoading,
    error,
    refetch: fetchOrganization,
  };
}
