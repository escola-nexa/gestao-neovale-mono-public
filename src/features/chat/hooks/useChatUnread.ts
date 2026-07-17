import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useChatUnread(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);
      if (!members || members.length === 0) {
        if (!cancelled) setCount(0);
        return;
      }
      let total = 0;
      for (const m of members as any[]) {
        const q = supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', m.channel_id)
          .is('deleted_at', null)
          .neq('author_id', user.id);
        const { count: c } = m.last_read_at ? await q.gt('created_at', m.last_read_at) : await q;
        total += c ?? 0;
      }
      if (!cancelled) setCount(total);
    };
    load();
    const ch = supabase
      .channel('chat-unread:' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_message_reads', filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  return count;
}
