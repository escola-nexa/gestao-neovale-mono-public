import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatChannel } from '../types';

export interface ChannelWithMeta extends ChatChannel {
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  member_count: number;
  pinned_at: string | null;
  archived_at: string | null;
  display_name?: string;
}


export function useChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChannelWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) channels where the user is member
      const { data: memberships } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at, pinned_at, archived_at')
        .eq('user_id', user.id);

      const channelIds = (memberships || []).map((m: any) => m.channel_id);
      if (channelIds.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }
      const lastReadMap = new Map<string, string | null>();
      const pinnedMap = new Map<string, string | null>();
      const archivedMap = new Map<string, string | null>();
      (memberships || []).forEach((m: any) => {
        lastReadMap.set(m.channel_id, m.last_read_at);
        pinnedMap.set(m.channel_id, m.pinned_at);
        archivedMap.set(m.channel_id, m.archived_at);
      });

      const { data: chs } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('updated_at', { ascending: false });

      // 2) for each channel, get last message and unread count
      const enriched: ChannelWithMeta[] = await Promise.all(
        (chs || []).map(async (c: any) => {
          const lastRead = lastReadMap.get(c.id);
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('body, created_at')
            .eq('channel_id', c.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let unread = 0;
          if (lastRead) {
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('channel_id', c.id)
              .is('deleted_at', null)
              .gt('created_at', lastRead)
              .neq('author_id', user.id);
            unread = count ?? 0;
          } else {
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('channel_id', c.id)
              .is('deleted_at', null)
              .neq('author_id', user.id);
            unread = count ?? 0;
          }

          const { count: memberCount } = await supabase
            .from('chat_channel_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('channel_id', c.id);

          return {
            ...c,
            unread_count: unread,
            last_message_at: lastMsg?.created_at ?? null,
            last_message_preview: lastMsg?.body ?? null,
            member_count: memberCount ?? 0,
            pinned_at: pinnedMap.get(c.id) ?? null,
            archived_at: archivedMap.get(c.id) ?? null,
          };
        })
      );

      // Resolve display names for direct channels: "Eu — Outro"
      const directChannels = enriched.filter((c) => c.type === 'direct');
      if (directChannels.length > 0) {
        const directIds = directChannels.map((c) => c.id);
        const { data: dmMembers } = await supabase
          .from('chat_channel_members')
          .select('channel_id, user_id')
          .in('channel_id', directIds);
        const allUserIds = Array.from(new Set((dmMembers || []).map((m: any) => m.user_id)));
        const { data: profs } = allUserIds.length
          ? await chatApi.client.from('profiles').select('user_id, full_name').in('user_id', allUserIds)
          : { data: [] as any[] };
        const nameMap = new Map<string, string>();
        (profs || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name || ''));
        const myName = nameMap.get(user.id) || 'Você';
        const byChannel = new Map<string, string[]>();
        (dmMembers || []).forEach((m: any) => {
          const arr = byChannel.get(m.channel_id) || [];
          if (m.user_id !== user.id) arr.push(nameMap.get(m.user_id) || 'Sem nome');
          byChannel.set(m.channel_id, arr);
        });
        enriched.forEach((c) => {
          if (c.type !== 'direct') return;
          const others = byChannel.get(c.id) || [];
          const otherName = others.length ? others.join(', ') : (c.name || 'Sem nome');
          c.display_name = `${myName} — ${otherName}`;
        });
      }

      enriched.sort((a, b) => {
        // Pinned first (mais recentemente fixado primeiro)
        if (a.pinned_at && !b.pinned_at) return -1;
        if (!a.pinned_at && b.pinned_at) return 1;
        if (a.pinned_at && b.pinned_at) return b.pinned_at.localeCompare(a.pinned_at);
        const at = a.last_message_at || a.updated_at;
        const bt = b.last_message_at || b.updated_at;
        return bt.localeCompare(at);
      });

      setChannels(enriched);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // realtime: refresh whenever messages change in any channel the user belongs to
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-channels-meta:' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channel_members', filter: `user_id=eq.${user.id}` }, () => {
        load();
      })
      .subscribe();
    return () => {
      chatApi.removeChannel();
    };
  }, [user, load]);

  return { channels, loading, reload: load };
}
