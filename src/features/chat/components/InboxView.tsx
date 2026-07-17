import { useEffect } from 'react';
import { Inbox, AtSign, Reply as ReplyIcon, MessageSquare, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChatInbox } from '../hooks/useChatInbox';
import { stripMentionMarkup } from '../utils/parseMentions';

export function InboxView() {
  const { items, loading, unread, lastSeenAt, markAllSeen } = useChatInbox();
  const navigate = useNavigate();

  // Marca como visto ao montar (após pequeno delay para mostrar contador)
  useEffect(() => {
    const t = setTimeout(() => { markAllSeen(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-14 border-b px-5 flex items-center gap-2 bg-card/50 shrink-0">
        <Inbox className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-semibold">Para você</h1>
        <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" className="h-7" onClick={markAllSeen}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar como visto
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1">
        {loading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Nada para você por aqui</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Quando alguém te mencionar com @ ou responder em uma de suas threads, aparece aqui.
            </p>
          </div>
        )}
        <ul className="divide-y">
          {items.map(it => {
            const isNew = !lastSeenAt || it.created_at > lastSeenAt;
            return (
              <li key={`${it.kind}-${it.message_id}`} className={`px-5 py-3 hover:bg-muted/40 transition-colors ${isNew ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                      {it.kind === 'mention'
                        ? <span className="inline-flex items-center gap-1 text-primary font-bold"><AtSign className="h-3 w-3" /> Mencionou você</span>
                        : <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><ReplyIcon className="h-3 w-3" /> Respondeu sua thread</span>}
                      <span>·</span>
                      <span className="font-semibold text-foreground">{it.author_name}</span>
                      <span>em</span>
                      <span className="font-medium">#{it.channel_name}</span>
                      <span>·</span>
                      <span>{format(parseISO(it.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                      {isNew && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">NOVO</span>}
                    </div>
                    <div className="text-sm whitespace-pre-wrap line-clamp-3">
                      {stripMentionMarkup(it.body) || <span className="italic text-muted-foreground">[anexo]</span>}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="ghost" className="h-7 shrink-0"
                    onClick={() => navigate(`/chat/${it.channel_id}?message=${it.message_id}`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Abrir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
