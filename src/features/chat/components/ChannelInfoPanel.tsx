import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/features/chat/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pin, Search, Download, FileText, Users, Loader2, X, UserPlus, MoreVertical, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { ChatChannel, ChatMessage } from '../types';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { AddMembersDialog } from './AddMembersDialog';
import { useChannelLabels, useChannelLabelAssignments } from '../hooks/useChannelLabels';

interface Props {
  channel: ChatChannel;
  onClose?: () => void;
}

interface MemberRow {
  user_id: string;
  role: string;
  can_post: boolean;
  full_name: string;
  avatar_url: string | null;
}

export function ChannelInfoPanel({ channel, onClose }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pinned, setPinned] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const isDM = channel.type === 'direct';
  const isManager = isManagerRole(user?.perfil);
  const myMembership = members.find(m => m.user_id === user?.id);
  const isChannelOwnerOrAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';
  const canManageMembers = !isDM && (isManager || isChannelOwnerOrAdmin);

  const { labels: allLabels } = useChannelLabels(channel.organization_id);
  const { labelIds, toggle: toggleChannelLabel } = useChannelLabelAssignments(channel.id);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data: mems } = await supabase
      .from('chat_channel_members')
      .select('user_id, role, can_post')
      .eq('channel_id', channel.id);

    let memberRows: MemberRow[] = [];
    if (mems && mems.length > 0) {
      const ids = mems.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', ids);
      const pMap = new Map((profiles || []).map(p => [p.user_id, p]));
      memberRows = mems.map(m => ({
        user_id: m.user_id,
        role: m.role,
        can_post: m.can_post,
        full_name: pMap.get(m.user_id)?.full_name || 'Sem nome',
        avatar_url: pMap.get(m.user_id)?.avatar_url || null,
      }));
      memberRows.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    const { data: pins } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channel.id)
      .eq('is_pinned', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const pinsEnriched = await enrichAuthors((pins || []) as ChatMessage[]);

    const { data: atts } = await supabase
      .from('chat_message_attachments')
      .select('id, kind, file_path, file_name, file_size, mime_type, url, message_id, created_at, chat_messages!inner(channel_id)')
      .eq('chat_messages.channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setMembers(memberRows);
    setPinned(pinsEnriched);
    setFiles(atts || []);
    setLoading(false);
  }, [channel.id]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channel.id)
        .is('deleted_at', null)
        .ilike('body', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30);
      const enriched = await enrichAuthors((data || []) as ChatMessage[]);
      setSearchResults(enriched);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, channel.id]);

  const downloadFile = async (path: string) => {
    const { data, error } = await chatApi.client.storage.from('chat-attachments').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error('Erro ao gerar link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const updateMemberRole = async (uid: string, newRole: 'owner' | 'admin' | 'member') => {
    const { error } = await supabase
      .from('chat_channel_members')
      .update({ role: newRole })
      .eq('channel_id', channel.id)
      .eq('user_id', uid);
    if (error) { toast.error(error.message); return; }
    toast.success('Função atualizada');
    reload();
  };

  const removeMember = async (uid: string) => {
    if (!confirm('Remover este usuário do canal?')) return;
    const { error } = await supabase
      .from('chat_channel_members')
      .delete()
      .eq('channel_id', channel.id)
      .eq('user_id', uid);
    if (error) { toast.error(error.message); return; }
    toast.success('Usuário removido');
    reload();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">{isDM ? 'Detalhes da conversa' : 'Detalhes do canal'}</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        )}
      </div>

      {channel.description && (
        <div className="px-4 py-3 border-b bg-muted/20">
          <p className="text-xs text-muted-foreground leading-relaxed">{channel.description}</p>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="membros" className="flex flex-col flex-1 min-h-0">
          <TabsList className={`mx-3 mt-2 grid ${isDM ? 'grid-cols-4' : 'grid-cols-5'} h-9`}>
            <TabsTrigger value="membros" className="text-[11px] gap-1"><Users className="h-3 w-3" /><span className="font-semibold">{members.length}</span></TabsTrigger>
            <TabsTrigger value="fixados" className="text-[11px] gap-1"><Pin className="h-3 w-3" /><span className="font-semibold">{pinned.length}</span></TabsTrigger>
            <TabsTrigger value="arquivos" className="text-[11px] gap-1"><FileText className="h-3 w-3" /><span className="font-semibold">{files.length}</span></TabsTrigger>
            {!isDM && (
              <TabsTrigger value="etiquetas" className="text-[11px]"><Tag className="h-3 w-3" /></TabsTrigger>
            )}
            <TabsTrigger value="busca" className="text-[11px]"><Search className="h-3 w-3" /></TabsTrigger>
          </TabsList>

          <TabsContent value="membros" className="flex-1 overflow-hidden m-0 mt-2">
            {canManageMembers && (
              <div className="px-3 pb-2">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar pessoas
                </Button>
              </div>
            )}
            <ScrollArea className="h-full px-2 pb-3">
              <ul className="space-y-0.5">
                {members.map(m => {
                  const initials = m.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                  const canModifyThis = canManageMembers && m.role !== 'owner' && m.user_id !== user?.id;
                  return (
                    <li key={m.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                      <Avatar className="h-7 w-7">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                        <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate leading-tight">{m.full_name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                          {isDM ? '' : `${m.role}${!m.can_post ? ' · só leitura' : ''}`}
                        </div>
                      </div>
                      {canModifyThis && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><MoreVertical className="h-3 w-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {m.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => updateMemberRole(m.user_id, 'admin')}>Promover a admin</DropdownMenuItem>
                            )}
                            {m.role === 'admin' && (
                              <DropdownMenuItem onClick={() => updateMemberRole(m.user_id, 'member')}>Rebaixar para membro</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMember(m.user_id)}>Remover do canal</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fixados" className="flex-1 overflow-hidden m-0 mt-2">
            <ScrollArea className="h-full px-3 pb-3">
              {pinned.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem fixada.</p>
              ) : (
                <ul className="space-y-2">
                  {pinned.map(p => (
                    <li key={p.id} className="text-xs border-l-2 border-amber-500 bg-amber-500/5 pl-2 py-1.5 pr-2 rounded-r">
                      <div className="font-semibold">{p.author_name}</div>
                      <div className="text-muted-foreground line-clamp-3 leading-snug">{p.body}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {format(parseISO(p.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="arquivos" className="flex-1 overflow-hidden m-0 mt-2">
            <ScrollArea className="h-full px-2 pb-3">
              {files.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum anexo no canal.</p>
              ) : (
                <ul className="space-y-0.5">
                  {files.map(f => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => f.file_path && downloadFile(f.file_path)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 text-xs text-left"
                      >
                        <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">{f.file_name || 'arquivo'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          {!isDM && (
          <TabsContent value="etiquetas" className="flex-1 overflow-hidden m-0 mt-2">
            <ScrollArea className="h-full px-3 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">Etiquetas do canal</p>
              {allLabels.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Nenhuma etiqueta criada na organização. Use o botão de etiquetas na barra lateral para gerenciar.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allLabels.map(l => {
                    const applied = labelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!canManageMembers}
                        onClick={() => toggleChannelLabel(l.id)}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-all ${
                          applied ? 'border-transparent text-white' : 'border-border bg-background hover:bg-muted/60'
                        } ${!canManageMembers ? 'cursor-default' : ''}`}
                        style={applied ? { backgroundColor: l.color } : undefined}
                      >
                        <span className={`h-2 w-2 rounded-full ${applied ? 'bg-white/80' : ''}`} style={!applied ? { backgroundColor: l.color } : undefined} />
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          )}

          <TabsContent value="busca" className="flex-1 overflow-hidden m-0 mt-2 flex flex-col">
            <div className="px-3 pb-2 shrink-0">
              <Input placeholder="Buscar no canal…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-8 text-xs" />
            </div>
            <ScrollArea className="flex-1 px-3 pb-3">
              {searching && <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />}
              {!searching && searchTerm && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado.</p>
              )}
              <ul className="space-y-1.5">
                {searchResults.map(m => (
                  <li key={m.id} className="text-xs border rounded-md p-2 hover:bg-muted/40">
                    <div className="font-semibold">{m.author_name}</div>
                    <div className="text-muted-foreground line-clamp-3 leading-snug">{m.body}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {format(parseISO(m.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      <AddMembersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        channelId={channel.id}
        organizationId={channel.organization_id}
        onAdded={reload}
      />
    </div>
  );
}

async function enrichAuthors(msgs: ChatMessage[]): Promise<ChatMessage[]> {
  if (msgs.length === 0) return msgs;
  const ids = Array.from(new Set(msgs.map(m => m.author_id)));
  const { data: profiles } = await chatApi.client.from('profiles').select('user_id, full_name, avatar_url').in('user_id', ids);
  const map = new Map((profiles || []).map(p => [p.user_id, p]));
  return msgs.map(m => ({
    ...m,
    author_name: map.get(m.author_id)?.full_name || 'Usuário',
    author_avatar: map.get(m.author_id)?.avatar_url || null,
  }));
}
