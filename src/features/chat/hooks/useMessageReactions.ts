import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user_name?: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: { user_id: string; user_name?: string }[];
}

const EVENT = 'chat-message-reactions-changed';

function emitChange(messageId: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { messageId } }));
}

export function useMessageReactions(messageId: string) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);

  const load = useCallback(async () => {
    if (!messageId) return;
    const { data } = await supabase
      .from('chat_message_reactions')
      .select('id, message_id, user_id, emoji')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });
    if (!data) return;
    // enriquece com nomes
    const userIds = Array.from(new Set(data.map((r) => r.user_id)));
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      (profs || []).forEach((p: any) =>
        nameMap.set(p.user_id, p.full_name || 'Usuário'),
      );
    }
    setReactions(
      data.map((r) => ({ ...r, user_name: nameMap.get(r.user_id) })),
    );
  }, [messageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime + same-tab event
  useEffect(() => {
    if (!messageId) return;
    const ch = supabase
      .channel(`msg-reactions:${messageId}:${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          load();
        },
      )
      .subscribe();
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.messageId === messageId) load();
    };
    window.addEventListener(EVENT, onLocal);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener(EVENT, onLocal);
    };
  }, [messageId, load]);

  const toggle = useCallback(
    async (emoji: string) => {
      if (!user || !messageId || !emoji) return;
      const existing = reactions.find(
        (r) => r.user_id === user.id && r.emoji === emoji,
      );
      // Optimistic
      if (existing) {
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) {
          toast.error('Erro ao remover reação');
          load();
        } else {
          emitChange(messageId);
        }
      } else {
        const tempId = `temp-${Date.now()}`;
        setReactions((prev) => [
          ...prev,
          { id: tempId, message_id: messageId, user_id: user.id, emoji },
        ]);
        const { error } = await supabase
          .from('chat_message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) {
          if (!error.message?.includes('duplicate')) {
            toast.error('Erro ao reagir');
          }
          setReactions((prev) => prev.filter((r) => r.id !== tempId));
          load();
        } else {
          emitChange(messageId);
          load();
        }
      }
    },
    [user, messageId, reactions, load],
  );

  // Agrupa por emoji
  const groups: ReactionGroup[] = (() => {
    const map = new Map<string, ReactionGroup>();
    for (const r of reactions) {
      const g = map.get(r.emoji);
      if (g) {
        g.count += 1;
        g.users.push({ user_id: r.user_id, user_name: r.user_name });
        if (r.user_id === user?.id) g.reactedByMe = true;
      } else {
        map.set(r.emoji, {
          emoji: r.emoji,
          count: 1,
          reactedByMe: r.user_id === user?.id,
          users: [{ user_id: r.user_id, user_name: r.user_name }],
        });
      }
    }
    return Array.from(map.values());
  })();

  return { reactions, groups, toggle, reload: load };
}
