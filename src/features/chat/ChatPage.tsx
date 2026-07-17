import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelSidebar } from './components/ChannelSidebar';
import { MessageThread } from './components/MessageThread';
import { MessageComposer } from './components/MessageComposer';
import { ChannelInfoPanel } from './components/ChannelInfoPanel';
import { ThreadPanel } from './components/ThreadPanel';
import { Button } from '@/components/ui/button';
import { Hash, Info, Users, MessageSquare, PanelRightClose, PanelRightOpen, Menu, Trash2 } from 'lucide-react';
import type { ChatChannel } from './types';
import { cn } from '@/lib/utils';
import { isManagerRole } from '@/lib/roles';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { DeleteChannelDialog } from './components/DeleteChannelDialog';
import { SavedMessagesView } from './components/SavedMessagesView';
import { InboxView } from './components/InboxView';
import { MuteChannelMenu } from './components/MuteChannelMenu';
import { useLastChannel } from './hooks/useLastChannel';
import { useDirectChannelTitle } from './hooks/useDirectChannelTitle';

export default function ChatPage({ mode }: { mode?: 'saved' | 'inbox' } = {}) {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightMessageId = searchParams.get('message');
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAdmin = user?.perfil === 'admin';
  const { lastChannelId } = useLastChannel();
  const displayTitle = useDirectChannelTitle(channel);

  // Redireciona para a última conversa quando entra em /chat sem canal e sem modo
  useEffect(() => {
    if (!mode && !channelId && lastChannelId) {
      navigate(`/chat/${lastChannelId}`, { replace: true });
    }
  }, [mode, channelId, lastChannelId, navigate]);

  const handleDeleteChannel = async (reason: string) => {
    if (!channel) return;
    try {
      await chatApi.client.from('audit_events').insert({
        action: 'chat_channel.delete',
        entity_type: 'chat_channel',
        entity_id: channel.id,
        metadata: { channel_name: channel.name, reason },
      } as any);
    } catch { /* não bloqueia */ }
    const { error } = await chatApi.client.from('chat_channels').delete().eq('id', channel.id);
    if (error) { toast.error('Erro ao excluir canal: ' + error.message); return; }
    toast.success('Canal excluído.');
    setDeleteOpen(false);
    navigate('/chat');
  };

  useEffect(() => {
    if (!channelId || !user) { setChannel(null); return; }
    setThreadParentId(null);
    (async () => {
      const { data: ch } = await chatApi.client.from('chat_channels').select('*').eq('id', channelId).maybeSingle();
      setChannel(ch as any);
      const { data: mem } = await supabase
        .from('chat_channel_members')
        .select('can_post')
        .eq('channel_id', channelId).eq('user_id', user.id).maybeSingle();
      setCanPost(mem?.can_post ?? false);
      const { count } = await supabase
        .from('chat_channel_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('channel_id', channelId);
      setMemberCount(count ?? 0);
    })();
  }, [channelId, user]);

  const isManager = isManagerRole(user?.perfil);

  return (
    <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 h-[calc(100vh-4rem)] flex bg-background overflow-hidden">
      <aside className="hidden md:flex w-[280px] shrink-0 border-r">
        <ChannelSidebar />
      </aside>

      <Sheet>
        <SheetContent side="left" className="p-0 w-[300px]">
          <ChannelSidebar />
        </SheetContent>

        <section className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b px-3 sm:px-5 flex items-center gap-3 bg-card/50 backdrop-blur shrink-0">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>

            {!channel ? (
              <>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Chat Institucional</span>
              </>
            ) : (
              <>
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-semibold leading-tight truncate">{displayTitle}</h1>
                  {channel.description && (
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">{channel.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setThreadParentId(null); setShowInfo(true); }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Ver membros"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{memberCount}</span>
                </button>
                <Button
                  variant="ghost" size="icon"
                  className="hidden xl:inline-flex h-8 w-8"
                  onClick={() => { setThreadParentId(null); setShowInfo(s => !s); }}
                  title={showInfo ? 'Ocultar painel' : 'Mostrar painel'}
                >
                  {showInfo ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="xl:hidden h-8 w-8"
                  onClick={() => { setThreadParentId(null); setShowInfo(true); }}
                >
                  <Info className="h-4 w-4" />
                </Button>
                <MuteChannelMenu channelId={channel.id} />
                {isAdmin && channel.type !== 'direct' && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                    title="Excluir canal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </header>

          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              {mode === 'saved' ? (
                <SavedMessagesView />
              ) : mode === 'inbox' ? (
                <InboxView />
              ) : !channel ? (
                <EmptyState />
              ) : (
                <>
                  <MessageThread
                    channelId={channel.id}
                    organizationId={channel.organization_id}
                    onOpenThread={(id) => { setThreadParentId(id); setShowInfo(true); }}
                    highlightMessageId={highlightMessageId}
                  />
                  {canPost ? (
                    <MessageComposer
                      channelId={channel.id}
                      organizationId={channel.organization_id}
                      canPostAnnouncement={isManager}
                      channelName={channel.name}
                    />
                  ) : (
                    <div className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground text-center">
                      Você não tem permissão para postar neste canal.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right panel: thread OR channel info */}
            {channel && showInfo && (
              <aside className={cn(
                "border-l bg-card/30 overflow-hidden",
                "hidden xl:flex w-[320px] 2xl:w-[360px] shrink-0 flex-col"
              )}>
                {threadParentId ? (
                  <ThreadPanel
                    channel={channel}
                    parentMessageId={threadParentId}
                    onClose={() => setThreadParentId(null)}
                  />
                ) : (
                  <ChannelInfoPanel channel={channel} onClose={() => setShowInfo(false)} />
                )}
              </aside>
            )}

            {channel && (
              <Sheet open={showInfo && typeof window !== 'undefined' && window.innerWidth < 1280} onOpenChange={setShowInfo}>
                <SheetContent side="right" className="p-0 w-[340px] sm:w-[380px] xl:hidden">
                  {threadParentId ? (
                    <ThreadPanel
                      channel={channel}
                      parentMessageId={threadParentId}
                      onClose={() => setThreadParentId(null)}
                    />
                  ) : (
                    <ChannelInfoPanel channel={channel} onClose={() => setShowInfo(false)} />
                  )}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </section>
      </Sheet>

      {channel && (
        <DeleteChannelDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          channelName={channel.name}
          onConfirm={handleDeleteChannel}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-base font-semibold mb-1">Bem-vindo ao Chat Institucional</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Selecione um canal à esquerda ou crie uma nova conversa para começar a se comunicar com sua equipe.
      </p>
    </div>
  );
}
