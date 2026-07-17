import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ajudaApi } from '@/features/ajuda/api';
import { useOrganization } from '@/hooks/useOrganization';
import type { HelpTutorial } from '../types';

const sb = supabase as any;

export function useHelpTutorials() {
  const { organizationId, userRole } = useOrganization();

  return useQuery({
    queryKey: ['help-tutorials', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('help_tutorials')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HelpTutorial[];
    },
  });
}

export function useHelpTutorial(id: string | undefined) {
  return useQuery({
    queryKey: ['help-tutorial', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb
        .from('help_tutorials')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as HelpTutorial | null;
    },
  });
}

export function useHelpViews() {
  const { organizationId } = useOrganization();
  return useQuery({
    queryKey: ['help-views', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('help_tutorial_views')
        .select('tutorial_id, progress_seconds, completed, last_viewed_at');
      if (error) throw error;
      return (data ?? []) as Array<{
        tutorial_id: string; progress_seconds: number; completed: boolean; last_viewed_at: string;
      }>;
    },
  });
}

export function useRecordView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, progress, completed }: { id: string; progress?: number; completed?: boolean }) => {
      const { error } = await sb.rpc('increment_help_view', {
        _tutorial_id: id,
        _progress: progress ?? 0,
        _completed: completed ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['help-views'] });
      qc.invalidateQueries({ queryKey: ['help-tutorials'] });
    },
  });
}

export function useDeleteHelpTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('help_tutorials')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['help-tutorials'] });
    },
  });
}
