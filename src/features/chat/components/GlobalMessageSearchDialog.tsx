import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatChatTime } from '../utils/formatChatTime';

interface Result {
  id: string;
  channel_id: string;
  body: string;
  created_at: string;
  channel_name: string;
  author_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalMessageSearchDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) { setTerm(''); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    const q = term.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    if (tRef.current) window.clearTimeout(tRef.current);
    setLoading(true);
    tRef.current = window.setTimeout(async () => {
      // Canais do usuário
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', user.id);
      const channelIds = (members || []).map((m: any) => m.channel_id);
      if (channelIds.length === 0) { setResults([]); setLoading(false); return; }
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('id, channel_id, body, created_at, author_id')
        .in('channel_id', channelIds)
        .is('deleted_at', null)
        .ilike('body', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      const list = (msgs || []) as any[];
      const chIds = Array.from(new Set(list.map(m => m.channel_id)));
      const authorIds = Array.from(new Set(list.map(m => m.author_id).filter(Boolean)));
      const [{ data: chs }, { data: profiles }] = await Promise.all([
        chIds.length ? chatApi.client.from('chat_channels').select('id, name').in('id', chIds) : Promise.resolve({ data: [] as any[] }),
        authorIds.length ? chatApi.client.from('profiles').select('user_id, full_name').in('user_id', authorIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const chMap = new Map((chs || []).map((c: any) => [c.id, c.name]));
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      setResults(list.map(m => ({
        id: m.id,
        channel_id: m.channel_id,
        body: m.body,
        created_at: m.created_at,
        channel_name: chMap.get(m.channel_id) || 'Canal',
        author_name: pMap.get(m.author_id) || null,
      })));
      setLoading(false);
    }, 300);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  }, [term, open, user]);

  const highlight = useMemo(() => {
    const q = term.trim();
    if (!q) return (s: string) => s;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return (s: string) =>
      s.split(re).map((part, i) =>
        re.test(part) ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark> : <span key={i}>{part}</span>
      );
  }, [term]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Buscar no chat</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Digite ao menos 2 caracteres…"
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {loading && (
            <div className="px-4 py-6 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando…
            </div>
          )}
          {!loading && term.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem encontrada.</div>
          )}
          {!loading && term.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Procure por palavras em qualquer conversa em que você participe.
            </div>
          )}
          <ul className="px-2 pb-2">
            {results.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => { onOpenChange(false); navigate(`/chat/${r.channel_id}?message=${r.id}`); }}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Hash className="h-3 w-3" />
                    <span className="font-semibold text-foreground/80 truncate">{r.channel_name}</span>
                    <span>•</span>
                    <span>{formatChatTime(r.created_at)}</span>
                    {r.author_name && (<><span>•</span><span className="truncate">{r.author_name}</span></>)}
                  </div>
                  <p className="text-sm line-clamp-2 text-foreground/90">{highlight(r.body || '')}</p>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
