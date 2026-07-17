import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Save, AlertTriangle, Building2, UserCheck, Upload, X, FileText, Image, Video, Mic, Settings, Users, CheckSquare } from 'lucide-react';
import { TicketMembersPopover } from './components/TicketMembersPopover';
import { TicketMembersStack } from './components/TicketMembersStack';
import { TicketChecklistsSection } from './components/sections/TicketChecklistsSection';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto', em_atendimento: 'Em Atendimento', aguardando_escola: 'Aguardando Escola', resolvido: 'Resolvido', cancelado: 'Cancelado',
};
const priorityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp4', 'mov', 'avi', 'webm', 'mkv',
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
]);

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, video: 50 * 1024 * 1024, audio: 20 * 1024 * 1024, file: 25 * 1024 * 1024,
};

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
  if (file.size > maxSize) return `Arquivo excede ${Math.round(maxSize / 1024 / 1024)}MB`;
  return null;
}

function FileIcon({ file }: { file: File }) {
  if (file.type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (file.type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
  if (file.type.startsWith('audio/')) return <Mic className="h-4 w-4 text-green-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export default function TicketEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organizationId, userRole } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = isManagerRole(userRole);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [status, setStatus] = useState('aberto');
  const [categoryId, setCategoryId] = useState('');
  const [ticketType, setTicketType] = useState<'escola' | 'interno'>('escola');
  const [schoolId, setSchoolId] = useState('');
  const [nexaResponsibleId, setNexaResponsibleId] = useState('');
  const [schoolResponsibleId, setSchoolResponsibleId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      return ticketsApi.getTicketById(id!);
    },
    enabled: !!id,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.escolas.getAll({ status: 'ativo' });
    },
    enabled: !!organizationId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['ticket-categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.ticketCategories.getAll({ organizationId });
    },
    enabled: !!organizationId,
  });

  // Neovale staff
  const { data: nexaStaff = [] } = useQuery({
    queryKey: ['nexa-staff', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getStaffByRoles(organizationId, ['admin', 'coordenador', 'rh']);
    },
    enabled: !!organizationId && canManage,
  });

  // School team
  const { data: allSchoolTeam = [] } = useQuery({
    queryKey: ['all-school-team', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getStaffByRoles(organizationId, ['coordenador']);
    },
    enabled: !!organizationId && canManage,
  });

  // Professors
  const { data: professors = [] } = useQuery({
    queryKey: ['professors-for-ticket', organizationId, schoolId, ticketType],
    queryFn: async () => {
      if (!organizationId) return [];
      if (ticketType === 'escola' && schoolId) {
        return ticketsApi.getProfessors(organizationId, schoolId);
      }
      return ticketsApi.getProfessors(organizationId);
    },
    enabled: !!organizationId && canManage,
  });

  // Load existing assignees
  const { data: existingAssignees = [] } = useQuery({
    queryKey: ['ticket-assignees', id],
    queryFn: async () => {
      return ticketsApi.getAssignees(id!);
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setPriority(ticket.priority || 'media');
      setStatus(ticket.status || 'aberto');
      setCategoryId(ticket.category_id || '');
      setTicketType((ticket as any).type || 'escola');
      setSchoolId(ticket.school_id || '');
      setNexaResponsibleId(ticket.nexa_responsible_id || '');
      setSchoolResponsibleId(ticket.school_responsible_id || '');
      setTags((ticket as any).tags || []);
      setDueDate((ticket as any).due_date ? (ticket as any).due_date.slice(0, 16) : '');
    }
  }, [ticket]);

  useEffect(() => {
    if (existingAssignees.length > 0) {
      setAssigneeIds(existingAssignees);
    }
  }, [existingAssignees]);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) { toast.error(`${file.name}: ${err}`); } else { valid.push(file); }
    }
    if (valid.length > 0) setPendingFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const updateTicket = useMutation({
    mutationFn: async () => {
      if (!id || !organizationId || !user) throw new Error('Contexto inválido');
      if (!title.trim()) throw new Error('Título obrigatório');
      if (ticketType === 'escola' && !schoolId) throw new Error('Escola obrigatória');

      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        priority, status,
        category_id: categoryId || null,
        type: ticketType,
        school_id: ticketType === 'escola' ? schoolId : null,
        tags: tags.length > 0 ? tags : [],
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      if (canManage) {
        updateData.nexa_responsible_id = nexaResponsibleId || null;
        updateData.school_responsible_id = ticketType === 'escola' ? (schoolResponsibleId || null) : null;
      }

      if (['resolvido', 'cancelado'].includes(status) && !ticket?.closed_at) {
        updateData.closed_at = new Date().toISOString();
      } else if (!['resolvido', 'cancelado'].includes(status)) {
        updateData.closed_at = null;
      }

      await ApiAdapter.tickets.update(id, updateData);

      // Sync assignees
      if (canManage) {
        await ticketsApi.deleteAssignees(id);
        if (assigneeIds.length > 0) {
          await ApiAdapter.ticketAssignees.createMany(
            assigneeIds.map(uid => ({ ticket_id: id, user_id: uid, assigned_by: user.id }))
          );
        }
      }
      if (pendingFiles.length > 0) {
        setUploadProgress(0);
        const messageId = crypto.randomUUID();
        const attachments: any[] = [];

        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const path = `${organizationId}/${id}/${messageId}/${Date.now()}_${file.name}`;
          
          try {
            const url = await ticketsApi.uploadAttachment(path, file);
            attachments.push({
              url: url || path,
              path,
              type: getFileMediaType(file),
              name: file.name,
              size: file.size,
            });
          } catch (uploadError) {
            console.error('Upload error:', uploadError);
          }
          setUploadProgress(Math.round(((i + 1) / pendingFiles.length) * 100));
        }

        if (attachments.length > 0) {
          await ApiAdapter.ticketMessages.create({
            id: messageId, ticket_id: id, author_id: user.id,
            message: `📎 ${attachments.length} arquivo(s) anexado(s) na edição do ticket`,
            attachments,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Ticket atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${id}`);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao atualizar ticket'),
  });

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!ticket) return <div className="text-center p-12 text-muted-foreground">Ticket não encontrado</div>;

  const isClosed = ticket.status === 'resolvido' || ticket.status === 'cancelado';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets', href: '/tickets' }, { label: ticket.title, href: `/tickets/${id}` }, { label: 'Editar' }]}
        title="Editar Ticket"
        description={ticket.title}
        backTo={`/tickets/${id}`}
        badge={isClosed ? { label: statusLabels[ticket.status], tone: 'default' } : undefined}
      />

      <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={handleFileSelect} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Informações do Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} /></div>
              <div>
                <Label>Descrição</Label>
                <RichTextEditor value={description} onChange={setDescription} minHeight="180px" />
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Ticket</Label>
                  <Select value={ticketType} onValueChange={(v) => { setTicketType(v as any); if (v === 'interno') { setSchoolId(''); setSchoolResponsibleId(''); } }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="escola">Ticket de Escola</SelectItem>
                      <SelectItem value="interno">Ticket Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ticketType === 'escola' && (
                  <div>
                    <Label>Escola *</Label>
                    <Select value={schoolId} onValueChange={setSchoolId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Prioridade</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Categoria</Label>
                    {canManage && <Link to="/tickets/categorias" className="text-xs text-primary hover:underline flex items-center gap-1"><Settings className="h-3 w-3" />Gerenciar</Link>}
                  </div>
                  <Select value={categoryId || '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Data de Vencimento</Label><Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                <div>
                  <Label>Tags</Label>
                  <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Adicionar tag..." onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]); setTagInput(''); } }} />
                  {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter((_, idx) => idx !== i))}>{tag} ×</Badge>)}</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-5 w-5" />Novos Anexos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Clique para selecionar arquivos</p>
                <p className="text-xs text-muted-foreground mt-1">Imagens, vídeos, áudios, PDFs (máx. 50MB)</p>
              </div>
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 rounded object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-background border flex items-center justify-center"><FileIcon file={file} /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removePendingFile(i)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
              {uploadProgress !== null && <div className="space-y-1"><p className="text-xs text-muted-foreground">Enviando arquivos...</p><Progress value={uploadProgress} className="h-2" /></div>}
            </CardContent>
          </Card>

          {/* Membros & Responsáveis — Trello-style (paridade com Kanban) */}
          {canManage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-5 w-5" /> Membros & Responsáveis
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione membros como no Trello. A <span className="text-foreground font-medium">★ estrela</span> define o responsável principal.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className={`grid grid-cols-1 ${ticketType === 'escola' ? 'md:grid-cols-2' : ''} gap-4`}>
                  <TicketMembersPopover
                    label="Equipe Neovale"
                    helper="Admins, coordenadores e RH responsáveis pelo ticket"
                    members={nexaStaff.map(s => ({ id: s.user_id, name: s.full_name, role: s.role }))}
                    selectedIds={assigneeIds}
                    onChange={setAssigneeIds}
                    primaryId={nexaResponsibleId || null}
                    onPrimaryChange={(id) => setNexaResponsibleId(id || '')}
                    emptyLabel="Adicionar responsáveis Neovale"
                  />
                  {ticketType === 'escola' && (
                    <TicketMembersPopover
                      label="Equipe da Escola"
                      helper="Coordenador ou diretor da escola"
                      members={allSchoolTeam.map(s => ({ id: s.user_id, name: s.full_name, role: s.role }))}
                      selectedIds={schoolResponsibleId ? [schoolResponsibleId] : []}
                      onChange={(ids) => setSchoolResponsibleId(ids[ids.length - 1] || '')}
                      multi={false}
                      emptyLabel="Atribuir à equipe da escola"
                    />
                  )}
                </div>

                {professors.length > 0 && (
                  <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            Professores envolvidos
                            <span className="ml-1.5 text-muted-foreground font-normal">({professors.length})</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {ticketType === 'interno' ? 'Todos os professores da organização' : 'Vinculados à escola selecionada'}
                          </p>
                        </div>
                      </div>
                      <TicketMembersStack
                        members={professors.map((p: any) => ({ id: p.id, name: p.full_name }))}
                        size="sm"
                        max={6}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Checklists — Trello-style (paridade com Kanban) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-5 w-5" /> Checklists
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Itens com data de entrega e responsável. Datas vencidas aparecem em vermelho.
              </p>
            </CardHeader>
            <CardContent>
              <TicketChecklistsSection ticketId={id || null} organizationId={organizationId} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(`/tickets/${id}`)}>Cancelar</Button>
            <Button onClick={() => updateTicket.mutate()} disabled={!title.trim() || (ticketType === 'escola' && !schoolId) || updateTicket.isPending}>
              {updateTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {updateTicket.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-xs text-foreground">{ticket.id.slice(0, 8)}...</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span className="text-foreground">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Atualizado</span><span className="text-foreground">{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span></div>
              {ticket.closed_at && <div className="flex justify-between"><span className="text-muted-foreground">Encerrado em</span><span className="text-foreground">{format(new Date(ticket.closed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span></div>}
            </CardContent>
          </Card>
          {['resolvido', 'cancelado'].includes(status) && !isClosed && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm"><p className="font-medium text-amber-800 dark:text-amber-300">Atenção</p><p className="text-amber-700 dark:text-amber-400">A data de encerramento será registrada automaticamente.</p></div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
