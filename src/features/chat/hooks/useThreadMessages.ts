import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import type { ChatMessage } from '../types';

async function enrich(msgs: any[]): Promise<ChatMessage[]> {
  if (!msgs.length) return [];
  const ids = Array.from(new Set(msgs.map(m => m.author_id)));
  const msgIds = msgs.map(m => m.id);
  const [profilesRes, attRes] = await Promise.all([
    chatApi.client.from('profiles').select('user_id, full_name, avatar_url').in('user_id', ids),
    chatApi.client.from('chat_message_attachments').select('*').in('message_id', msgIds),
  ]);
  const pMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
  const attMap = new Map<string, any[]>();
  (attRes.data || []).forEach((a: any) => {
    const arr = attMap.get(a.message_id) || [];
    arr.push(a);
    attMap.set(a.message_id, arr);
  });
  return msgs.map((m: any) => ({
    ...m,
    author_name: pMap.get(m.author_id)?.full_name || 'Usuário',
    author_avatar: pMap.get(m.author_id)?.avatar_url || null,
    attachments: attMap.get(m.id) || [],
  }));
}

export function useThreadMessages(parentId: string | null) {
  const [parent, setParent] = useState<ChatMessage | null>(null);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);
    const { data: parentData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', parentId)
      .maybeSingle();
    const { data: repliesData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('reply_to_id', parentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const enrichedParent = parentData ? (await enrich([parentData]))[0] : null;
    const enrichedReplies = await enrich(repliesData || []);
    setParent(enrichedParent);
    setReplies(enrichedReplies);
    setLoading(false);
  }, [parentId]);

  useEffect(() => { load(); }, [load]);

  // realtime for replies
  useEffect(() => {
    if (!parentId) return;
    const ch = supabase
      .channel('chat-thread:' + parentId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_messages',
        filter: `reply_to_id=eq.${parentId}`,
      }, async () => { load(); })
      .subscribe();
    return () => { chatApi.removeChannel(); };
  }, [parentId, load]);

  return { parent, replies, loading, reload: load };
}
