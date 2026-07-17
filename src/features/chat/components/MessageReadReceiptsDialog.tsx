import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCheck, Clock, Eye, Loader2 } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messageId: string;
  channelId: string;
  authorId: string;
  messageCreatedAt: string;
  /** read_by já enriquecido vindo da mensagem */
  readBy: { user_id: string; read_at: string; full_name?: string; avatar_url?: string | null }[];
}

interface Row {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  read_at: string | null;
  is_author: boolean;
}

export function MessageReadReceiptsDialog({
  open, onOpenChange, messageId, channelId, authorId, messageCreatedAt, readBy,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    (async () => {
      setLoading(true);
      // 1) membros do canal
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('user_id, role')
        .eq('channel_id', channelId);
      const memberIds = (members || []).map((m: any) => m.user_id);
      const roleMap = new Map<string, string>();
      (members || []).forEach((m: any) => roleMap.set(m.user_id, m.role));

      // 2) profiles
      const { data: profs } = memberIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', memberIds)
        : { data: [] as any[] };
      const profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      (profs || []).forEach((p: any) => profMap.set(p.user_id, {
        full_name: p.full_name || 'Usuário',
        avatar_url: p.avatar_url ?? null,
      }));

      const readMap = new Map<string, string>();
      readBy.forEach(r => readMap.set(r.user_id, r.read_at));

      const list: Row[] = (members || []).map((m: any) => {
        const p = profMap.get(m.user_id);
        return {
          user_id: m.user_id,
          full_name: p?.full_name || 'Usuário',
          avatar_url: p?.avatar_url ?? null,
          role: m.role,
          read_at: readMap.get(m.user_id) ?? null,
          is_author: m.user_id === authorId,
        };
      });
      setRows(list);
      setLoading(false);
    })();
  }, [open, channelId, messageId, authorId, readBy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.full_name.toLowerCase().includes(q) || (r.role || '').toLowerCase().includes(q));
  }, [rows, search]);

  // Considera "leitor" qualquer membro com read_at, exceto autor (que não precisa marcar leitura)
  const readers = filtered.filter(r => !r.is_author && r.read_at);
  const pending = filtered.filter(r => !r.is_author && !r.read_at);
  const totalMembers = rows.filter(r => !r.is_author).length;
  const totalReaders = rows.filter(r => !r.is_author && r.read_at).length;

  // Ordena leitores pelo mais recente; pendentes alfabético
  readers.sort((a, b) => (a.read_at! < b.read_at! ? 1 : -1));
  pending.sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Confirmações de leitura
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/40 text-xs">
          <span className="text-muted-foreground">
            Mensagem enviada {formatDistanceToNow(parseISO(messageCreatedAt), { locale: ptBR, addSuffix: true })}
          </span>
          <Badge variant="secondary" className="font-bold">
            {totalReaders}/{totalMembers}
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou perfil…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <ScrollArea className="h-[360px] -mx-6 px-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <Section
                icon={<CheckCheck className="h-3.5 w-3.5 text-emerald-600" />}
                title={`Leram (${readers.length})`}
                empty="Ninguém leu ainda."
                rows={readers}
                showTime
              />
              <Section
                icon={<Clock className="h-3.5 w-3.5 text-amber-600" />}
                title={`Pendentes (${pending.length})`}
                empty="Todos já leram."
                rows={pending}
              />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon, title, empty, rows, showTime,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  rows: Row[];
  showTime?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70 px-2 py-2">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map(r => {
            const initials = r.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
            return (
              <li key={r.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-muted/50">
                <Avatar className="h-7 w-7">
                  {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate leading-tight">{r.full_name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                    {r.role || 'membro'}
                  </div>
                </div>
                {showTime && r.read_at && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-medium text-foreground/80">
                      {format(parseISO(r.read_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(r.read_at), { locale: ptBR, addSuffix: true })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
