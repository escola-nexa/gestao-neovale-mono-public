import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiAdapter } from '@/lib/api-adapter';
import { ticketsApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';
import { isManagerRole } from '@/lib/roles';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Building2, UserCheck, Ticket, Upload, X, FileText, Image, Video, Mic, Settings, Users, CheckSquare, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TicketMembersPopover } from './components/TicketMembersPopover';
import { TicketMembersStack } from './components/TicketMembersStack';
import { toast } from 'sonner';

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'mp4', 'mov', 'avi', 'webm', 'mkv',
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
]);

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  file: 25 * 1024 * 1024,
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

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organizationId, userRole } = useOrganization();
  const { user } = useAuth();
  const { professorId } = useProfessorId();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = isManagerRole(userRole);

  // Prefill via querystring (ex.: fluxo de Substituição enviando ticket ao R.H.)
  const qpType = searchParams.get('type');
  const qpAssignRh = searchParams.get('assignRh') === '1';
  const qpTitle = searchParams.get('title') || '';
  const qpDescription = searchParams.get('description') || '';
  const qpSchoolId = searchParams.get('schoolId') || '';

  const [title, setTitle] = useState(qpTitle);
  const [description, setDescription] = useState(qpDescription);
  const [schoolId, setSchoolId] = useState(qpType === 'interno' ? '' : qpSchoolId);
  const [priority, setPriority] = useState('media');
  const [categoryId, setCategoryId] = useState('');
  const [ticketType, setTicketType] = useState<'escola' | 'interno'>(qpType === 'interno' ? 'interno' : 'escola');
  const [nexaResponsibleId, setNexaResponsibleId] = useState('');
  const [schoolResponsibleId, setSchoolResponsibleId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingChecklists, setPendingChecklists] = useState<Array<{ title: string; items: string[] }>>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Professor schools
  // Professor schools
  const { data: professorSchools = [] } = useQuery({
    queryKey: ['professor-schools', professorId],
    queryFn: async () => {
      if (!professorId) return [];
      return ticketsApi.getProfessorSchools(professorId);
    },
    enabled: !!professorId && userRole === 'professor',
  });

  // Schools
  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.escolas.getAll({ status: 'ativo' });
    },
    enabled: !!organizationId,
  });

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['ticket-categories', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ApiAdapter.ticketCategories.getAll({ organizationId });
    },
    enabled: !!organizationId,
  });

  // Neovale staff (admin + coordinator)
  const { data: nexaStaff = [] } = useQuery({
    queryKey: ['nexa-staff', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getStaffByRoles(organizationId, ['admin', 'coordenador', 'rh']);
    },
    enabled: !!organizationId && canManage,
  });

  // Auto-atribuir R.H. quando o ticket é criado a partir do fluxo de Substituição
  useEffect(() => {
    if (!qpAssignRh) return;
    if (!nexaStaff || nexaStaff.length === 0) return;
    const rhUsers = nexaStaff.filter((s: any) => s.role === 'rh');
    if (rhUsers.length === 0) return;
    setAssigneeIds(prev => {
      const set = new Set(prev);
      rhUsers.forEach((u: any) => set.add(u.user_id));
      return Array.from(set);
    });
    setNexaResponsibleId(prev => prev || rhUsers[0].user_id);
  }, [qpAssignRh, nexaStaff]);

  // School team (users with diretor/coordenador role) - NOT dependent on schoolId
  const { data: allSchoolTeam = [] } = useQuery({
    queryKey: ['all-school-team', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return ticketsApi.getStaffByRoles(organizationId, ['coordenador']);
    },
    enabled: !!organizationId && canManage,
  });

  // Professors (all or filtered by school)
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

  const availableSchools = userRole === 'professor'
    ? schools.filter((s: any) => professorSchools.includes(s.id))
    : schools;

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId === '__none__' ? '' : catId);
    if (catId !== '__none__') {
      const cat = categories.find((c: any) => c.id === catId);
      if (cat?.priority_default) setPriority(cat.priority_default);
    }
  };

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

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!organizationId || !user) throw new Error('Usuário não autenticado');
      if (ticketType === 'escola' && !schoolId) throw new Error('Escola obrigatória');

      const insertData: any = {
        organization_id: organizationId,
        title: title.trim(),
        description: description.trim() || null,
        school_id: ticketType === 'escola' ? schoolId : null,
        priority: priority as any,
        category_id: categoryId || null,
        opened_by_id: user.id,
        type: ticketType as any,
        tags: tags.length > 0 ? tags : [],
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      if (canManage) {
        insertData.nexa_responsible_id = nexaResponsibleId || null;
        insertData.school_responsible_id = ticketType === 'escola' ? (schoolResponsibleId || null) : null;
      }

      const newTicket = await ApiAdapter.tickets.create(insertData);

      // Save assignees
      if (assigneeIds.length > 0 && newTicket?.id) {
        const assigneeRows = assigneeIds.map(uid => ({
          ticket_id: newTicket.id,
          user_id: uid,
          assigned_by: user.id,
        }));
        await ApiAdapter.ticketAssignees.createMany(assigneeRows);
      }

      // Save checklists
      if (pendingChecklists.length > 0 && newTicket?.id) {
        for (let ci = 0; ci < pendingChecklists.length; ci++) {
          const cl = pendingChecklists[ci];
          if (!cl.title.trim()) continue;
          
          try {
            const createdCl = await ApiAdapter.ticketChecklists.create({
              ticket_id: newTicket.id,
              title: cl.title.trim(),
              position: ci
            });
            
            const validItems = cl.items.filter(t => t.trim());
            if (validItems.length > 0) {
              for (let idx = 0; idx < validItems.length; idx++) {
                await ApiAdapter.ticketChecklistItems.create({
                  checklist_id: createdCl.id,
                  content: validItems[idx].trim(),
                  position: idx,
                  is_done: false,
                });
              }
            }
          } catch (clErr) {
            console.error('Checklist error:', clErr);
          }
        }
      }

      // Upload files as first message if any
      if (pendingFiles.length > 0 && newTicket?.id) {
        setUploadProgress(0);
        const messageId = crypto.randomUUID();
        const attachments: any[] = [];

        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const path = `${organizationId}/${newTicket.id}/${messageId}/${Date.now()}_${file.name}`;
          
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
            id: messageId,
            ticket_id: newTicket.id,
            author_id: user.id,
            message: `📎 ${attachments.length} arquivo(s) anexado(s) na criação do ticket`,
            attachments,
          });
        }
      }

      return newTicket;
    },
    onSuccess: () => {
      toast.success('Ticket criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate('/tickets');
    },
    onError: (err: any) => {
      console.error('Ticket creation error:', JSON.stringify(err));
      toast.error(`Erro ao criar ticket: ${err?.message || 'Erro desconhecido'}`);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets', href: '/tickets' }, { label: 'Novo Ticket' }]}
        title="Novo Ticket"
        description="Abra um novo chamado descrevendo o ocorrido"
        backTo="/tickets"
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={handleFileSelect}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações do Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <SelectTrigger><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                      <SelectContent>
                        {availableSchools.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descreva o problema brevemente" maxLength={255} />
              </div>
              <div>
                <Label>Descrição</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Descreva o problema com todos os detalhes necessários..."
                  minHeight="180px"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Categoria</Label>
                    {canManage && (
                      <Link to="/tickets/categorias" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Settings className="h-3 w-3" /> Gerenciar
                      </Link>
                    )}
                  </div>
                  <Select value={categoryId || '__none__'} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label>Tags</Label>
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="Adicionar tag e pressione Enter..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
                        setTagInput('');
                      }
                    }}
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter((_, idx) => idx !== i))}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5" />
                Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Clique para selecionar arquivos</p>
                <p className="text-xs text-muted-foreground mt-1">Imagens, vídeos, áudios, PDFs (máx. 50MB por arquivo)</p>
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 rounded object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-background border flex items-center justify-center">
                          <FileIcon file={file} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removePendingFile(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress !== null && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Enviando arquivos...</p>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklists Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="h-5 w-5" />
                Checklists
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Crie listas de tarefas que serão associadas ao ticket após a criação.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingChecklists.map((cl, ci) => (
                <div key={ci} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Input
                      value={cl.title}
                      onChange={(e) => {
                        const next = [...pendingChecklists];
                        next[ci].title = e.target.value;
                        setPendingChecklists(next);
                      }}
                      placeholder="Título do checklist"
                      className="h-8 font-medium"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setPendingChecklists(pendingChecklists.filter((_, i) => i !== ci))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {cl.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={item}
                          onChange={(e) => {
                            const next = [...pendingChecklists];
                            next[ci].items[ii] = e.target.value;
                            setPendingChecklists(next);
                          }}
                          placeholder="Item do checklist"
                          className="h-7 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            const next = [...pendingChecklists];
                            next[ci].items = next[ci].items.filter((_, idx) => idx !== ii);
                            setPendingChecklists(next);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const next = [...pendingChecklists];
                        next[ci].items.push('');
                        setPendingChecklists(next);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar item
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Nome da nova checklist"
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistTitle.trim()) {
                      e.preventDefault();
                      setPendingChecklists([...pendingChecklists, { title: newChecklistTitle.trim(), items: [''] }]);
                      setNewChecklistTitle('');
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!newChecklistTitle.trim()}
                  onClick={() => {
                    setPendingChecklists([...pendingChecklists, { title: newChecklistTitle.trim(), items: [''] }]);
                    setNewChecklistTitle('');
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Responsibles — Trello-style */}
          {canManage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-5 w-5" />
                  Membros & Responsáveis
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione membros como no Trello. A <span className="inline-flex items-center gap-0.5 text-foreground font-medium">★ estrela</span> define o responsável principal.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className={`grid grid-cols-1 ${ticketType === 'escola' ? 'md:grid-cols-2' : ''} gap-4`}>
                  <TicketMembersPopover
                    label="Equipe Neovale"
                    helper="Admins e coordenadores responsáveis pelo ticket"
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

                {/* Professors — read-only context */}
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

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/tickets')}>Cancelar</Button>
            <Button
              onClick={() => createTicket.mutate()}
              disabled={!title.trim() || (ticketType === 'escola' && !schoolId) || createTicket.isPending}
            >
              {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Ticket className="mr-2 h-4 w-4" />
              {createTicket.isPending ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Guia Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">1.</span>
                <p>Selecione o <strong className="text-foreground">tipo</strong> e a escola (se aplicável).</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">2.</span>
                <p>Escreva um <strong className="text-foreground">título</strong> claro e objetivo.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">3.</span>
                <p>Anexe <strong className="text-foreground">arquivos</strong> (fotos, vídeos, documentos).</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary mt-0.5">4.</span>
                <p>Selecione <strong className="text-foreground">categoria</strong> e <strong className="text-foreground">prioridade</strong>.</p>
              </div>
              {canManage && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-primary mt-0.5">5.</span>
                  <p>Atribua <strong className="text-foreground">responsáveis</strong> e visualize os professores.</p>
                </div>
              )}
              <Separator />
              <p className="text-xs">Após a criação, acompanhe o ticket pelo chat com suporte a mídia em tempo real.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
