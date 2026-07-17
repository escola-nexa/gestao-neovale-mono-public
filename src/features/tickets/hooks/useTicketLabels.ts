import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from '../api';

export interface TicketLabel {
  id: string;
  organization_id: string;
  name: string;
  color: string;
}

export function useTicketLabels(organizationId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ticket-labels', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      return ApiAdapter.ticketLabels.getAll({ organizationId: organizationId! });
    },
  });

  useEffect(() => {
    if (!organizationId) return;
    const unsubscribe = ticketsApi.subscribeToTicketLabels(organizationId, () => {
      qc.invalidateQueries({ queryKey: ['ticket-labels', organizationId] });
    });
    return unsubscribe;
  }, [organizationId, qc]);

  const create = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!organizationId) throw new Error('orgId');
      return ApiAdapter.ticketLabels.create({ organization_id: organizationId, name, color });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-labels', organizationId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      return ApiAdapter.ticketLabels.update(id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-labels', organizationId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      return ApiAdapter.ticketLabels.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-labels', organizationId] }),
  });

  return { labels: query.data || [], isLoading: query.isLoading, create, update, remove };
}

export function useTicketLabelAssignments(ticketId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ticket-label-assignments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      if (!ticketId) return [] as string[];
      return ApiAdapter.ticketLabelAssignments.getByTicketId(ticketId);
    },
  });

  useEffect(() => {
    if (!ticketId) return;
    const unsubscribe = ticketsApi.subscribeToTicketLabelAssignments(ticketId, () => {
      qc.invalidateQueries({ queryKey: ['ticket-label-assignments', ticketId] });
    });
    return unsubscribe;
  }, [ticketId, qc]);

  const toggle = useMutation({
    mutationFn: async ({ labelId, attach }: { labelId: string; attach: boolean }) => {
      if (!ticketId) throw new Error('tid');
      if (attach) {
        return ApiAdapter.ticketLabelAssignments.attach(ticketId, labelId);
      } else {
        return ApiAdapter.ticketLabelAssignments.detach(ticketId, labelId);
      }
    },
    onMutate: async ({ labelId, attach }) => {
      await qc.cancelQueries({ queryKey: ['ticket-label-assignments', ticketId] });
      const prev = qc.getQueryData<string[]>(['ticket-label-assignments', ticketId]);
      qc.setQueryData<string[]>(['ticket-label-assignments', ticketId], (old) =>
        attach ? [...(old || []), labelId] : (old || []).filter(id => id !== labelId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['ticket-label-assignments', ticketId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['ticket-label-assignments', ticketId] }),
  });

  return { assignedLabelIds: query.data || [], toggle };
}

/** Batch labels for board cards */
export function useTicketsLabelsMap(ticketIds: string[]) {
  return useQuery({
    queryKey: ['tickets-labels-map', ticketIds.sort().join(',')],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      return ApiAdapter.ticketLabelAssignments.getByTicketIds(ticketIds);
    },
  });
}
