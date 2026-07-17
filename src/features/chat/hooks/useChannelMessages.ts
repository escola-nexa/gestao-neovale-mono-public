import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from '../types';

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const profilesCache = useRef<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

  const enrichAuthors = useCallback(async (msgs: any[]): Promise<ChatMessage[]> => {
    if (!msgs.length) return [];
    const authorIds = msgs.map(m => m.author_id);
    // We need read profiles too; collect after we fetch reads. First ensure authors are cached.
    const missingAuthors = Array.from(new Set(authorIds)).filter(id => !profilesCache.current.has(id));
    if (missingAuthors.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', missingAuthors);
      (profs || []).forEach((p: any) => {
        profilesCache.current.set(p.user_id, { full_name: p.full_name || 'Usuário', avatar_url: p.avatar_url });
      });
    }
    const ids = msgs.map(m => m.id);
    const [attachRes, readsRes, labelsRes, ticketsRes, repliesRes] = await Promise.all([
      ids.length
        ? supabase.from('chat_message_attachments').select('*').in('message_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from('chat_message_reads').select('message_id, user_id, read_at').in('message_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase
            .from('chat_message_label_assignments')
            .select('message_id, label:chat_message_labels(id, name, color)')
            .in('message_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase
            .from('chat_message_tickets')
            .select('message_id, ticket:tickets(id, title, status)')
            .in('message_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase
            .from('chat_messages')
            .select('reply_to_id, created_at')
            .in('reply_to_id', ids)
            .is('deleted_at', null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const attMap = new Map<string, any[]>();
    (attachRes.data || []).forEach((a: any) => {
      const arr = attMap.get(a.message_id) || [];
      arr.push(a);
      attMap.set(a.message_id, arr);
    });
    // Cache reader profiles
    const readerIds = Array.from(new Set((readsRes.data || []).map((r: any) => r.user_id)))
      .filter(id => !profilesCache.current.has(id));
    if (readerIds.length > 0) {
      const { data: rprofs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', readerIds);
      (rprofs || []).forEach((p: any) => {
        profilesCache.current.set(p.user_id, { full_name: p.full_name || 'Usuário', avatar_url: p.avatar_url });
      });
    }
    const readMap = new Map<string, any[]>();
    (readsRes.data || []).forEach((r: any) => {
      const prof = profilesCache.current.get(r.user_id);
      const arr = readMap.get(r.message_id) || [];
      arr.push({
        user_id: r.user_id,
        read_at: r.read_at,
        full_name: prof?.full_name,
        avatar_url: prof?.avatar_url ?? null,
      });
      readMap.set(r.message_id, arr);
    });
    const labelsMap = new Map<string, any[]>();
    (labelsRes.data || []).forEach((r: any) => {
      if (!r.label) return;
      const arr = labelsMap.get(r.message_id) || [];
      arr.push(r.label);
      labelsMap.set(r.message_id, arr);
    });
    const ticketsMap = new Map<string, any[]>();
    (ticketsRes.data || []).forEach((r: any) => {
      if (!r.ticket) return;
      const arr = ticketsMap.get(r.message_id) || [];
      arr.push({ ticket_id: r.ticket.id, title: r.ticket.title, status: r.ticket.status });
      ticketsMap.set(r.message_id, arr);
    });
    const replyCountMap = new Map<string, { count: number; last: string }>();
    (repliesRes.data || []).forEach((r: any) => {
      const cur = replyCountMap.get(r.reply_to_id);
      if (!cur) replyCountMap.set(r.reply_to_id, { count: 1, last: r.created_at });
      else replyCountMap.set(r.reply_to_id, {
        count: cur.count + 1,
        last: r.created_at > cur.last ? r.created_at : cur.last,
      });
    });

    // Cache deleter profiles
    const deleterIds = Array.from(new Set(msgs.map((m: any) => m.deleted_by).filter(Boolean)))
      .filter(id => !profilesCache.current.has(id as string));
    if (deleterIds.length > 0) {
      const { data: dprofs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', deleterIds as string[]);
      (dprofs || []).forEach((p: any) => {
        profilesCache.current.set(p.user_id, { full_name: p.full_name || 'Usuário', avatar_url: p.avatar_url });
      });
    }

    return msgs.map((m: any) => {
      const prof = profilesCache.current.get(m.author_id);
      const replyMeta = replyCountMap.get(m.id);
      const deleterProf = m.deleted_by ? profilesCache.current.get(m.deleted_by) : null;
      return {
        ...m,
        author_name: prof?.full_name || 'Usuário',
        author_avatar: prof?.avatar_url ?? null,
        deleted_by_name: deleterProf?.full_name || null,
        attachments: attMap.get(m.id) || [],
        read_by: readMap.get(m.id) || [],
        labels: labelsMap.get(m.id) || [],
        linked_tickets: ticketsMap.get(m.id) || [],
        reply_count: replyMeta?.count || 0,
        last_reply_at: replyMeta?.last || null,
      };
    });
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!channelId) return;
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    // Latest 200 root messages, then reverse for ascending UI order
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .is('reply_to_id', null)
      .order('created_at', { ascending: false })
      .limit(200);
    const ordered = (data || []).slice().reverse();
    const enriched = await enrichAuthors(ordered);
    if (silent) {
      setMessages(prev => {
        if (prev.length === 0) return enriched;
        const prevById = new Map(prev.map(m => [m.id, m]));
        const merged = enriched.map(n => {
          const old = prevById.get(n.id);
          if (!old) return n;
          const sameBody = old.body === n.body && old.edited_at === n.edited_at && old.deleted_at === n.deleted_at;
          const sameAttCount = (old.attachments?.length || 0) === (n.attachments?.length || 0);
          const sameReadCount = (old.read_by?.length || 0) === (n.read_by?.length || 0);
          const sameLabelCount = (old.labels?.length || 0) === (n.labels?.length || 0);
          const sameTicketCount = (old.linked_tickets?.length || 0) === (n.linked_tickets?.length || 0);
          const sameReplyCount = (old.reply_count || 0) === (n.reply_count || 0);
          if (sameBody && sameAttCount && sameReadCount && sameLabelCount && sameTicketCount && sameReplyCount) {
            return old;
          }
          return n;
        });
        const sameLength = merged.length === prev.length;
        const allSame = sameLength && merged.every((m, i) => m === prev[i]);
        return allSame ? prev : merged;
      });
    } else {
      setMessages(enriched);
      setLoading(false);
    }
  }, [channelId, enrichAuthors]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    if (!channelId) return;
    // Nome único por instância para evitar colisão durante troca rápida de canais
    const channelName = `chat-msgs:${channelId}:${Math.random().toString(36).slice(2, 9)}`;
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload: any) => {
        console.log('[chat realtime] INSERT', payload.new?.id);
        // Se for reply, só atualiza contador da mensagem-pai (silencioso)
        if (payload.new.reply_to_id) {
          load({ silent: true });
          return;
        }
        try {
          const enriched = await enrichAuthors([payload.new]);
          setMessages(prev => prev.find(m => m.id === enriched[0].id) ? prev : [...prev, ...enriched]);
        } catch (err) {
          console.error('[chat realtime] enrich error, fallback to full reload', err);
          load({ silent: true });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload: any) => {
        if (payload.new.reply_to_id) return;
        try {
          const enriched = await enrichAuthors([payload.new]);
          setMessages(prev => {
            const exists = prev.find(m => m.id === enriched[0].id);
            if (exists) return prev.map(m => m.id === enriched[0].id ? enriched[0] : m);
            return [...prev, ...enriched];
          });
        } catch (err) {
          console.error('[chat realtime] update enrich error', err);
          load({ silent: true });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_message_reads',
      }, async (payload: any) => {
        // Aplica leitura in-place: NÃO recarrega tudo (evita scroll jump)
        const messageId = payload.new?.message_id as string | undefined;
        const userId = payload.new?.user_id as string | undefined;
        const readAt = payload.new?.read_at as string | undefined;
        if (!messageId || !userId) return;
        // Garante perfil em cache
        if (!profilesCache.current.has(userId)) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', userId)
            .maybeSingle();
          if (prof) {
            profilesCache.current.set(prof.user_id, {
              full_name: (prof as any).full_name || 'Usuário',
              avatar_url: (prof as any).avatar_url ?? null,
            });
          }
        }
        const prof = profilesCache.current.get(userId);
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m;
          const reads = m.read_by || [];
          if (reads.some(r => r.user_id === userId)) return m;
          return {
            ...m,
            read_by: [
              ...reads,
              {
                user_id: userId,
                read_at: readAt || new Date().toISOString(),
                full_name: prof?.full_name,
                avatar_url: prof?.avatar_url ?? null,
              },
            ],
          };
        }));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_message_label_assignments',
      }, () => { load({ silent: true }); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_message_labels',
      }, () => { load({ silent: true }); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_message_tickets',
      }, () => { load({ silent: true }); })
      .subscribe((status) => {
        console.log('[chat realtime]', channelName, 'status:', status);
      });
    return () => { supabase.removeChannel(ch); };
  }, [channelId, enrichAuthors, load]);

  // Fallback: poll leve a cada 15s para recuperar mensagens caso o realtime caia (silencioso)
  useEffect(() => {
    if (!channelId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load({ silent: true });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [channelId, load]);

  // Always advance last_read_at to NOW when channel opens (or changes),
  // independent of message-list state — guarantees the unread badge clears
  // even if the user closes the popup before the 700ms debounce.
  useEffect(() => {
    if (!user || !channelId) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
    })();
    return () => { cancelled = true; };
  }, [channelId, user]);

  // Mark visible messages as read individually (for read receipts)
  useEffect(() => {
    if (!user || !channelId || messages.length === 0) return;
    const t = setTimeout(async () => {
      const unread = messages.filter(m =>
        m.author_id !== user.id && !(m.read_by || []).some(r => r.user_id === user.id)
      );
      if (unread.length === 0) return;
      const rows = unread.map(m => ({ message_id: m.id, user_id: user.id }));
      await supabase.from('chat_message_reads').upsert(rows, { onConflict: 'message_id,user_id' });
      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
    }, 700);
    return () => clearTimeout(t);
  }, [messages, user, channelId]);

  return { messages, loading, reload: load };
}
