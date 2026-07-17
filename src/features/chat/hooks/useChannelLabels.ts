import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChatChannelLabel } from '../types';

export function useChannelLabels(organizationId: string | null | undefined) {
  const [labels, setLabels] = useState<ChatChannelLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!organizationId) {
      setLabels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('chat_channel_labels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    setLabels((data || []) as ChatChannelLabel[]);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: re-fetch on any change to labels for this org
  useEffect(() => {
    if (!organizationId) return;
    const ch = supabase
      .channel('chat-channel-labels:' + organizationId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_channel_labels',
        filter: `organization_id=eq.${organizationId}`,
      }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [organizationId, reload]);

  const create = async (name: string, color: string) => {
    if (!organizationId) return;
    const { error } = await supabase
      .from('chat_channel_labels')
      .insert({ organization_id: organizationId, name: name.trim(), color });
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta criada');
    reload();
  };

  const update = async (id: string, name: string, color: string) => {
    const { error } = await supabase
      .from('chat_channel_labels')
      .update({ name: name.trim(), color })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta atualizada');
    reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('chat_channel_labels').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Etiqueta removida');
    reload();
  };

  return { labels, loading, reload, create, update, remove };
}

// Cross-component sync within the same tab (instant, no realtime latency)
const ASSIGN_EVENT = 'chat-channel-label-assignments-changed';
function emitAssignmentChange(channelId: string) {
  window.dispatchEvent(new CustomEvent(ASSIGN_EVENT, { detail: { channelId } }));
}

export function useChannelLabelAssignments(channelId: string | null | undefined) {
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!channelId) { setLabelIds([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_channel_label_assignments')
      .select('label_id')
      .eq('channel_id', channelId);
    if (error) {
      console.error('[useChannelLabelAssignments] reload error', error);
    }
    setLabelIds((data || []).map((r: any) => r.label_id));
    setLoading(false);
  }, [channelId]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: refresh when assignments for this channel change (cross-user)
  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel('chat-channel-label-assign:' + channelId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_channel_label_assignments',
        filter: `channel_id=eq.${channelId}`,
      }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, reload]);

  // Same-tab sync via CustomEvent (instant)
  useEffect(() => {
    if (!channelId) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.channelId === channelId) reload();
    };
    window.addEventListener(ASSIGN_EVENT, handler);
    return () => window.removeEventListener(ASSIGN_EVENT, handler);
  }, [channelId, reload]);

  const toggle = async (labelId: string) => {
    if (!channelId) return;
    const wasApplied = labelIds.includes(labelId);
    // Optimistic update
    setLabelIds(prev => wasApplied ? prev.filter(x => x !== labelId) : [...prev, labelId]);
    if (wasApplied) {
      const { error } = await supabase
        .from('chat_channel_label_assignments')
        .delete()
        .eq('channel_id', channelId)
        .eq('label_id', labelId);
      if (error) {
        console.error('[toggle label] delete error', error);
        toast.error('Não foi possível remover a etiqueta: ' + error.message);
        setLabelIds(prev => [...prev, labelId]); // revert
        return;
      }
    } else {
      const { error } = await supabase
        .from('chat_channel_label_assignments')
        .insert({ channel_id: channelId, label_id: labelId });
      if (error) {
        console.error('[toggle label] insert error', error);
        toast.error('Não foi possível aplicar a etiqueta: ' + error.message);
        setLabelIds(prev => prev.filter(x => x !== labelId)); // revert
        return;
      }
    }
    emitAssignmentChange(channelId);
    reload();
  };

  return { labelIds, loading, toggle, reload };
}

/** Hook returning a map channel_id -> label[] for a list of channels */
export function useChannelsLabelsMap(channelIds: string[]) {
  const [map, setMap] = useState<Record<string, ChatChannelLabel[]>>({});
  const safeIds = channelIds || [];
  const key = safeIds.join(',');

  const load = useCallback(async () => {
    if (!channelIds.length) { setMap({}); return; }
    const { data } = await supabase
      .from('chat_channel_label_assignments')
      .select('channel_id, label:chat_channel_labels(id, name, color, organization_id)')
      .in('channel_id', channelIds);
    const out: Record<string, ChatChannelLabel[]> = {};
    (data || []).forEach((r: any) => {
      if (!r.label) return;
      const arr = out[r.channel_id] || [];
      arr.push(r.label);
      out[r.channel_id] = arr;
    });
    setMap(out);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Realtime: react to assignment changes AND label edits (rename/recolor/delete)
  useEffect(() => {
    if (!channelIds.length) return;
    const ch = supabase
      .channel('chat-channels-labels-map:' + key)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_channel_label_assignments',
      }, () => load())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_channel_labels',
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [key, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same-tab sync: instant refresh when any assignment changes
  useEffect(() => {
    if (!channelIds.length) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (channelIds.includes(detail?.channelId)) load();
    };
    window.addEventListener(ASSIGN_EVENT, handler);
    return () => window.removeEventListener(ASSIGN_EVENT, handler);
  }, [key, load]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

