import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Hash, Search, ArrowLeft, Users as UsersIcon, ShieldCheck, FolderKanban, Briefcase, Building2, BookOpen, MessageCircle, Plus, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useChannels } from '../hooks/useChannels';
import { useAuth } from '@/contexts/AuthContext';
import { MessageThread } from './MessageThread';
import { MessageComposer } from './MessageComposer';
import { CreateChannelDialog } from './CreateChannelDialog';
import { NewDirectMessageDialog } from './NewDirectMessageDialog';
import { isManagerRole } from '@/lib/roles';
import { chatApi } from '@/features/chat/api';
import { cn } from '@/lib/utils';
import { formatChatTime } from '../utils/formatChatTime';
import type { ChatChannelType } from '../types';
import { useDirectChannelTitle } from '../hooks/useDirectChannelTitle';

const TYPE_ICONS: Record<ChatChannelType, any> = {
  coordenacao: ShieldCheck,
  professores: UsersIcon,
  projeto: FolderKanban,
  rh: Briefcase,
  escola: Building2,
  curso: BookOpen,
  direct: MessageCircle,
};

interface ChatPopupBodyProps {
  activeChannelId: string | null;
  onSelectChannel: (id: string | null) => void;
}

export function ChatPopupBody({ activeChannelId, onSelectChannel }: ChatPopupBodyProps) {
  const { user } = useAuth();
  const { channels, loading } = useChannels();
  const [search, setSearch] = useState('');
  const [canPost, setCanPost] = useState(true);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const isManager = isManagerRole(user?.perfil);
  const canCreateChannel = ['admin', 'coordenador', 'rh'].includes(user?.perfil ?? '');

  const activeChannel = useMemo(
    () => channels.find(c => c.id === activeChannelId) || null,
    [channels, activeChannelId],
  );
  const popupTitle = useDirectChannelTitle(activeChannel as any);

  useEffect(() => {
    if (!activeChannelId || !user) { setCanPost(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chat_channel_members')
        .select('can_post')
        .eq('channel_id', activeChannelId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setCanPost(data?.can_post ?? false);
    })();
    return () => { cancelled = true; };
  }, [activeChannelId, user]);

  if (!activeChannel) {
    const filtered = channels.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="p-2.5 border-b shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar canal…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className={cn("grid gap-1.5", canCreateChannel ? "grid-cols-2" : "grid-cols-1")}>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setNewDmOpen(true)}>
              <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> Nova conversa
            </Button>
            {canCreateChannel && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreateChannelOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo canal
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loading && <div className="p-4 text-xs text-muted-foreground">Carregando…</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">Nenhum canal encontrado.</div>
          )}
          <ul className="p-1.5">
            {filtered.map(c => {
              const Icon = TYPE_ICONS[c.type as ChatChannelType] || Hash;
              const hasUnread = c.unread_count > 0;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectChannel(c.id)}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted/60 text-left transition-colors"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      hasUnread ? "bg-primary/20" : "bg-muted",
                    )}>
                      <Icon className={cn("h-4 w-4", hasUnread ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          "flex-1 min-w-0 text-sm leading-snug break-words [overflow-wrap:anywhere]",
                          hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90",
                        )}>{c.name}</span>
                        {c.last_message_at && (
                          <span className={cn(
                            "text-[10px] shrink-0",
                            hasUnread ? "text-primary font-bold" : "text-muted-foreground",
                          )}>{formatChatTime(c.last_message_at)}</span>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        <p className={cn(
                          "text-xs flex-1 min-w-0 leading-snug break-words [overflow-wrap:anywhere] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",
                          hasUnread ? "text-foreground/80" : "text-muted-foreground",
                        )}>
                          {c.last_message_preview || <span className="italic opacity-60">Sem mensagens ainda</span>}
                        </p>
                        {hasUnread && (
                          <Badge className="h-4 min-w-[18px] px-1 text-[10px] bg-primary text-primary-foreground border-0 font-bold">
                            {c.unread_count > 99 ? '99+' : c.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <CreateChannelDialog
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
          onChannelReady={(id) => onSelectChannel(id)}
        />
        <NewDirectMessageDialog
          open={newDmOpen}
          onOpenChange={setNewDmOpen}
          onChannelReady={(id) => onSelectChannel(id)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-10 border-b px-2 flex items-center gap-1.5 shrink-0 bg-muted/30">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelectChannel(null)} title="Voltar">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{popupTitle}</div>
        </div>
      </div>
      <MessageThread channelId={activeChannel.id} organizationId={activeChannel.organization_id} />
      {canPost ? (
        <MessageComposer
          channelId={activeChannel.id}
          organizationId={activeChannel.organization_id}
          canPostAnnouncement={isManager}
          channelName={activeChannel.name}
          compact
        />
      ) : (
        <div className="border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground text-center">
          Você não tem permissão para postar.
        </div>
      )}
    </div>
  );
}
