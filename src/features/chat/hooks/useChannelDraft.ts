import { useEffect, useState, useCallback } from 'react';

const KEY = (channelId: string, replyToId?: string | null) =>
  `chat:draft:${channelId}${replyToId ? ':r:' + replyToId : ''}`;

export function useChannelDraft(channelId: string, replyToId?: string | null) {
  const k = KEY(channelId, replyToId);
  const [value, setValue] = useState<string>(() => {
    try { return localStorage.getItem(k) || ''; } catch { return ''; }
  });

  // sync when channel changes
  useEffect(() => {
    try { setValue(localStorage.getItem(k) || ''); } catch { setValue(''); }
  }, [k]);

  // debounced persist
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (value) localStorage.setItem(k, value);
        else localStorage.removeItem(k);
      } catch { /* ignore */ }
    }, 400);
    return () => window.clearTimeout(t);
  }, [k, value]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(k); } catch {}
    setValue('');
  }, [k]);

  return { value, setValue, clear };
}

export function hasChannelDraft(channelId: string): boolean {
  try {
    return !!localStorage.getItem(KEY(channelId));
  } catch {
    return false;
  }
}
