import { Bookmark, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSavedMessages } from '../hooks/useSavedMessages';
import { stripMentionMarkup } from '../utils/parseMentions';

export function SavedMessagesView() {
  const { items, loading, unsave } = useSavedMessages();
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-14 border-b px-5 flex items-center gap-2 bg-card/50 shrink-0">
        <Bookmark className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-semibold">Mensagens salvas</h1>
        <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
      </header>
      <ScrollArea className="flex-1">
        {loading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Nenhuma mensagem salva ainda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Use "Salvar" no menu de uma mensagem para guardá-la aqui para acesso rápido.
            </p>
          </div>
        )}
        <ul className="divide-y">
          {items.map(it => (
            <li key={it.id} className="px-5 py-3 hover:bg-muted/40 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">{it.author_name}</span>
                    <span>em</span>
                    <span className="font-medium">#{it.channel_name}</span>
                    <span>·</span>
                    <span>{format(parseISO(it.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap line-clamp-3">
                    {stripMentionMarkup(it.body) || <span className="italic text-muted-foreground">[anexo]</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm" variant="ghost" className="h-7"
                    onClick={() => navigate(`/chat/${it.channel_id}?message=${it.message_id}`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Ir
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => unsave(it.message_id)}>
                    Remover
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
