import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInHours, differenceInDays } from 'date-fns';
import { ticketsApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useTicketsLabelsMap } from './useTicketLabels';
import type { TicketFilters } from './useTicketFilters';

const CLOSED = ['resolvido', 'cancelado'];

/**
 * Pipeline compartilhado de tickets:
 *   tickets(role-aware) -> viewFiltered(tab) -> filtered(advanced + busca + KPIs)
 * Usado pela TicketsPage (lista/kanban inline) e pela TicketsKanbanPage (tela cheia).
 */
export function useFilteredTickets(filters: TicketFilters) {
  const { organizationId, userRole } = useOrganization();
  const { user } = useAuth();
  const { professorId } = useProfessorId();

  const { data: professorSchools = [] } = useQuery({
    queryKey: ['professor-schools', professorId],
    queryFn: async () => {
      if (!professorId) return [];
      return ticketsApi.getProfessorSchools(professorId);
    },
    enabled: !!professorId && userRole === 'professor',
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', organizationId, userRole, user?.id],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getTickets(organizationId, userRole, user?.id);
    },
    enabled: !!organizationId && (userRole !== 'professor' || !!user?.id),
  });

  // Tickets where current user is in ticket_assignees (multi-responsáveis)
  const { data: assignedTicketIds = [] } = useQuery({
    queryKey: ['my-assignee-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return ticketsApi.getAssignedTicketIds(user.id);
    },
    enabled: !!user?.id,
  });
  const assignedSet = useMemo(() => new Set(assignedTicketIds), [assignedTicketIds]);

  const { data: ticketsWithMedia = [] } = useQuery({
    queryKey: ['tickets-with-media', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getTicketsWithMedia(organizationId);
    },
    enabled: !!organizationId && filters.media,
  });

  const ticketIds = useMemo(() => tickets.map((t: any) => t.id), [tickets]);
  const { data: labelsByTicket = {} } = useTicketsLabelsMap(ticketIds);

  const viewFiltered = useMemo(() => {
    return tickets.filter((t: any) => {
      switch (filters.view) {
        case 'mine':
          return t.opened_by_id === user?.id;
        case 'assigned':
          return t.nexa_responsible_id === user?.id || t.school_responsible_id === user?.id || assignedSet.has(t.id);
        case 'unassigned':
          return !CLOSED.includes(t.status) && !t.nexa_responsible_id && !t.school_responsible_id;
        case 'critical': {
          const hours = differenceInHours(new Date(), new Date(t.updated_at || t.created_at));
          return !CLOSED.includes(t.status) && (
            t.priority === 'critica' ||
            (['critica', 'alta'].includes(t.priority) && hours >= 24)
          );
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [tickets, filters.view, user?.id, assignedSet]);

  const filtered = useMemo(() => {
    const now = new Date();
    return viewFiltered.filter((t: any) => {
      // KPI recorte (toggle do topo)
      if (filters.kpi && filters.kpi !== 'all') {
        const isClosed = CLOSED.includes(t.status);
        const hours = differenceInHours(now, new Date(t.updated_at || t.created_at));
        if (filters.kpi === 'open' && isClosed) return false;
        if (filters.kpi === 'risk' && (isClosed || !['critica', 'alta'].includes(t.priority) || hours < 24)) return false;
        if (filters.kpi === 'overdue' && (isClosed || hours < 72)) return false;
        if (filters.kpi === 'resolved' && t.status !== 'resolvido') return false;
      }
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.schoolId !== 'all' && t.school_id !== filters.schoolId) return false;
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.media && !ticketsWithMedia.includes(t.id)) return false;
      if (filters.responsible === 'nexa' && !t.nexa_responsible_id) return false;
      if (filters.responsible === 'escola' && !t.school_responsible_id) return false;
      if (filters.responsible === 'externo' && !t.external_author_name) return false;
      if (filters.labels.length > 0) {
        const tLabels = labelsByTicket[t.id] || [];
        if (!filters.labels.some(id => tLabels.includes(id))) return false;
      }
      if (filters.dueFilter !== 'all') {
        if (!t.due_date) return false;
        const days = differenceInDays(new Date(t.due_date), new Date());
        if (filters.dueFilter === 'overdue' && days >= 0) return false;
        if (filters.dueFilter === 'dueSoon' && (days < 0 || days > 2)) return false;
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          t.title?.toLowerCase().includes(s) ||
          t.external_author_name?.toLowerCase().includes(s) ||
          t.id?.toLowerCase().startsWith(s.replace(/^#/, ''))
        );
      }
      return true;
    });
  }, [viewFiltered, filters, ticketsWithMedia, labelsByTicket]);

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      mine: tickets.filter((t: any) => t.opened_by_id === user?.id).length,
      assigned: tickets.filter((t: any) => t.nexa_responsible_id === user?.id || t.school_responsible_id === user?.id || assignedSet.has(t.id)).length,
      unassigned: tickets.filter((t: any) => !CLOSED.includes(t.status) && !t.nexa_responsible_id && !t.school_responsible_id).length,
      critical: tickets.filter((t: any) => {
        const h = differenceInHours(now, new Date(t.updated_at || t.created_at));
        return !CLOSED.includes(t.status) && (t.priority === 'critica' || (['critica', 'alta'].includes(t.priority) && h >= 24));
      }).length,
      all: tickets.length,
    };
  }, [tickets, user?.id, assignedSet]);

  return { tickets, filtered, isLoading, tabCounts };
}
