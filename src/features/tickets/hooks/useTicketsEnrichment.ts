import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../api';

export interface TicketAssignee {
  user_id: string;
  full_name: string | null;
}

export interface TicketsEnrichment {
  categoryById: Record<string, { id: string; name: string; color: string | null }>;
  profileById: Record<string, { user_id: string; full_name: string | null }>;
  assigneesByTicket: Record<string, TicketAssignee[]>;
}

/**
 * Carrega em batch os dados auxiliares dos tickets:
 *  - categorias (id -> name/color)
 *  - profiles (id -> nome) p/ responsáveis (Nexa/Escola) e assignees
 *  - assignees por ticket
 *
 * Usado para que os cards do Kanban apresentem as MESMAS informações
 * que aparecem na lista, sem N+1.
 */
export function useTicketsEnrichment(
  organizationId: string | null | undefined,
  tickets: any[],
) {
  const ticketIds = tickets.map(t => t.id).sort().join(',');
  const key = `${organizationId || ''}::${ticketIds}`;

  return useQuery<TicketsEnrichment>({
    queryKey: ['tickets-enrichment', key],
    queryFn: async () => {
      const result: TicketsEnrichment = {
        categoryById: {},
        profileById: {},
        assigneesByTicket: {},
      };
      if (!organizationId || tickets.length === 0) return result;

      const ids = tickets.map(t => t.id);
      const { categories, assignees } = await ticketsApi.getTicketsEnrichmentData(organizationId, ids);

      (categories || []).forEach((c: any) => {
        result.categoryById[c.id] = { id: c.id, name: c.name, color: c.color || null };
      });

      const userIdsToLoad = new Set<string>();
      (assignees || []).forEach((a: any) => {
        if (!result.assigneesByTicket[a.ticket_id]) result.assigneesByTicket[a.ticket_id] = [];
        result.assigneesByTicket[a.ticket_id].push({ user_id: a.user_id, full_name: null });
        userIdsToLoad.add(a.user_id);
      });

      // Responsáveis dos tickets também
      tickets.forEach((t: any) => {
        if (t.nexa_responsible_id) userIdsToLoad.add(t.nexa_responsible_id);
        if (t.school_responsible_id) userIdsToLoad.add(t.school_responsible_id);
        if (t.opened_by_id) userIdsToLoad.add(t.opened_by_id);
      });

      if (userIdsToLoad.size > 0) {
        const profiles = await ticketsApi.getProfiles(Array.from(userIdsToLoad));
        (profiles || []).forEach((p: any) => {
          result.profileById[p.user_id] = { user_id: p.user_id, full_name: p.full_name };
        });
        // Hidrata nomes nos assignees
        Object.values(result.assigneesByTicket).forEach(arr => {
          arr.forEach(a => {
            a.full_name = result.profileById[a.user_id]?.full_name || null;
          });
        });
      }

      return result;
    },
    enabled: !!organizationId && tickets.length > 0,
    staleTime: 30_000,
  });
}
