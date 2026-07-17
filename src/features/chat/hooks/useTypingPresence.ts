import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser { user_id: string; full_name: string; }

const TYPING_TIMEOUT_MS = 4000;

export function useTypingPresence(channelId: string | null, currentUserName?: string | null) {
  const { user } = useAuth();
  const [typing, setTyping] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!channelId || !user) return;
    const ch = chatApi.stubChannel(); // realtime channel code removed for decoupled backend

    const computeTyping = () => {
      const state = ch.presenceState() as Record<string, Array<TypingUser & { typing_at?: number }>>;
      const now = Date.now();
      const list: TypingUser[] = [];
      for (const [uid, metas] of Object.entries(state)) {
        if (uid === user.id) continue;
        const meta = metas[0];
        if (meta && (meta as any).typing_at && now - (meta as any).typing_at < TYPING_TIMEOUT_MS) {
          list.push({ user_id: uid, full_name: meta.full_name });
        }
      }
      setTyping(list);
    };

    ch.on('presence', { event: 'sync' }, computeTyping);
    ch.on('presence', { event: 'join' }, computeTyping);
    ch.on('presence', { event: 'leave' }, computeTyping);
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ user_id: user.id, full_name: currentUserName || 'Usuário', typing_at: 0 });
      }
    });
    channelRef.current = ch;

    const interval = window.setInterval(computeTyping, 1500);

    return () => {
      window.clearInterval(interval);
      chatApi.removeChannel();
      channelRef.current = null;
    };
  }, [channelId, user, currentUserName]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    const ch = channelRef.current;
    if (!ch || !user) return;
    ch.track({ user_id: user.id, full_name: currentUserName || 'Usuário', typing_at: now });
  }, [user, currentUserName]);

  return { typing, notifyTyping };
}
