import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { chatApi } from '@/features/chat/api';

interface MemberOption {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface MentionAutocompleteHandle {
  /** Returns true if it consumed the keystroke */
  onKeyDown: (e: React.KeyboardEvent) => boolean;
}

interface Props {
  channelId: string;
  query: string | null; // null = closed; '' = open with no filter
  onSelect: (member: MemberOption) => void;
  onClose: () => void;
}

export const MentionAutocomplete = forwardRef<MentionAutocompleteHandle, Props>(function MentionAutocomplete(
  { channelId, query, onSelect, onClose }, ref
) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [active, setActive] = useState(0);
  const cacheRef = useRef<MemberOption[] | null>(null);

  useEffect(() => {
    if (query === null) return;
    let cancelled = false;
    (async () => {
      if (cacheRef.current) return;
      const { data: mems } = await supabase
        .from('chat_channel_members').select('user_id').eq('channel_id', channelId);
      const ids = (mems || []).map((m: any) => m.user_id);
      if (ids.length === 0) { setMembers([]); return; }
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name, avatar_url').in('user_id', ids);
      if (cancelled) return;
      const list = (profiles || []) as MemberOption[];
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      cacheRef.current = list;
      setMembers(list);
    })();
    return () => { cancelled = true; };
  }, [channelId, query]);

  const filtered = (cacheRef.current || members).filter(m => {
    if (!query) return true;
    return m.full_name.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 8);

  useEffect(() => { setActive(0); }, [query]);

  useImperativeHandle(ref, () => ({
    onKeyDown(e) {
      if (query === null) return false;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(filtered.length - 1, i + 1)); return true; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); return true; }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return true; }
      if ((e.key === 'Enter' || e.key === 'Tab') && filtered[active]) {
        e.preventDefault();
        onSelect(filtered[active]);
        return true;
      }
      return false;
    },
  }), [query, filtered, active, onSelect, onClose]);

  if (query === null || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg max-h-56 overflow-auto z-30">
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
        Mencionar membro · ↑↓ Enter
      </div>
      {filtered.map((m, i) => (
        <button
          key={m.user_id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(m); }}
          onMouseEnter={() => setActive(i)}
          className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 ${i === active ? 'bg-muted' : 'hover:bg-muted/60'}`}
        >
          <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
            {m.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <span className="truncate">{m.full_name}</span>
        </button>
      ))}
    </div>
  );
});
