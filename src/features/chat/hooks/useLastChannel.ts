import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Retorna o channel_id da última conversa em que o usuário ENVIOU uma mensagem.
 * Fallback: última mensagem (de qualquer autor) em canais dos quais ele participa.
 */
export function useLastChannel() {
  const { user } = useAuth();
  const [lastChannelId, setLastChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLastChannelId(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1. Última mensagem enviada pelo próprio usuário
      const { data: sent } = await supabase
        .from('chat_messages')
        .select('channel_id, created_at')
        .eq('author_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (sent?.channel_id) {
        setLastChannelId(sent.channel_id);
        setLoading(false);
        return;
      }
      // 2. Fallback: canal com atividade mais recente
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', user.id);
      const ids = (members ?? []).map((m: any) => m.channel_id);
      if (!ids.length) { setLastChannelId(null); setLoading(false); return; }
      const { data: recent } = await supabase
        .from('chat_messages')
        .select('channel_id, created_at')
        .in('channel_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLastChannelId(recent?.channel_id ?? ids[0] ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { lastChannelId, loading };
}
