import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api';

export interface EligibleAssignee {
  user_id: string;
  full_name: string;
  role: 'admin' | 'coordenador' | 'rh';
}

/**
 * Lista usuários elegíveis a serem atribuídos a tickets ou itens de checklist:
 * Admin, Coordenador ou RH da organização atual.
 * Compartilhado entre TicketMembersPopover (escopo Equipe Neovale) e o
 * popover de atribuição de itens de checklist (Trello-style).
 */
export function useEligibleAssignees(organizationId: string | null | undefined) {
  return useQuery<EligibleAssignee[]>({
    queryKey: ['ticket-eligible-assignees', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const data = await ticketsApi.getStaffByRoles(organizationId!, ['admin', 'coordenador', 'rh']);
      return data as EligibleAssignee[];
    },
  });
}
