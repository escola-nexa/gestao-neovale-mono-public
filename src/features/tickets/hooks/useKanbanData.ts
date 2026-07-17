import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from '../api';

export interface KanbanList {
  id: string;
  name: string;
  position: number;
  color: string;
  mapped_status: string | null;
  organization_id: string;
}

export function useKanbanLists(organizationId: string | null) {
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['kanban-lists', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      // Initialize lists if needed
      await ApiAdapter.kanbanLists.initialize(organizationId);
      return ApiAdapter.kanbanLists.getAll(organizationId);
    },
    enabled: !!organizationId,
  });

  // Realtime — apenas para a própria tabela kanban_lists.
  // Mudanças em `tickets` já são observadas por useTicketsRealtime — evita refetch duplicado.
  useEffect(() => {
    if (!organizationId) return;
    const unsubscribe = ticketsApi.subscribeToKanbanLists(organizationId, () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-lists', organizationId] });
    });
    return unsubscribe;
  }, [organizationId, queryClient]);

  return { lists, isLoading };
}

export function useReorderCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      newListId,
      prevPosition,
      nextPosition,
    }: {
      ticketId: string;
      newListId: string;
      prevPosition: number | null;
      nextPosition: number | null;
    }) => {
      return ApiAdapter.kanbanCards.reorder({ ticketId, newListId, prevPosition, nextPosition });
    },
    // Optimistic update — move o card no cache imediatamente, sem aguardar o servidor.
    onMutate: async ({ ticketId, newListId, prevPosition, nextPosition }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      // Calcula nova posição interpolada (mesma lógica do RPC reorder_kanban_card)
      let newPos: number;
      if (prevPosition != null && nextPosition != null) newPos = (prevPosition + nextPosition) / 2;
      else if (prevPosition != null) newPos = prevPosition + 1024;
      else if (nextPosition != null) newPos = nextPosition - 1024;
      else newPos = 1024;

      const snapshots: Array<{ key: any; data: any }> = [];
      queryClient.getQueriesData({ queryKey: ['tickets'] }).forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        snapshots.push({ key, data });
        const next = data.map((t: any) =>
          t.id === ticketId ? { ...t, kanban_list_id: newListId, kanban_position: newPos } : t
        );
        queryClient.setQueryData(key, next);
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      // Reverte o cache em caso de erro
      ctx?.snapshots?.forEach(({ key, data }) => queryClient.setQueryData(key, data));
    },
    // Sem invalidate — o realtime de useTicketsRealtime cuida da reconciliação final
    // (e o cache otimista já reflete o estado correto).
  });
}

export function useUpdateKanbanList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, updates }: { listId: string; updates: Partial<KanbanList> }) => {
      return ApiAdapter.kanbanLists.update(listId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-lists'] });
    },
  });
}

export function useCreateKanbanList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      name,
      color = '#6B7280',
      mapped_status = null,
    }: {
      organizationId: string;
      name: string;
      color?: string;
      mapped_status?: string | null;
    }) => {
      return ApiAdapter.kanbanLists.create({
        organization_id: organizationId,
        name,
        color,
        mapped_status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-lists'] });
    },
  });
}

export function useDeleteKanbanList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      return ApiAdapter.kanbanLists.delete(listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-lists'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
