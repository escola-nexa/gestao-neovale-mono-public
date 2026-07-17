import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { professoresApi } from '@/features/professores/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { KanbanLabel } from './useProfessorsKanban';

export interface CustomKanbanLabel extends KanbanLabel {
  organization_id: string;
}

export function useKanbanLabels() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['kanban-labels', organizationId],
    queryFn: async (): Promise<CustomKanbanLabel[]> => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('professor_kanban_labels')
        .select('id, name, color, organization_id')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return (data || []) as CustomKanbanLabel[];
    },
    enabled: !!organizationId,
  });

  const create = useMutation({
    mutationFn: async (payload: { name: string; color: KanbanLabel['color'] }) => {
      if (!organizationId) throw new Error('Sem organização');
      const { error } = await (supabase as any)
        .from('professor_kanban_labels')
        .insert({ ...payload, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-labels', organizationId] });
      toast.success('Etiqueta criada');
    },
    onError: (e: any) => toast.error(e.message?.includes('duplicate') ? 'Já existe etiqueta com esse nome' : (e.message || 'Erro')),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('professor_kanban_labels')
        .delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-labels', organizationId] });
      toast.success('Etiqueta removida');
    },
    onError: (e: any) => toast.error(e.message || 'Erro'),
  });

  return { labels: list.data || [], isLoading: list.isLoading, create, remove };
}
