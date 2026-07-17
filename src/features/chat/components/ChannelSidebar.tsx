import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus, MessageSquarePlus, Hash, Users as UsersIcon, Building2, BookOpen, FolderKanban, ShieldCheck, Briefcase, MessageCircle, Tag, Settings2, X, Trash2, SearchCode, Pin, PinOff, Archive, ArchiveRestore } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChannels } from '../hooks/useChannels';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { CreateChannelDialog } from './CreateChannelDialog';
import { DeleteChannelDialog } from './DeleteChannelDialog';
import { NewDirectMessageDialog } from './NewDirectMessageDialog';
import { ManageChatLabelsDialog } from './ManageChannelLabelsDialog';
import { GlobalMessageSearchDialog } from './GlobalMessageSearchDialog';
import { useChannelLabels, useChannelsLabelsMap } from '../hooks/useChannelLabels';
import { type ChatChannelType, type ChatChannelLabel } from '../types';
import { cn } from '@/lib/utils';
import { formatChatTime } from '../utils/formatChatTime';
import { chatApi } from '@/features/chat/api';
import { toast } from 'sonner';

const TYPE_ICONS: Record<ChatChannelType, any> = {
  coordenacao: ShieldCheck,
  professores: UsersIcon,
  projeto: FolderKanban,
  rh: Briefcase,
  escola: Building2,
  curso: BookOpen,
  direct: MessageCircle,
};

export function ChannelSidebar() {
  const navigate = useNavigate();
  const { channelId } = useParams();
  const { user } = useAuth();
  const { channels, loading } = useChannels();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const canCreate = ['admin', 'coordenador', 'rh'].includes(user?.perfil ?? '');
  const { organizationId } = useOrganization();
  const orgId = organizationId;

  const { labels: allLabels } = useChannelLabels(orgId);
  const channelIds = useMemo(() => channels.map(c => c.id), [channels]);
  const labelsByChannel = useChannelsLabelsMap(channelIds);

  const filtered = channels.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeLabelId) {
      const list = labelsByChannel[c.id] || [];
      if (!list.some(l => l.id === activeLabelId)) return false;
    }
    // Em modo "Arquivados", mostra só arquivados; senão, esconde arquivados
    if (showArchived) {
      if (!c.archived_at) return false;
    } else {
      if (c.archived_at) return false;
    }
    return true;
  });

  const pinnedList = filtered.filter(c => !!c.pinned_at);
  const channelsList = filtered.filter(c => !c.pinned_at && c.type !== 'direct');
  const dmsList = filtered.filter(c => !c.pinned_at && c.type === 'direct');
  const totalUnread = channels.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const archivedCount = channels.filter(c => !!c.archived_at).length;

  const togglePin = async (channelId: string, currentlyPinned: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_channel_members')
      .update({ pinned_at: currentlyPinned ? null : new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);
    if (error) { toast.error('Erro ao fixar: ' + error.message); return; }
    toast.success(currentlyPinned ? 'Conversa desafixada.' : 'Conversa fixada no topo.');
  };

  const toggleArchive = async (channelId: string, currentlyArchived: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_channel_members')
      .update({ archived_at: currentlyArchived ? null : new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);
    if (error) { toast.error('Erro ao arquivar: ' + error.message); return; }
    toast.success(currentlyArchived ? 'Conversa restaurada.' : 'Conversa arquivada. Voltará ao receber nova mensagem.');
  };

  return (
    <div className="flex h-full w-full flex-col bg-card/50">
      {/* Workspace header */}
      <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight truncate">Chat</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              {totalUnread > 0 ? `${totalUnread} não lida${totalUnread > 1 ? 's' : ''}` : 'Tudo em dia'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            title="Para você (menções e respostas)"
            onClick={() => navigate('/chat/inbox')}
          >
            <span className="text-sm">📥</span>
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7"
            title="Mensagens salvas"
            onClick={() => navigate('/chat/salvas')}
          >
            <span className="text-sm">🔖</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Buscar mensagens"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <SearchCode className="h-3.5 w-3.5" />
          </Button>
          {canCreate && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Gerenciar etiquetas"
              onClick={() => setManageLabelsOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Search + actions */}
      <div className="p-3 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar canal…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        {canCreate && (
          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Canal
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDmOpen(true)}>
              <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> DM
            </Button>
          </div>
        )}

        {/* Filter by label */}
        {allLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {activeLabelId && (
              <button
                onClick={() => setActiveLabelId(null)}
                className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground"
                title="Limpar filtro"
              >
                <X className="h-2.5 w-2.5" /> limpar
              </button>
            )}
            {allLabels.map(l => {
              const active = activeLabelId === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLabelId(active ? null : l.id)}
                  className={cn(
                    'inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] border transition-all',
                    active ? 'ring-2 ring-offset-1 ring-offset-background' : 'opacity-80 hover:opacity-100'
                  )}
                  style={{
                    backgroundColor: `${l.color}20`,
                    borderColor: `${l.color}55`,
                    color: l.color,
                  }}
                >
                  <Tag className="h-2.5 w-2.5" /> {l.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading && <div className="p-4 text-xs text-muted-foreground">Carregando…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {showArchived
              ? <>Nenhuma conversa arquivada.</>
              : activeLabelId
                ? <>Nenhum canal com essa etiqueta.</>
                : canCreate
                  ? <>Nenhum canal ainda.<br />Crie um novo canal ou inicie uma conversa.</>
                  : <>Nenhum canal ainda.<br />Aguarde um administrador adicioná-lo a um canal.</>}
          </div>
        )}

        {pinnedList.length > 0 && (
          <ChannelGroup
            label="📌 Fixados"
            channels={pinnedList}
            activeId={channelId}
            labelsByChannel={labelsByChannel}
            onSelect={(id) => navigate(`/chat/${id}`)}
            isAdmin={user?.perfil === 'admin'}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
            onDeleted={(id) => { if (channelId === id) navigate('/chat'); }}
          />
        )}
        {channelsList.length > 0 && (
          <ChannelGroup
            label={showArchived ? 'Canais arquivados' : 'Canais'}
            channels={channelsList}
            activeId={channelId}
            labelsByChannel={labelsByChannel}
            onSelect={(id) => navigate(`/chat/${id}`)}
            isAdmin={user?.perfil === 'admin'}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
            onDeleted={(id) => { if (channelId === id) navigate('/chat'); }}
          />
        )}
        {dmsList.length > 0 && (
          <ChannelGroup
            label={showArchived ? 'Mensagens diretas arquivadas' : 'Mensagens diretas'}
            channels={dmsList}
            activeId={channelId}
            labelsByChannel={labelsByChannel}
            onSelect={(id) => navigate(`/chat/${id}`)}
            isAdmin={user?.perfil === 'admin'}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
            onDeleted={(id) => { if (channelId === id) navigate('/chat'); }}
          />
        )}

        {!showArchived && archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className="w-full mt-2 mx-2 mb-3 px-3 py-2 text-left text-xs rounded-md bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="font-medium">Arquivadas</span>
            <span className="ml-auto text-[10px] bg-muted-foreground/20 px-1.5 py-0.5 rounded">{archivedCount}</span>
          </button>
        )}
        {showArchived && (
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className="w-full mt-2 mx-2 mb-3 px-3 py-2 text-left text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-2"
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
            <span className="font-medium">Voltar para conversas ativas</span>
          </button>
        )}
      </ScrollArea>

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
      <NewDirectMessageDialog open={dmOpen} onOpenChange={setDmOpen} />
      {orgId && <ManageChatLabelsDialog open={manageLabelsOpen} onOpenChange={setManageLabelsOpen} organizationId={orgId} />}
      <GlobalMessageSearchDialog open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </div>
  );
}

interface ChannelGroupProps {
  label: string;
  channels: any[];
  activeId?: string;
  labelsByChannel: Record<string, ChatChannelLabel[]>;
  onSelect: (id: string) => void;
  isAdmin: boolean;
  onTogglePin: (channelId: string, currentlyPinned: boolean) => void | Promise<void>;
  onToggleArchive: (channelId: string, currentlyArchived: boolean) => void | Promise<void>;
  onDeleted: (id: string) => void;
}

function ChannelGroup({ label, channels, activeId, labelsByChannel, onSelect, isAdmin, onTogglePin, onToggleArchive, onDeleted }: ChannelGroupProps) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const askDelete = (e: React.MouseEvent, ch: any) => {
    e.stopPropagation();
    setPendingDelete({ id: ch.id, name: ch.name });
  };

  const confirmDelete = async (reason: string) => {
    if (!pendingDelete) return;
    try {
      await chatApi.client.from('audit_events').insert({
        action: 'chat_channel.delete',
        entity_type: 'chat_channel',
        entity_id: pendingDelete.id,
        metadata: { channel_name: pendingDelete.name, reason },
      } as any);
    } catch { /* não bloqueia */ }
    const { error } = await chatApi.client.from('chat_channels').delete().eq('id', pendingDelete.id);
    if (error) { toast.error('Erro ao excluir canal: ' + error.message); return; }
    toast.success('Canal excluído.');
    onDeleted(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="px-2 pb-2">
      <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <ul className="space-y-px">
        {channels.map(c => {
          const Icon = TYPE_ICONS[c.type as ChatChannelType] || Hash;
          const isActive = activeId === c.id;
          const hasUnread = c.unread_count > 0;
          const chLabels = labelsByChannel[c.id] || [];
          return (
            <li key={c.id} className="group/row relative animate-fade-in">
              <button
                onClick={() => onSelect(c.id)}
                className={cn(
                  'w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-left transition-all group/item',
                  isActive
                    ? 'bg-primary/15 text-foreground font-semibold'
                    : 'hover:bg-muted/60 text-foreground/80',
                  hasUnread && !isActive && 'text-foreground font-semibold'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="flex-1 min-w-0 text-sm break-words leading-snug">
                    {c.display_name || c.name}
                    {c.pinned_at && <Pin className="inline-block h-3 w-3 ml-1 text-primary -mt-0.5" />}
                  </span>

                  {c.last_message_at && (
                    <span className={cn(
                      "text-[10px] shrink-0",
                      hasUnread ? "text-primary font-bold" : "text-muted-foreground/70"
                    )}>
                      {formatChatTime(c.last_message_at)}
                    </span>
                  )}
                  {hasUnread && (
                    <Badge
                      variant="default"
                      className="h-4 min-w-[18px] px-1 text-[10px] bg-primary text-primary-foreground border-0 font-bold"
                    >
                      {c.unread_count > 99 ? '99+' : c.unread_count}
                    </Badge>
                  )}
                </div>
                {(c.last_message_preview || hasUnread) && (
                  <div className="pl-5 -mt-0.5 group-hover/row:pr-[88px] transition-[padding] duration-150">
                    <p className={cn(
                      "text-[11px] leading-snug break-words line-clamp-2",
                      hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground/80"
                    )}>
                      {c.last_message_preview || <span className="italic opacity-60">Sem mensagens ainda</span>}
                    </p>
                  </div>
                )}
                {chLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-5 group-hover/row:pr-[88px] transition-[padding] duration-150">
                    {chLabels.slice(0, 3).map(l => (
                      <span
                        key={l.id}
                        className="inline-flex items-center h-3.5 px-1 rounded-sm text-[9px] font-medium border"
                        style={{
                          backgroundColor: `${l.color}20`,
                          borderColor: `${l.color}55`,
                          color: l.color,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                    {chLabels.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{chLabels.length - 3}</span>
                    )}
                  </div>
                )}

              </button>
              <div className="absolute right-1 bottom-1 hidden group-hover/row:flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTogglePin(c.id, !!c.pinned_at); }}
                  className="h-6 w-6 flex items-center justify-center rounded bg-background/90 backdrop-blur text-muted-foreground shadow-sm hover:bg-primary/10 hover:text-primary"
                  title={c.pinned_at ? 'Desafixar' : 'Fixar no topo'}
                >
                  {c.pinned_at ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleArchive(c.id, !!c.archived_at); }}
                  className="h-6 w-6 flex items-center justify-center rounded bg-background/90 backdrop-blur text-muted-foreground shadow-sm hover:bg-primary/10 hover:text-primary"
                  title={c.archived_at ? 'Desarquivar' : 'Arquivar conversa'}
                >
                  {c.archived_at ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </button>
                {(isAdmin || c.type === 'direct') && (
                  <button
                    type="button"
                    onClick={(e) => askDelete(e, c)}
                    className="h-6 w-6 flex items-center justify-center rounded bg-background/90 backdrop-blur text-destructive shadow-sm hover:bg-destructive/10"
                    title={c.type === 'direct' ? 'Excluir conversa' : 'Excluir canal'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

            </li>
          );
        })}
      </ul>

      <DeleteChannelDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        channelName={pendingDelete?.name || ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
