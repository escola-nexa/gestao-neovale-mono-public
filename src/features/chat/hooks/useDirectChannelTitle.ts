import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatChannel } from '../types';

/**
 * Para canais do tipo `direct`, retorna o título no formato
 * "<Meu nome> — <Outro participante>".
 * Para outros tipos de canal, retorna o `channel.name` original.
 */
export function useDirectChannelTitle(channel: ChatChannel | null | undefined): string {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>(channel?.name || '');

  useEffect(() => {
    if (!channel) { setTitle(''); return; }
    if (channel.type !== 'direct') { setTitle(channel.name); return; }
    if (!user?.id) { setTitle(channel.name); return; }

    let cancelled = false;
    (async () => {
      const { data: mems } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channel.id);
      const ids = (mems || []).map((m: any) => m.user_id);
      if (!ids.length) {
        if (!cancelled) setTitle(channel.name);
        return;
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      if (cancelled) return;

      const me = (profs || []).find((p: any) => p.user_id === user.id);
      const other = (profs || []).find((p: any) => p.user_id !== user.id);

      const myName = me?.full_name || 'Você';
      const otherName = other?.full_name || channel.name || 'Sem nome';
      setTitle(`${myName} — ${otherName}`);
    })();

    return () => { cancelled = true; };
  }, [channel?.id, channel?.type, channel?.name, user?.id]);

  return title || channel?.name || '';
}
