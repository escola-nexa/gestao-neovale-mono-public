import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from './api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { isManagerRole } from '@/lib/roles';
import { useTicketsRealtime } from './hooks/useTicketsRealtime';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Send, Lock, User as UserIcon, Copy, ExternalLink, FolderOpen, Pencil, Users, Clock, Tag, School, CalendarDays, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TicketMediaViewer } from './components/TicketMediaViewer';
import { TicketMediaGallery } from './components/TicketMediaGallery';
import { QuickAttachment, DragDropZone, FileUploadProgress, PendingFilesPreview } from './components/QuickAttachment';
import { TicketAssigneesSelect } from './components/TicketAssigneesSelect';
import { TicketChecklistsSection } from './components/sections/TicketChecklistsSection';
import { RichTextView } from '@/components/RichTextEditor';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto', em_atendimento: 'Em Atendimento', aguardando_escola: 'Aguardando Escola', resolvido: 'Resolvido', cancelado: 'Cancelado',
};
const statusColors: Record<string, string> = {
  aberto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  em_atendimento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  aguardando_escola: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  resolvido: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelado: 'bg-muted text-muted-foreground',
};
const priorityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critica: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface UploadingFile { name: string; progress: number; }

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 20 * 1024 * 1024, file: 25 * 1024 * 1024,
};

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp4', 'mov', 'avi', 'webm', 'mkv',
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
]);

function getFileMediaType(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) return `Extensão .${ext} não permitida`;
  const mediaType = getFileMediaType(file);
  const maxSize = MAX_FILE_SIZES[mediaType] || MAX_FILE_SIZES.file;
  if (file.size > maxSize) return `Arquivo excede o limite de ${Math.round(maxSize / 1024 / 1024)}MB`;
  return null;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, userRole } = useOrganization();
  const queryClient = useQueryClient();
  useTicketsRealtime(organizationId, id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [assigneesDialogOpen, setAssigneesDialogOpen] = useState(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);

  const canSeeInternalNotes = isManagerRole(userRole);
  const canManage = isManagerRole(userRole);

  const { data: ticket, isLoading, error: ticketError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      return ticketsApi.getTicketById(id!);
    },
    enabled: !!id,
  });

  const { data: responsibles } = useQuery({
    queryKey: ['ticket-responsibles', ticket?.school_responsible_id, ticket?.nexa_responsible_id, (ticket as any)?.created_by],
    queryFn: async () => {
      const ids = [ticket?.school_responsible_id, ticket?.nexa_responsible_id, (ticket as any)?.created_by].filter(Boolean);
      if (ids.length === 0) return {};
      const data = await ticketsApi.getProfiles(ids as string[]);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: !!(ticket?.school_responsible_id || ticket?.nexa_responsible_id || (ticket as any)?.created_by),
  });

  // Load ticket assignees
  const { data: assigneeProfiles = [] } = useQuery({
    queryKey: ['ticket-assignees-profiles', id],
    queryFn: async () => {
      const userIds = await ApiAdapter.ticketAssignees.getByTicketId(id!);
      if (!userIds?.length) return [];
      return ticketsApi.getProfiles(userIds);
    },
    enabled: !!id,
  });

  // Staff for assignees dialog
  const { data: staff = [] } = useQuery({
    queryKey: ['ticket-staff', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getStaffByRoles(organizationId, ['admin', 'coordenador', 'rh']);
    },
    enabled: !!organizationId && assigneesDialogOpen,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket-messages', id, canSeeInternalNotes],
    queryFn: async () => {
      return ApiAdapter.ticketMessages.getByTicketId(id!, canSeeInternalNotes);
    },
    enabled: !!id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const unsubscribe = ticketsApi.subscribeToTicket(id, () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    });
    return unsubscribe;
  }, [id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize assignee selection when opening dialog
  useEffect(() => {
    if (assigneesDialogOpen) {
      setSelectedAssigneeIds(assigneeProfiles.map((a: any) => a.user_id));
    }
  }, [assigneesDialogOpen, assigneeProfiles]);

  const uploadFiles = async (files: File[], messageId: string): Promise<any[]> => {
    const attachments: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadingFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 30 } : f));
      const path = `${organizationId}/${id}/${messageId}/${Date.now()}_${file.name}`;
      
      try {
        const url = await ticketsApi.uploadAttachment(path, file);
        setUploadingFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 80 } : f));
        attachments.push({ url: url || path, path, type: getFileMediaType(file), name: file.name, size: file.size });
        setUploadingFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 100 } : f));
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
      }
    }
    return attachments;
  };

  const sendMessage = useMutation({
    mutationFn: async (opts?: { afterStatus?: 'em_atendimento' | 'resolvido' }) => {
      if (!user || !organizationId || !id) throw new Error('Contexto inválido');
      if (!newMessage.trim() && pendingFiles.length === 0) throw new Error('Mensagem vazia');
      const messageId = crypto.randomUUID();
      let attachments: any[] | null = null;
      if (pendingFiles.length > 0) {
        setUploadingFiles(pendingFiles.map(f => ({ name: f.name, progress: 0 })));
        attachments = await uploadFiles(pendingFiles, messageId);
      }
      const insertData: any = {
        id: messageId, ticket_id: id, author_id: user.id,
        message: newMessage.trim() || (attachments?.length ? '📎 Arquivo(s) enviado(s)' : ''),
        is_internal_note: isInternalNote,
      };
      if (attachments && attachments.length > 0) insertData.attachments = attachments;
      await ApiAdapter.ticketMessages.create(insertData);
      
      // Atualiza status na mesma operação se solicitado
      if (opts?.afterStatus) {
        const patch: any = { status: opts.afterStatus };
        if (opts.afterStatus === 'resolvido') patch.closed_at = new Date().toISOString();
        await ApiAdapter.tickets.update(id, patch);
      }
      return opts?.afterStatus;
    },
    onMutate: async () => {
      // Optimistic UI: injeta a mensagem imediatamente no cache
      if (!user || !id || !newMessage.trim()) return;
      const queryKey = ['ticket-messages', id, canSeeInternalNotes];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<any[]>(queryKey);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        ticket_id: id,
        author_id: user.id,
        message: newMessage.trim(),
        is_internal_note: isInternalNote,
        attachments: null,
        created_at: new Date().toISOString(),
        __optimistic: true,
      };
      queryClient.setQueryData<any[]>(queryKey, (old) => [...(old || []), optimistic]);
      return { prev, queryKey };
    },
    onSuccess: (afterStatus) => {
      setNewMessage(''); setIsInternalNote(false); setPendingFiles([]); setUploadingFiles([]);
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', id] });
      if (afterStatus) {
        queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        toast.success(afterStatus === 'resolvido' ? 'Mensagem enviada e ticket resolvido' : 'Mensagem enviada — ticket em atendimento');
      }
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev && ctx?.queryKey) queryClient.setQueryData(ctx.queryKey, ctx.prev);
      setUploadingFiles([]);
      toast.error('Erro ao enviar mensagem');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      await ApiAdapter.tickets.update(id!, { status: newStatus });
    },
    onSuccess: () => { toast.success('Status atualizado'); queryClient.invalidateQueries({ queryKey: ['ticket', id] }); },
  });

  const saveAssignees = useMutation({
    mutationFn: async () => {
      if (!id || !user) return;
      await ticketsApi.deleteAssignees(id);
      if (selectedAssigneeIds.length > 0) {
        const rows = selectedAssigneeIds.map(uid => ({ ticket_id: id, user_id: uid, assigned_by: user.id }));
        await ApiAdapter.ticketAssignees.createMany(rows);
      }
    },
    onSuccess: () => {
      toast.success('Responsáveis atualizados');
      setAssigneesDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-assignees-profiles', id] });
    },
    onError: () => toast.error('Erro ao salvar responsáveis'),
  });

  const copyExternalLink = () => {
    if (ticket?.external_token) {
      const url = `${window.location.origin}/acesso-externo/ticket/${ticket.external_token}`;
      navigator.clipboard.writeText(url);
      toast.success('Link externo copiado!');
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) { toast.error(`${file.name}: ${error}`); } else { validFiles.push(file); }
    }
    if (validFiles.length > 0) setPendingFiles(prev => [...prev, ...validFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <p className="text-muted-foreground">
          {ticketError ? 'Erro ao carregar o ticket.' : 'Ticket não encontrado ou removido.'}
        </p>
        <button
          className="text-sm text-primary underline"
          onClick={() => navigate('/tickets')}
        >
          ← Voltar para a lista
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === 'resolvido' || ticket.status === 'cancelado';
  const isInternal = (ticket as any).type === 'interno';

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets', href: '/tickets' }, { label: ticket.title }]}
        title={ticket.title}
        description={`${statusLabels[ticket.status]} • ${priorityLabels[ticket.priority]}${isInternal ? ' • Interno' : ''}`}
        backTo="/tickets"
        badge={{
          label: statusLabels[ticket.status],
          tone: ticket.status === 'resolvido' ? 'success' : ticket.status === 'cancelado' ? 'default' : ticket.status === 'em_atendimento' ? 'warning' : 'info',
        }}
        actions={
          canManage ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setAssigneesDialogOpen(true)}>
                <Users className="h-4 w-4 mr-1.5" /> Atribuir
              </Button>
              <Link to={`/tickets/${id}/editar`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-1.5" /> Editar
                </Button>
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          <DragDropZone onFilesDropped={handleFilesSelected} disabled={isClosed || sendMessage.isPending}>
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversa</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-3">
                <ScrollArea className="flex-1 max-h-[500px] pr-4 mb-4">
                  <div className="space-y-3">
                    {messages.map((msg: any) => {
                      const isCurrentUser = msg.author_id === user?.id;
                      const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
                      const authorName = isCurrentUser
                        ? (user?.nomeCompleto || 'Você')
                        : (msg.author_id ? (responsibles?.[msg.author_id] || 'Equipe') : 'Externo');
                      return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%] flex flex-col gap-1">
                            <div className={`rounded-lg px-4 py-3 ${
                              msg.is_internal_note
                                ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                                : isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              {msg.is_internal_note && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Lock className="h-3 w-3 text-amber-600" />
                                  <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 dark:text-amber-400">Nota interna</span>
                                </div>
                              )}
                              <p className={`text-sm whitespace-pre-wrap ${msg.is_internal_note ? 'text-amber-900 dark:text-amber-200' : ''}`}>{msg.message}</p>
                              {attachments.length > 0 && <TicketMediaViewer attachments={attachments} />}
                            </div>
                            <div className={`flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                              <UserIcon className="h-3 w-3" />
                              <span className="font-medium">{authorName}</span>
                              <span>·</span>
                              <span>{format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {!isClosed && (
                  <div className="space-y-2 border-t pt-3">
                    {canSeeInternalNotes && (
                      <div className="flex items-center gap-2">
                        <Checkbox id="internal" checked={isInternalNote} onCheckedChange={(v) => setIsInternalNote(!!v)} />
                        <Label htmlFor="internal" className="text-xs text-amber-600 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Nota interna
                        </Label>
                      </div>
                    )}
                    <PendingFilesPreview files={pendingFiles} onRemove={removePendingFile} />
                    {uploadingFiles.length > 0 && <FileUploadProgress files={uploadingFiles} />}
                    <div className="flex gap-2 items-end">
                      <QuickAttachment onFilesSelected={handleFilesSelected} disabled={sendMessage.isPending} />
                      <Textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={isInternalNote ? 'Nota interna...' : 'Digite sua mensagem... (Ctrl+Enter: Enviar e Resolver)'}
                        className="min-h-[60px] flex-1"
                        onKeyDown={e => {
                          const hasContent = newMessage.trim() || pendingFiles.length > 0;
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && hasContent) {
                            e.preventDefault();
                            sendMessage.mutate({ afterStatus: 'resolvido' });
                          } else if (e.key === 'Enter' && !e.shiftKey && hasContent) {
                            e.preventDefault();
                            sendMessage.mutate(undefined);
                          }
                        }}
                      />
                      <Button size="icon" onClick={() => sendMessage.mutate(undefined)} disabled={(!newMessage.trim() && pendingFiles.length === 0) || sendMessage.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {!isInternalNote && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={(!newMessage.trim() && pendingFiles.length === 0) || sendMessage.isPending}
                          onClick={() => sendMessage.mutate({ afterStatus: 'em_atendimento' })}
                        >
                          Enviar e marcar Em Atendimento
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950/30"
                          disabled={(!newMessage.trim() && pendingFiles.length === 0) || sendMessage.isPending}
                          onClick={() => sendMessage.mutate({ afterStatus: 'resolvido' })}
                        >
                          Enviar e Resolver
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {isClosed && (
                  <div className="border-t pt-3 text-center text-sm text-muted-foreground">
                    Este ticket foi {ticket.status === 'resolvido' ? 'resolvido' : 'cancelado'}.
                  </div>
                )}
              </CardContent>
            </Card>
          </DragDropZone>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info Card */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium">Informações</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Status</p>
                  {canManage ? (
                    <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)}>
                      <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 ${statusColors[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5 ${priorityColors[ticket.priority]}`}>
                    {priorityLabels[ticket.priority]}
                  </span>
                </div>
              </div>

              {/* Type */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {isInternal ? <Lock className="h-4 w-4 text-muted-foreground" /> : <School className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium">{isInternal ? 'Interno' : 'Escola'}</p>
                </div>
              </div>

              {/* School */}
              {!isInternal && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <School className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Escola</p>
                    <p className="text-sm font-medium truncate">{(ticket as any).schools?.nome || '—'}</p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-sm">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                </div>
              </div>

              {ticket.closed_at && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Encerrado em</p>
                    <p className="text-sm">{format(new Date(ticket.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsáveis Card */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Responsáveis</CardTitle>
                {canManage && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAssigneesDialogOpen(true)}>
                    <Users className="h-3 w-3 mr-1" /> Gerenciar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {/* Aberto por (criador do ticket) */}
              {(ticket as any).created_by && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <UserIcon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Aberto por</p>
                    <p className="text-sm font-medium truncate">
                      {responsibles?.[(ticket as any).created_by] || 'Usuário'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              {ticket.nexa_responsible_id && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Resp. Neovale</p>
                    <p className="text-sm font-medium truncate">{responsibles?.[ticket.nexa_responsible_id] || 'Não atribuído'}</p>
                  </div>
                </div>
              )}
              {!isInternal && ticket.school_responsible_id && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <UserIcon className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Resp. Escola</p>
                    <p className="text-sm font-medium truncate">{responsibles?.[ticket.school_responsible_id] || 'Não atribuído'}</p>
                  </div>
                </div>
              )}
              {ticket.external_author_name && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Autor Externo</p>
                    <p className="text-sm font-medium truncate">{ticket.external_author_name}</p>
                  </div>
                </div>
              )}
              {assigneeProfiles.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Atribuídos ({assigneeProfiles.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assigneeProfiles.map((a: any) => (
                      <Badge key={a.user_id} variant="secondary" className="text-xs">
                        {a.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!ticket.nexa_responsible_id && !ticket.school_responsible_id && assigneeProfiles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum responsável atribuído</p>
              )}
            </CardContent>
          </Card>

          {/* Checklists — Trello-style (paridade com Kanban) */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium">Checklists</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <TicketChecklistsSection ticketId={id || null} organizationId={organizationId} />
            </CardContent>
          </Card>

          {/* External Link */}
          {ticket.external_token && canManage && (
            <Card>
              <CardContent className="pt-4">
                <Button variant="outline" size="sm" className="w-full" onClick={copyExternalLink}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar Link Externo
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">Compartilhe com o autor externo</p>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {ticket.description && (
            <Card>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-medium">Descrição</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <RichTextView html={ticket.description} className="text-sm" />
              </CardContent>
            </Card>
          )}

          {/* Files tab as a card */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <TicketMediaGallery messages={messages} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assignees Dialog */}
      <Dialog open={assigneesDialogOpen} onOpenChange={setAssigneesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Responsáveis</DialogTitle>
          </DialogHeader>
          <TicketAssigneesSelect
            label="Selecione admins e coordenadores"
            description="Os selecionados receberão notificações sobre este ticket."
            staff={staff}
            selectedIds={selectedAssigneeIds}
            onChange={setSelectedAssigneeIds}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigneesDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveAssignees.mutate()} disabled={saveAssignees.isPending}>
              {saveAssignees.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
