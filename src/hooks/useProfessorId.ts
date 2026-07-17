import { useState, useEffect } from 'react';
import { globalApi } from './globalApi';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that resolves the current user's professor record ID.
 * Returns null if the user is not a professor or not yet loaded.
 */
export function useProfessorId() {
  const { user } = useAuth();
  const [professorId, setProfessorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset síncrono ao trocar de usuário — evita exibir o professorId
    // do usuário anterior durante a hidratação.
    setProfessorId(null);

    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    if (user.perfil !== 'professor') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchProfessorId = async () => {
      setIsLoading(true);
      const data = await globalApi.getProfessorIdByUserId(user.id);

      if (cancelled) return;
      setProfessorId(data?.id || null);
      setIsLoading(false);
    };

    fetchProfessorId();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.perfil]);

  return { professorId, isProfessor: user?.perfil === 'professor', isLoading };
}
