import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavedMessage {
  id: string;
  message_id: string;
  saved_at: string;
  channel_id: string;
  channel_name: string;
  body: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export function useSavedMessages() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedMessage[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: saves } = await supabase
      .from('chat_saved_messages')
      .select('id, message_id, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    if (!saves || saves.length === 0) {
      setItems([]); setSavedIds(new Set()); setLoading(false); return;
    }
    const msgIds = saves.map(s => s.message_id);
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id, channel_id, author_id, body, created_at, deleted_at')
      .in('id', msgIds)
      .is('deleted_at', null);
    const authorIds = Array.from(new Set((msgs || []).map(m => m.author_id)));
    const channelIds = Array.from(new Set((msgs || []).map(m => m.channel_id)));
    const [{ data: profiles }, { data: channels }] = await Promise.all([
      chatApi.client.from('profiles').select('user_id, full_name, avatar_url').in('user_id', authorIds),
      chatApi.client.from('chat_channels').select('id, name').in('id', channelIds),
    ]);
    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const cMap = new Map((channels || []).map((c: any) => [c.id, c]));
    const result: SavedMessage[] = saves
      .map(s => {
        const m = (msgs || []).find(x => x.id === s.message_id);
        if (!m) return null;
        const p = pMap.get(m.author_id);
        const c = cMap.get(m.channel_id);
        return {
          id: s.id,
          message_id: m.id,
          saved_at: s.saved_at,
          channel_id: m.channel_id,
          channel_name: c?.name || 'Canal',
          body: m.body,
          created_at: m.created_at,
          author_name: p?.full_name || 'Usuário',
          author_avatar: p?.avatar_url || null,
        };
      })
      .filter(Boolean) as SavedMessage[];
    setItems(result);
    setSavedIds(new Set(result.map(r => r.message_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (messageId: string) => {
    if (!user) return;
    const { error } = await chatApi.client.from('chat_saved_messages').insert({ user_id: user.id, message_id: messageId });
    if (error && !String(error.message).includes('duplicate')) {
      toast.error('Não foi possível salvar.');
      return;
    }
    toast.success('Mensagem salva.');
    setSavedIds(s => new Set(s).add(messageId));
    load();
  }, [user, load]);

  const unsave = useCallback(async (messageId: string) => {
    if (!user) return;
    await chatApi.client.from('chat_saved_messages').delete().eq('user_id', user.id).eq('message_id', messageId);
    toast.success('Removida das salvas.');
    setSavedIds(s => { const n = new Set(s); n.delete(messageId); return n; });
    load();
  }, [user, load]);

  return { items, savedIds, loading, save, unsave, reload: load };
}
