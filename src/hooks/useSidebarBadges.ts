import { useState, useEffect } from 'react';
import { globalApi } from './globalApi';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';

export interface SidebarBadges {
  planejamento: number;
  orientacoes: number;
  frequencia: number;
  chat: number;
}

export function useSidebarBadges(): SidebarBadges {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const [badges, setBadges] = useState<SidebarBadges>({ planejamento: 0, orientacoes: 0, frequencia: 0, chat: 0 });

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const chatUnread = await globalApi.getChatUnreadCount(user.id);

        const data = await globalApi.getSidebarBadges(
          user.organization_id || '', // Note: we need organization_id. useSidebarBadges doesn't have it easily without useOrganization.
          professorId,
          isProfessor
        );
        
        setBadges({
          planejamento: data.planningsPendingCount,
          orientacoes: isProfessor ? data.sharedSlotsCount : 0, // Mock for orientacoes? Or actually use the exact orientacoes?
          frequencia: 0,
          chat: chatUnread,
        });
      } catch (err) {
        console.error('Error loading sidebar badges:', err);
      }
    };

    load();
    const interval = setInterval(load, 120_000);
    return () => clearInterval(interval);
  }, [user, professorId, isProfessor]);

  return badges;
}
