import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiAdapter } from '@/lib/api-adapter';

export function useTicketWatchers(ticketId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['ticket-watchers', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      if (!ticketId) return [];
      return ApiAdapter.ticketWatchers.getByTicketId(ticketId);
    },
  });

  const watch = useMutation({
    mutationFn: async (userId: string) => {
      if (!ticketId) return;
      return ApiAdapter.ticketWatchers.watch(ticketId, userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-watchers', ticketId] }),
  });

  const unwatch = useMutation({
    mutationFn: async (userId: string) => {
      if (!ticketId) return;
      return ApiAdapter.ticketWatchers.unwatch(ticketId, userId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-watchers', ticketId] }),
  });

  return { watcherIds: query.data || [], watch, unwatch };
}
