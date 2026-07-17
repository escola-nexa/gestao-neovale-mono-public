import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor, RichTextView } from '@/components/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Tag, Calendar, CheckSquare, Eye, Image as ImageIcon, Trash2, Plus, X,
  ExternalLink, Copy, Palette, Paperclip, MessageSquare, Send, Loader2, CopyPlus, Archive, ArchiveRestore,
  MoreHorizontal, Pencil, Check as CheckIcon,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DuplicateTicketDialog } from './DuplicateTicketDialog';
import { TicketMembersPopover } from './TicketMembersPopover';
import { TicketMembersBlock } from './TicketMembersBlock';
import { ticketApi } from '@/features/tickets/api';
import { ApiAdapter } from '@/lib/api-adapter';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { isManagerRole } from '@/lib/roles';
import { useTicketLabels, useTicketLabelAssignments } from '../hooks/useTicketLabels';
import { useTicketChecklists } from '../hooks/useTicketChecklists';
import { TicketChecklistsSection } from './sections/TicketChecklistsSection';
import { useTicketWatchers } from '../hooks/useTicketWatchers';
import { useKanbanLists, useReorderCard } from '../hooks/useKanbanData';
import { TicketMediaGallery } from './TicketMediaGallery';

const COVER_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'];
const LABEL_COLORS = ['#EF4444', '#F59E0B', '#EAB308', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

const ALLOWED_EXTENSIONS = new Set([
  'jpg','jpeg','png','gif','webp','bmp','svg',
  'mp4','mov','avi','webm','mkv',
  'mp3','wav','ogg','m4a','aac',
  'pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
function getFileType(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

interface Props {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TicketCardModal({ ticketId, open, onClose }: Props) {
  const { user } = useAuth();
  const { organizationId, userRole } = useOrganization();
  const canSeeInternal = isManagerRole(userRole);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ticket, refetch } = useQuery({
    queryKey: ['ticket', ticketId],
    enabled: !!ticketId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, schools(nome), kanban_lists(name, color)')
        .eq('id', ticketId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { labels: catalog, create: createLabel } = useTicketLabels(organizationId);
  const { assignedLabelIds, toggle: toggleLabel } = useTicketLabelAssignments(ticketId);
  const { checklists, addChecklist } = useTicketChecklists(ticketId);
  const { watcherIds, watch, unwatch } = useTicketWatchers(ticketId);

  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  // (newItemDraft removido — agora dentro de TicketChecklistsSection)
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[5]);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; preview: string } | null>(null);
  const commentBoxRef = useRef<HTMLTextAreaElement | null>(null);

  // Messages (fórum + anexos)
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['ticket-messages', ticketId],
    enabled: !!ticketId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = data || [];
      const authorIds = Array.from(new Set(rows.map((m: any) => m.author_id).filter(Boolean)));
      let profileMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', authorIds as string[]);
        (profs || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      }
      return rows.map((m: any) => ({ ...m, profiles: { full_name: profileMap[m.author_id] || null } }));
    },
  });


  // Realtime: invalidar mensagens quando inserir
  useEffect(() => {
    if (!ticketId || !open) return;
    const ch = supabase
      .channel(`tcm-msgs-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
        () => { refetchMessages(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, open, refetchMessages]);

  // Staff Neovale (admin/coord/rh) e equipe da escola — mesma regra da abertura
  const { data: nexaStaff = [] } = useQuery({
    queryKey: ['tcm-nexa-staff', organizationId],
    enabled: !!organizationId && open && canSeeInternal,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', organizationId!)
        .in('role', ['admin', 'coordenador', 'rh'] as any[]);
      if (!roles?.length) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', roles.map(r => r.user_id));
      const roleMap: Record<string, string> = {};
      roles.forEach(r => { roleMap[r.user_id] = r.role; });
      return (profiles || []).map(p => ({ user_id: p.user_id, full_name: p.full_name, role: roleMap[p.user_id] || '' }));
    },
  });
  const { data: schoolTeam = [] } = useQuery({
    queryKey: ['tcm-school-team', organizationId],
    enabled: !!organizationId && open && canSeeInternal,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', organizationId!)
        .in('role', ['coordenador'] as any[]);
      if (!roles?.length) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', roles.map(r => r.user_id));
      return (profiles || []).map(p => ({ user_id: p.user_id, full_name: p.full_name, role: 'coordenador' }));
    },
  });

  // Assignees atuais do ticket
  const { data: currentAssignees = [], refetch: refetchAssignees } = useQuery({
    queryKey: ['tcm-assignees', ticketId],
    enabled: !!ticketId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('ticket_assignees')
        .select('user_id')
        .eq('ticket_id', ticketId!);
      return (data || []).map((r: any) => r.user_id);
    },
  });

  const setAssignees = async (ids: string[]) => {
    if (!ticketId) return;
    const current = new Set(currentAssignees);
    const next = new Set(ids);
    const toAdd = ids.filter(id => !current.has(id));
    const toRemove = currentAssignees.filter(id => !next.has(id));
    if (toRemove.length) {
      await ApiAdapter.ticketAssignees.deleteUsers(ticketId, toRemove);
    }
    if (toAdd.length) {
      await ApiAdapter.ticketAssignees.createMany(toAdd.map(uid => ({ ticket_id: ticketId, user_id: uid })));
    }
    refetchAssignees();
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['my-assignee-tickets'] });
    toast.success('Atribuições atualizadas');
  };

  const visibleMessages = canSeeInternal ? messages : messages.filter((m: any) => !m.is_internal_note);

  const sendComment = async () => {
    if (!ticketId || !user || !newComment.trim()) return;
    setSending(true);
    try {
      await ApiAdapter.ticketMessages.create({
        ticket_id: ticketId,
        author_id: user.id,
        message: newComment.trim(),
        is_internal_note: false,
        parent_message_id: replyingTo?.id ?? null,
      });
      setNewComment('');
      setReplyingTo(null);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      toast.error('Erro ao enviar comentário');
    } finally {
      setSending(false);
    }
  };

  const startReply = (m: any) => {
    const preview = (m.message || '').replace(/\s+/g, ' ').slice(0, 80);
    setReplyingTo({ id: m.id, authorName: m.profiles?.full_name || 'Usuário', preview });
    setTimeout(() => commentBoxRef.current?.focus(), 50);
  };

  const canModifyMessage = (m: any) => {
    if (!user) return false;
    return m.author_id === user.id || canSeeInternal;
  };

  const startEditMessage = (m: any) => {
    setEditingMessageId(m.id);
    setEditingText(m.message || '');
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEditMessage = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    try {
      await ApiAdapter.ticketMessages.update(editingMessageId, { message: editingText.trim(), edited_at: new Date().toISOString() });
      toast.success('Comentário atualizado');
      cancelEditMessage();
      refetchMessages();
    } catch (error) {
      toast.error('Erro ao editar comentário');
    }
  };

  const confirmDeleteMessage = async () => {
    if (!deletingMessageId) return;
    try {
      await ApiAdapter.ticketMessages.delete(deletingMessageId);
      toast.success('Comentário excluído');
      setDeletingMessageId(null);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      toast.error('Erro ao excluir comentário');
      setDeletingMessageId(null);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!files.length || !ticketId || !user || !organizationId) return;
    setUploading(true);
    try {
      const messageId = crypto.randomUUID();
      const attachments: any[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_EXTENSIONS.has(ext)) { toast.error(`${file.name}: extensão não permitida`); continue; }
        if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: excede 50MB`); continue; }
        const path = `${organizationId}/${ticketId}/${messageId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(path, file);
        if (upErr) { toast.error(`Erro ao enviar ${file.name}`); continue; }
        const { data: signed } = await supabase.storage.from('ticket-attachments').createSignedUrl(path, 3600);
        attachments.push({
          url: signed?.signedUrl || path,
          path,
          type: getFileType(file),
          name: file.name,
          size: file.size,
        });
      }
      if (attachments.length > 0) {
        await ApiAdapter.ticketMessages.create({
          id: messageId,
          ticket_id: ticketId,
          author_id: user.id,
          message: `📎 ${attachments.length} arquivo(s) anexado(s)`,
          attachments,
        });
        toast.success(`${attachments.length} arquivo(s) anexado(s)`);
        refetchMessages();
      }
    } finally {
      setUploading(false);
    }
  };


  const isWatching = !!user && watcherIds.includes(user.id);

  // Detector "100% checklist" → sugere mover para Resolvido (estilo Trello)
  const { lists } = useKanbanLists(organizationId);
  const reorderCard = useReorderCard();
  const prevPctRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open || !ticketId || !ticket) return;
    const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
    if (totalItems === 0) { prevPctRef.current = null; return; }
    const doneItems = checklists.reduce((sum, c) => sum + c.items.filter(i => i.is_done).length, 0);
    const pct = (doneItems / totalItems) * 100;
    const prev = prevPctRef.current;
    prevPctRef.current = pct;

    if (prev !== null && prev < 100 && pct === 100) {
      // Já está em coluna resolvida? então não sugere
      const currentList = lists.find(l => l.id === (ticket as any).kanban_list_id);
      if (currentList?.mapped_status === 'resolvido') return;
      const resolvedList = lists.find(l => l.mapped_status === 'resolvido');
      if (!resolvedList) return;
      toast.success('Checklist concluído! 🎉', {
        description: 'Deseja mover o cartão para Resolvido?',
        action: {
          label: 'Mover',
          onClick: () => {
            reorderCard.mutate(
              { ticketId, newListId: resolvedList.id, prevPosition: null, nextPosition: null },
              {
                onSuccess: () => { toast.success('Cartão movido para Resolvido'); refetch(); },
                onError: () => toast.error('Erro ao mover cartão'),
              }
            );
          },
        },
        duration: 8000,
      });
    }
  }, [checklists, open, ticketId, ticket, lists, reorderCard, refetch]);


  // Atalhos de teclado quando o modal está aberto (estilo Trello)
  useEffect(() => {
    if (!open || !ticketId) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === 'l') { e.preventDefault(); setLabelsOpen(v => !v); }
      else if (k === 'd') { e.preventDefault(); setDatesOpen(v => !v); }
      else if (k === 'm') { e.preventDefault(); setChecklistOpen(v => !v); }
      else if (k === 'c') {
        e.preventDefault();
        updateTicket({ status: ticket?.status === 'resolvido' ? 'aberto' : 'resolvido' });
      }
      else if (e.key === ' ') {
        e.preventDefault();
        if (user) {
          isWatching ? unwatch.mutate(user.id) : watch.mutate(user.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId, ticket?.status, isWatching, user?.id]);

  const updateTicket = async (patch: Record<string, any>) => {
    if (!ticketId) return;
    try {
      await ApiAdapter.tickets.update(ticketId, patch);
      refetch();
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== ticket?.title) await updateTicket({ title: titleDraft.trim() });
  };

  const saveDesc = async () => {
    setEditingDesc(false);
    if (descDraft !== (ticket?.description || '')) await updateTicket({ description: descDraft });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/tickets/${ticketId}`);
    toast.success('Link copiado');
  };

  if (!ticket) return null;

  const cover = (ticket as any).cover_url || (ticket as any).cover_color;
  const coverIsImg = !!(ticket as any).cover_url;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden h-[92vh] sm:h-[90vh] flex flex-col">
        {/* Cover */}
        {cover && (
          coverIsImg ? (
            <div className="h-24 sm:h-32 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${(ticket as any).cover_url})` }} />
          ) : (
            <div className="h-12 sm:h-16 shrink-0" style={{ backgroundColor: (ticket as any).cover_color }} />
          )
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 md:gap-6 p-4 md:p-6">
            {/* MAIN COLUMN */}
            <div className="space-y-6 min-w-0">
              {/* Title */}
              <div>
                {editingTitle ? (
                  <Input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="text-xl font-semibold"
                  />
                ) : (
                  <h2
                    className="text-xl font-semibold cursor-text hover:bg-muted/50 rounded px-2 -mx-2 py-1"
                    onClick={() => { setTitleDraft(ticket.title); setEditingTitle(true); }}
                  >
                    {ticket.title}
                  </h2>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Em <span className="font-medium">{(ticket as any).kanban_lists?.name || 'lista'}</span>
                  {ticket.schools?.nome && <> · {ticket.schools.nome}</>}
                </p>
              </div>

              {/* Labels (assigned) */}
              {assignedLabelIds.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Etiquetas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedLabelIds.map(id => {
                      const l = catalog.find(c => c.id === id);
                      if (!l) return null;
                      return (
                        <span key={id} className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: l.color }}>
                          {l.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Descrição</h3>
                {editingDesc ? (
                  <div className="space-y-2">
                    <RichTextEditor value={descDraft} onChange={setDescDraft} minHeight="160px" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDesc}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-foreground cursor-text hover:bg-muted/50 rounded p-3 min-h-[60px]"
                    onClick={() => { setDescDraft(ticket.description || ''); setEditingDesc(true); }}
                  >
                    {ticket.description
                      ? <RichTextView html={ticket.description} className="text-sm" />
                      : <span className="text-muted-foreground italic">Adicionar uma descrição mais detalhada…</span>}
                  </div>
                )}
              </div>

              {/* Checklists (Trello-style com data/atribuir/salvar) */}
              <TicketChecklistsSection
                ticketId={ticketId}
                organizationId={organizationId}
                canCreateChecklist={false}
              />

              {/* Anexos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Anexos
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Adicionar
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleAttach}
                  />
                </div>
                <TicketMediaGallery messages={visibleMessages} />
              </div>

              {/* Fórum / Comentários */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comentários
                  {visibleMessages.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-normal">({visibleMessages.length})</span>
                  )}
                </h3>

                {/* Histórico de comentários (cronológico, com respostas indentadas) */}
                <div className="space-y-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
                  {visibleMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Ainda não há comentários.</p>
                  ) : (() => {
                    const sorted = [...visibleMessages].sort(
                      (a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at),
                    );
                    const byId = new Map<string, any>();
                    sorted.forEach((m: any) => byId.set(m.id, m));
                    const topLevel = sorted.filter((m: any) => !m.parent_message_id || !byId.has(m.parent_message_id));
                    const childrenOf = (pid: string) => sorted.filter((m: any) => m.parent_message_id === pid);

                    const renderMessage = (m: any, isReply = false) => {
                      const isEditing = editingMessageId === m.id;
                      const isAttachmentMessage = typeof m.message === 'string' && m.message.startsWith('📎');
                      const canModify = canModifyMessage(m);
                      const parent = m.parent_message_id ? byId.get(m.parent_message_id) : null;
                      return (
                        <div
                          key={m.id}
                          id={`ticket-msg-${m.id}`}
                          className={`flex gap-2 items-start group ${isReply ? 'ml-7 pl-3 border-l-2 border-muted' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {(m.profiles?.full_name || m.author_id?.slice(0, 1) || '?').toString().slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-xs font-medium">{m.profiles?.full_name || 'Usuário'}</span>
                              <span
                                className="text-[10px] text-muted-foreground"
                                title={format(new Date(m.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                              >
                                {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                              {m.edited_at && (
                                <span
                                  className="text-[10px] text-muted-foreground italic"
                                  title={`Editado em ${format(new Date(m.edited_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                                >
                                  (editado)
                                </span>
                              )}
                              {m.is_internal_note && (
                                <Badge variant="secondary" className="h-4 text-[9px] px-1">Interna</Badge>
                              )}
                              {!isEditing && (
                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!isAttachmentMessage && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => startReply(m)}
                                    >
                                      Responder
                                    </Button>
                                  )}
                                  {canModify && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {!isAttachmentMessage && (
                                          <DropdownMenuItem onClick={() => startEditMessage(m)}>
                                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => setDeletingMessageId(m.id)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              )}
                            </div>
                            {isReply && parent && (
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`ticket-msg-${parent.id}`);
                                  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2','ring-primary/40','rounded-md'); setTimeout(() => el.classList.remove('ring-2','ring-primary/40','rounded-md'), 1500); }
                                }}
                                className="text-[10px] text-muted-foreground hover:text-primary mb-0.5 truncate block max-w-full text-left"
                              >
                                ↪ em resposta a <span className="font-medium">{parent.profiles?.full_name || 'Usuário'}</span>
                                {parent.message ? `: "${(parent.message as string).replace(/\s+/g, ' ').slice(0, 60)}${(parent.message as string).length > 60 ? '…' : ''}"` : ''}
                              </button>
                            )}
                            {isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  rows={3}
                                  className="text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEditMessage(); }
                                    if (e.key === 'Escape') { e.preventDefault(); cancelEditMessage(); }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEditMessage} disabled={!editingText.trim()}>
                                    <CheckIcon className="h-3.5 w-3.5 mr-1" /> Salvar
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditMessage}>
                                    <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm bg-muted/40 rounded-md px-2.5 py-1.5 whitespace-pre-wrap break-words">
                                {m.message}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return topLevel.map((m: any) => (
                      <div key={m.id} className="space-y-2">
                        {renderMessage(m, false)}
                        {childrenOf(m.id).map((c: any) => renderMessage(c, true))}
                      </div>
                    ));
                  })()}
                </div>

                {/* Caixa de novo comentário (rodapé da seção) */}
                {replyingTo && (
                  <div className="flex items-start justify-between gap-2 mb-1 px-2 py-1.5 bg-primary/5 border-l-2 border-primary rounded-r">
                    <div className="text-[11px] text-muted-foreground min-w-0">
                      Respondendo a <span className="font-medium text-foreground">{replyingTo.authorName}</span>
                      {replyingTo.preview && <span className="italic">: "{replyingTo.preview}{replyingTo.preview.length >= 80 ? '…' : ''}"</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setReplyingTo(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    ref={commentBoxRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? `Responder a ${replyingTo.authorName}... (Ctrl+Enter para enviar)` : 'Escreva um comentário... (Ctrl+Enter para enviar)'}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComment(); }
                      if (e.key === 'Escape' && replyingTo) { e.preventDefault(); setReplyingTo(null); }
                    }}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={sendComment} disabled={!newComment.trim() || sending} className="self-end">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>



              {/* Confirmação de exclusão de comentário */}
              <AlertDialog open={!!deletingMessageId} onOpenChange={(o) => !o && setDeletingMessageId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O comentário será removido permanentemente do histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>


              {/* Footer info */}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Criado em {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
                {ticket.due_date && (
                  <div>Vence em {format(new Date(ticket.due_date), "dd 'de' MMMM", { locale: ptBR })}</div>
                )}
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="space-y-3">

              {/* Membros / Responsáveis (estilo Trello) */}
              {canSeeInternal && (
                <div className="space-y-2">
                  <TicketMembersBlock
                    label="Equipe Neovale"
                    helper="Admins, coordenadores e RH responsáveis pelo cartão"
                    members={nexaStaff.map((s: any) => ({ id: s.user_id, name: s.full_name, role: s.role }))}
                    selectedIds={currentAssignees.filter(id => nexaStaff.some((s: any) => s.user_id === id))}
                    onChange={(ids) => {
                      const others = currentAssignees.filter(id => !nexaStaff.some((s: any) => s.user_id === id));
                      setAssignees([...others, ...ids]);
                    }}
                    primaryId={(ticket as any).nexa_responsible_id || null}
                    onPrimaryChange={(id) => updateTicket({ nexa_responsible_id: id || null })}
                    emptyLabel="Atribuir equipe Neovale"
                  />
                  {(ticket as any).ticket_type === 'escola' && (
                    <TicketMembersBlock
                      label="Equipe da Escola"
                      helper="Coordenador ou diretor da escola"
                      members={schoolTeam.map((s: any) => ({ id: s.user_id, name: s.full_name, role: s.role }))}
                      selectedIds={(ticket as any).school_responsible_id ? [(ticket as any).school_responsible_id] : []}
                      onChange={(ids) => updateTicket({ school_responsible_id: ids[ids.length - 1] || null })}
                      multi={false}
                      emptyLabel="Atribuir à escola"
                    />
                  )}
                </div>
              )}

              <h3 className="text-xs font-semibold text-muted-foreground uppercase pt-1">Adicionar ao cartão</h3>

              {/* Labels picker */}
              <Popover open={labelsOpen} onOpenChange={setLabelsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Tag className="h-4 w-4 mr-2" /> Etiquetas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3 space-y-2">
                  <div className="text-xs font-semibold mb-1">Etiquetas</div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {catalog.map(l => {
                      const active = assignedLabelIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => toggleLabel.mutate({ labelId: l.id, attach: !active })}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-left ${active ? 'ring-1 ring-primary' : ''}`}
                        >
                          <span className="w-8 h-4 rounded" style={{ backgroundColor: l.color }} />
                          <span className="flex-1 truncate">{l.name}</span>
                          {active && <Checkbox checked className="pointer-events-none" />}
                        </button>
                      );
                    })}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-semibold">Criar nova</div>
                    <Input
                      value={newLabelName}
                      onChange={e => setNewLabelName(e.target.value)}
                      placeholder="Nome"
                      className="h-8"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {LABEL_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewLabelColor(c)}
                          className={`w-6 h-6 rounded ${c === newLabelColor ? 'ring-2 ring-foreground' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!newLabelName.trim()}
                      onClick={() => {
                        createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor });
                        setNewLabelName('');
                      }}
                    >
                      Criar etiqueta
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Checklist creator */}
              <Popover open={checklistOpen} onOpenChange={setChecklistOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <CheckSquare className="h-4 w-4 mr-2" /> Checklist
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 space-y-2">
                  <Input
                    placeholder="Título do checklist"
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!newChecklistTitle.trim()}
                    onClick={() => {
                      addChecklist.mutate(newChecklistTitle.trim());
                      setNewChecklistTitle('');
                    }}
                  >
                    Adicionar
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Due date */}
              <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" /> Datas
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 space-y-2">
                  <label className="text-xs font-semibold">Vencimento</label>
                  <Input
                    type="datetime-local"
                    value={ticket.due_date ? new Date(ticket.due_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => updateTicket({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="h-8"
                  />
                  {ticket.due_date && (
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => updateTicket({ due_date: null })}>
                      Remover
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Cover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    <ImageIcon className="h-4 w-4 mr-2" /> Capa
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Cor
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {COVER_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateTicket({ cover_color: c, cover_url: null })}
                        className="h-8 rounded hover:ring-2 hover:ring-foreground transition"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  {((ticket as any).cover_color || (ticket as any).cover_url) && (
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => updateTicket({ cover_color: null, cover_url: null })}>
                      Remover capa
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Watch */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => user && (isWatching ? unwatch.mutate(user.id) : watch.mutate(user.id))}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isWatching ? 'Deixar de seguir' : 'Seguir'}
              </Button>

              <Separator />

              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Ações</h3>

              <Button variant="secondary" size="sm" className="w-full justify-start" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" /> Copiar link
              </Button>

              {canSeeInternal && (
                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => setDuplicateOpen(true)}>
                  <CopyPlus className="h-4 w-4 mr-2" /> Duplicar ticket
                </Button>
              )}

              {canSeeInternal && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={async () => {
                    const isArchived = !!(ticket as any)?.archived_at;
                    const { error } = await supabase
                      .from('tickets')
                      .update({ archived_at: isArchived ? null : new Date().toISOString() })
                      .eq('id', ticketId!);
                    if (error) { toast.error('Erro ao ' + (isArchived ? 'restaurar' : 'arquivar')); return; }
                    toast.success(isArchived ? 'Ticket restaurado' : 'Ticket arquivado');
                    queryClient.invalidateQueries({ queryKey: ['tickets'] });
                    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
                    if (!isArchived) onClose();
                  }}
                >
                  {(ticket as any)?.archived_at
                    ? <><ArchiveRestore className="h-4 w-4 mr-2" /> Restaurar do arquivo</>
                    : <><Archive className="h-4 w-4 mr-2" /> Arquivar ticket</>}
                </Button>
              )}

              <Link to={`/tickets/${ticketId}`} onClick={onClose}>
                <Button variant="secondary" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir página
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <DuplicateTicketDialog
      open={duplicateOpen}
      onClose={() => setDuplicateOpen(false)}
      ticket={ticket}
      onDuplicated={() => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }}
    />
    </>
  );
}
