import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';

export type InboxKind = 'mention' | 'reply';

export interface InboxItem {
  kind: InboxKind;
  message_id: string;
  channel_id: string;
  channel_name: string;
  author_id: string;
  author_name: string;
  body: string | null;
  created_at: string;
  parent_id?: string | null;
}

export function useChatInbox() {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: state } = await supabase
      .from('chat_user_inbox_state').select('last_seen_at').eq('user_id', user.id).maybeSingle();
    const lsa = state?.last_seen_at || null;
    setLastSeenAt(lsa);

    // 1) menções
    const { data: mentions } = await supabase
      .from('chat_message_mentions')
      .select('message_id, channel_id, author_id, created_at')
      .eq('mentioned_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);

    // 2) respostas a minhas mensagens
    const { data: myMsgs } = await supabase
      .from('chat_messages').select('id').eq('author_id', user.id).is('deleted_at', null).limit(500);
    const myIds = (myMsgs || []).map(m => m.id);
    let replies: any[] = [];
    if (myIds.length > 0) {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, channel_id, author_id, body, created_at, reply_to_id')
        .in('reply_to_id', myIds)
        .is('deleted_at', null)
        .neq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80);
      replies = data || [];
    }

    const msgIds = [
      ...(mentions || []).map(m => m.message_id),
      ...replies.map(r => r.id),
    ];
    const channelIds = [
      ...(mentions || []).map(m => m.channel_id),
      ...replies.map(r => r.channel_id),
    ];
    const authorIds = [
      ...(mentions || []).map(m => m.author_id),
      ...replies.map(r => r.author_id),
    ];

    const [{ data: msgs }, { data: profiles }, { data: channels }] = await Promise.all([
      msgIds.length
        ? chatApi.client.from('chat_messages').select('id, body, created_at, channel_id, author_id, reply_to_id').in('id', msgIds).is('deleted_at', null)
        : Promise.resolve({ data: [] as any[] }),
      authorIds.length
        ? chatApi.client.from('profiles').select('user_id, full_name').in('user_id', Array.from(new Set(authorIds)))
        : Promise.resolve({ data: [] as any[] }),
      channelIds.length
        ? chatApi.client.from('chat_channels').select('id, name').in('id', Array.from(new Set(channelIds)))
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const mMap = new Map((msgs || []).map((m: any) => [m.id, m]));
    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const cMap = new Map((channels || []).map((c: any) => [c.id, c]));

    const collected: InboxItem[] = [];
    for (const m of mentions || []) {
      const msg = mMap.get(m.message_id);
      if (!msg) continue;
      collected.push({
        kind: 'mention',
        message_id: m.message_id,
        channel_id: m.channel_id,
        channel_name: cMap.get(m.channel_id)?.name || 'Canal',
        author_id: m.author_id,
        author_name: pMap.get(m.author_id)?.full_name || 'Usuário',
        body: msg.body,
        created_at: m.created_at,
      });
    }
    for (const r of replies) {
      collected.push({
        kind: 'reply',
        message_id: r.id,
        channel_id: r.channel_id,
        channel_name: cMap.get(r.channel_id)?.name || 'Canal',
        author_id: r.author_id,
        author_name: pMap.get(r.author_id)?.full_name || 'Usuário',
        body: r.body,
        created_at: r.created_at,
        parent_id: r.reply_to_id,
      });
    }

    collected.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setItems(collected);
    setUnread(collected.filter(c => !lsa || c.created_at > lsa).length);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAllSeen = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await chatApi.client.from('chat_user_inbox_state').upsert({ user_id: user.id, last_seen_at: now, updated_at: now });
    setLastSeenAt(now);
    setUnread(0);
  }, [user]);

  return { items, unread, loading, lastSeenAt, reload: load, markAllSeen };
}
