import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChatMessageLabel } from '../types';

export function useMessageLabels(organizationId: string | null | undefined) {
  const [labels, setLabels] = useState<ChatMessageLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!organizationId) { setLabels([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('chat_message_labels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    setLabels((data || []) as ChatMessageLabel[]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: any change to message labels in this org propagates everywhere
  useEffect(() => {
    if (!organizationId) return;
    const ch = supabase
      .channel('chat-message-labels:' + organizationId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_message_labels',
        filter: `organization_id=eq.${organizationId}`,
      }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [organizationId, reload]);

  const create = async (name: string, color: string) => {
    if (!organizationId) return;
    const { error } = await supabase
      .from('chat_message_labels')
      .insert({ organization_id: organizationId, name: name.trim(), color });
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta criada');
    reload();
  };

  const update = async (id: string, name: string, color: string) => {
    const { error } = await supabase
      .from('chat_message_labels')
      .update({ name: name.trim(), color })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta atualizada');
    reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('chat_message_labels').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta removida');
    reload();
  };

  return { labels, loading, reload, create, update, remove };
}

export async function toggleMessageLabel(messageId: string, labelId: string, currentlyApplied: boolean, userId: string) {
  if (currentlyApplied) {
    const { error } = await supabase
      .from('chat_message_label_assignments')
      .delete()
      .eq('message_id', messageId)
      .eq('label_id', labelId);
    return { error };
  }
  const { error } = await supabase
    .from('chat_message_label_assignments')
    .insert({ message_id: messageId, label_id: labelId, applied_by: userId });
  return { error };
}
