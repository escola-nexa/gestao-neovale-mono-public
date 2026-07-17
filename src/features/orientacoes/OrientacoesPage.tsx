import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { orientacoesApi } from './api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Eye, BookOpen, X, CheckCircle2, Upload, FileText, Clock, AlertCircle, Video, CalendarDays, ChevronDown, PenLine, HelpCircle, ClipboardList, Send, Shield, Camera, FileUp, Users, Trash2 } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ORIENTATION_TYPE_LABELS, ORIENTATION_STATUS_LABELS, type Orientation } from '@/types/academic';
import { CancelOrientationDialog } from './components/CancelOrientationDialog';
import { SignOrientationDialog } from './components/SignOrientationDialog';
import { OrientationFilters } from './components/OrientationFilters';
import { OrientationDetailDialog } from './components/OrientationDetailDialog';
import { OrientationSummaryCards } from './components/OrientationSummaryCards';
import { GroupedOrientationsList } from './components/GroupedOrientationsList';
import { OrientationEmptyState } from './components/OrientationEmptyState';
import { useOrientationsData } from './hooks/useOrientationsData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateOrientationPDF } from './utils/generateOrientationPDF';

export default function OrientacoesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const data = useOrientationsData();
  const {
    loading, loadData, isCoordinator, isProfessor, user,
    search, setSearch, filterSchool, setFilterSchool,
    filterType, setFilterType, filterProfessor, setFilterProfessor,
    filterDateStart, setFilterDateStart, filterDateEnd, setFilterDateEnd,
    schools, professorsInOrientations, hasActiveFilters, clearFilters,
    stats, awaitingOrientations,
    filteredToday, filteredScheduled, filteredAwaiting, filteredOverdue,
    filteredSigned, filteredCancelled, filteredAll,
    getProfessorName, getSchoolName, getCourseName, getSubjectName,
    getOrientationDate, getOrientationTime, getStatusBadgeClasses,
    canProfessorInteract,
  } = data;

  const isAdmin = user?.perfil === 'admin';

  const [selectedOrientation, setSelectedOrientation] = useState<Orientation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [orientationToCancel, setOrientationToCancel] = useState<Orientation | null>(null);
  const [orientationToSign, setOrientationToSign] = useState<Orientation | null>(null);
  const [orientationToDelete, setOrientationToDelete] = useState<Orientation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(isProfessor ? 'pending' : 'active');

  const handleCancel = (orientation: Orientation) => { setOrientationToCancel(orientation); setCancelDialogOpen(true); };
  const handleSign = (orientation: Orientation) => { setOrientationToSign(orientation); setSignDialogOpen(true); };
  const handleViewDetail = (orientation: Orientation) => { setSelectedOrientation(orientation); setDetailOpen(true); };
  const handleOpenEvidenceDialog = (orientation: Orientation) => navigate(`/orientacoes/evidencia/${orientation.id}`);
  const handleDelete = (orientation: Orientation) => {
    if (orientation.status === 'ASSINADO_PROFESSOR') {
      toast({ title: 'Não é possível apagar', description: 'Orientações assinadas não podem ser excluídas.', variant: 'destructive' });
      return;
    }
    setOrientationToDelete(orientation);
  };
  const confirmDelete = async () => {
    if (!orientationToDelete) return;
    try {
      setDeleting(true);
      await orientacoesApi.deleteOrientation(orientationToDelete.id);
      toast({ title: 'Orientação excluída', description: 'A orientação foi removida com sucesso.' });
      setOrientationToDelete(null);
      await loadData();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleGeneratePDF = async (orientation: Orientation) => {
    try {
      await generateOrientationPDF(orientation, getProfessorName, getSchoolName, getCourseName, getOrientationDate, getOrientationTime);
      toast({ title: 'PDF gerado com sucesso', description: 'O documento foi aberto para impressão/download.' });
    } catch {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  const renderActions = (orientation: Orientation, compact = false) => {
    const isSigned = orientation.status === 'ASSINADO_PROFESSOR';
    const isCancelled = orientation.status === 'CANCELADO';
    const size = 'icon' as const;
    const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const btnSize = compact ? 'h-7 w-7' : 'h-8 w-8';

    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {canProfessorInteract(orientation) && orientation.status === 'AGUARDANDO_ASSINATURA_PROFESSOR' && (
          <Button variant="ghost" size={size} className={`${btnSize} text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50`} onClick={() => handleSign(orientation)} title="Assinar Orientação"><PenLine className={iconSize} /></Button>
        )}
        {(orientation as any).video_call_link && (
          <a href={(orientation as any).video_call_link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center ${btnSize} rounded-md text-blue-600 hover:bg-blue-50 transition-colors`} title="Chamada de Vídeo"><Video className={iconSize} /></a>
        )}
        <Button variant="ghost" size={size} className={btnSize} onClick={() => handleViewDetail(orientation)} title="Ver Detalhes"><Eye className={iconSize} /></Button>
        {isCoordinator && orientation.status === 'AGENDADO' && (
          <Button variant="ghost" size={size} className={`${btnSize} text-red-600 hover:text-red-700 hover:bg-red-50`} onClick={() => handleCancel(orientation)} title="Cancelar"><X className={iconSize} /></Button>
        )}
        {isCoordinator && !isSigned && !isCancelled && (
          <Button variant="ghost" size={size} className={`${btnSize} text-blue-600 hover:text-blue-700 hover:bg-blue-50`} onClick={() => handleOpenEvidenceDialog(orientation)} title="Inserir Evidência"><Upload className={iconSize} /></Button>
        )}
        {isCoordinator && isSigned && (
          <Button variant="ghost" size={size} className={`${btnSize} text-violet-600 hover:text-violet-700 hover:bg-violet-50`} onClick={() => handleGeneratePDF(orientation)} title="Gerar PDF"><FileText className={iconSize} /></Button>
        )}
        {isAdmin && !isSigned && (
          <Button variant="ghost" size={size} className={`${btnSize} text-red-600 hover:text-red-700 hover:bg-red-50`} onClick={() => handleDelete(orientation)} title="Apagar Orientação"><Trash2 className={iconSize} /></Button>
        )}
      </div>
    );
  };

  const [bulkDelete, setBulkDelete] = useState<{ list: Orientation[]; label: string } | null>(null);
  const handleBulkDelete = (list: Orientation[], label: string) => {
    if (list.length === 0) return;
    setBulkDelete({ list, label });
  };
  const confirmBulkDelete = async () => {
    if (!bulkDelete) return;
    try {
      setDeleting(true);
      const ids = bulkDelete.list.map(o => o.id);
      await orientacoesApi.bulkDeleteOrientations(ids);
      toast({ title: 'Orientações excluídas', description: `${ids.length} orientação(ões) removida(s).` });
      setBulkDelete(null);
      await loadData();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const listProps = {
    getProfessorName, getSchoolName, getSubjectName,
    getOrientationDate, getOrientationTime, getStatusBadgeClasses,
    isCoordinator, renderActions, handleViewDetail, defaultExpanded: false,
    isAdmin, onDeleteGroup: handleBulkDelete,
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <FeatureGuideCard title="Como usar Orientações Pedagógicas" steps={[
        { icon: Plus, title: 'Criar orientação', description: 'Registre uma orientação vinculada a professor, escola e disciplina.', color: 'blue' },
        { icon: Camera, title: 'Assinar com foto', description: 'O professor assina a orientação com foto e geolocalização.', color: 'green' },
        { icon: FileText, title: 'Evidências', description: 'Anexe arquivos como evidência da orientação realizada.', color: 'purple' },
        { icon: Users, title: 'Acompanhar status', description: 'Monitore pendentes, assinadas, canceladas e rejeitadas.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Orientações' }]}
        title="Orientações Pedagógicas"
        description="Gestão e acompanhamento das orientações pedagógicas"
        icon={ClipboardList}
        actions={isCoordinator && <Button onClick={() => navigate('/orientacoes/nova')}><Plus className="mr-2 h-4 w-4" /> Nova Orientação</Button>}
      />

      {/* Instructional Guide */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
            <HelpCircle className="h-3.5 w-3.5" /><span>Como funcionam as Orientações Pedagógicas?</span>
            <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm space-y-4">
            {isCoordinator && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Criando uma Orientação (Coordenação)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {[
                    { text: 'Clique em "Nova Orientação" e selecione o professor, escola e tipo.', icon: <Plus className="h-3 w-3" /> },
                    { text: 'Defina a data, horário e adicione observações do agendamento.', icon: <CalendarDays className="h-3 w-3" /> },
                    { text: 'Insira evidências (fotos, vídeos, PDFs) na orientação agendada.', icon: <FileUp className="h-3 w-3" /> },
                    { text: 'Após inserir evidências, o professor recebe para assinatura.', icon: <Send className="h-3 w-3" /> },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{i + 1}</span>
                      <p className="text-[11px] text-foreground leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" />{isProfessor ? 'Suas Orientações' : 'Fluxo do Professor'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { text: 'Você recebe notificações quando uma orientação é agendada para você.', icon: <Clock className="h-3 w-3" /> },
                  { text: 'Após a coordenação inserir evidências, assine digitalmente com foto.', icon: <Camera className="h-3 w-3" /> },
                  { text: 'Orientações assinadas ficam registradas e disponíveis para download em PDF.', icon: <FileText className="h-3 w-3" /> },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">{i + 1}</span>
                    <p className="text-[11px] text-foreground leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-amber-600 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Status das Orientações</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { status: 'Agendado', color: 'bg-sky-500/10 border-sky-500/20 text-sky-700', icon: <Clock className="h-3 w-3" />, desc: 'Orientação criada e agendada' },
                  { status: 'Ag. Assinatura', color: 'bg-amber-500/10 border-amber-500/20 text-amber-700', icon: <PenLine className="h-3 w-3" />, desc: 'Evidências inseridas, aguardando professor' },
                  { status: 'Em Atraso', color: 'bg-orange-500/10 border-orange-500/20 text-orange-700', icon: <AlertCircle className="h-3 w-3" />, desc: 'Data passou sem evidências' },
                  { status: 'Assinado', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" />, desc: 'Professor assinou digitalmente' },
                  { status: 'Cancelado', color: 'bg-red-500/10 border-red-500/20 text-red-700', icon: <X className="h-3 w-3" />, desc: 'Cancelado com justificativa' },
                ].map((s) => (
                  <div key={s.status} className={`flex flex-col gap-1 p-2 rounded-lg border ${s.color}`}>
                    <div className="flex items-center gap-1.5">{s.icon}<span className="text-[11px] font-semibold">{s.status}</span></div>
                    <p className="text-[10px] opacity-80 leading-tight">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <OrientationSummaryCards stats={stats} activeTab={activeTab} setActiveTab={setActiveTab} />

      <OrientationFilters
        search={search} setSearch={setSearch} filterSchool={filterSchool} setFilterSchool={setFilterSchool}
        filterType={filterType} setFilterType={setFilterType} filterProfessor={filterProfessor} setFilterProfessor={setFilterProfessor}
        filterDateStart={filterDateStart} setFilterDateStart={setFilterDateStart} filterDateEnd={filterDateEnd} setFilterDateEnd={setFilterDateEnd}
        schools={schools} professorsInOrientations={professorsInOrientations}
        isCoordinator={isCoordinator} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {isProfessor ? (
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="pending" className="gap-1.5 relative text-xs"><PenLine className="h-3.5 w-3.5" /> Assinar {stats.aguardando > 0 && <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500">{stats.aguardando}</Badge>}</TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" /> Agendadas {stats.agendados > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.agendados}</Badge>}</TabsTrigger>
            <TabsTrigger value="today" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Hoje {stats.hoje > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.hoje}</Badge>}</TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Todas</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap gap-0">
            <TabsTrigger value="active" className="gap-1.5 text-xs flex-1 sm:flex-none"><CalendarDays className="h-3.5 w-3.5" /> Ativas {(stats.hoje + stats.agendados) > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.hoje + stats.agendados}</Badge>}</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 text-xs flex-1 sm:flex-none"><AlertCircle className="h-3.5 w-3.5" /> Pendentes {(stats.aguardando + stats.emAtraso) > 0 && <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500">{stats.aguardando + stats.emAtraso}</Badge>}</TabsTrigger>
            <TabsTrigger value="finished" className="gap-1.5 text-xs flex-1 sm:flex-none"><CheckCircle2 className="h-3.5 w-3.5" /> Finalizadas {(stats.assinado + stats.cancelado) > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.assinado + stats.cancelado}</Badge>}</TabsTrigger>
          </TabsList>
        )}

        {/* Professor: Pending signature tab - includes scheduled if empty */}
        {isProfessor && (
          <TabsContent value="pending" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Orientações Pendentes de Assinatura</h2>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">{awaitingOrientations.length}</Badge>
            </div>
            {awaitingOrientations.length === 0 ? (
              <OrientationEmptyState icon={CheckCircle2} title="Tudo em dia!" description="Você não possui orientações pendentes de assinatura." />
            ) : (
              <div className="space-y-3">
                {awaitingOrientations.map((orientation) => (
                  <Card key={orientation.id} className="border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{ORIENTATION_TYPE_LABELS[orientation.orientation_type as keyof typeof ORIENTATION_TYPE_LABELS] || orientation.orientation_type}</Badge>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusBadgeClasses(orientation.status)}`}>{ORIENTATION_STATUS_LABELS[orientation.status as keyof typeof ORIENTATION_STATUS_LABELS] || orientation.status}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground text-xs">Escola</span><p className="font-medium truncate">{getSchoolName(orientation.school_id)}</p></div>
                            <div><span className="text-muted-foreground text-xs">Data / Horário</span><p className="font-medium">{format(getOrientationDate(orientation), 'dd/MM/yyyy', { locale: ptBR })} · {getOrientationTime(orientation)}</p></div>
                          </div>
                          {orientation.description && <p className="text-sm text-muted-foreground line-clamp-2">{orientation.description}</p>}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button onClick={() => handleSign(orientation)} className="gap-2 bg-amber-600 hover:bg-amber-700"><PenLine className="h-4 w-4" />Assinar</Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetail(orientation)} className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Detalhes</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Professor: Scheduled tab */}
        {isProfessor && (
          <TabsContent value="scheduled" className="space-y-4 mt-4">
            {filteredScheduled.length === 0 ? <OrientationEmptyState icon={Clock} title="Nenhuma orientação agendada" description="Não há orientações agendadas para você." /> : <GroupedOrientationsList orientations={filteredScheduled} {...listProps} showStatus={false} isOverdueTab={false} />}
          </TabsContent>
        )}

        <TabsContent value="today" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            <Badge variant="secondary" className="ml-2">{filteredToday.length} orientação(ões)</Badge>
          </div>
          {filteredToday.length === 0 ? <OrientationEmptyState icon={CalendarDays} title="Nenhuma orientação para hoje" description="Não há orientações agendadas para o dia de hoje." /> : <GroupedOrientationsList orientations={filteredToday} {...listProps} showStatus={false} isOverdueTab={false} />}
        </TabsContent>

        {/* Coordinator: Ativas (hoje + agendados) */}
        {isCoordinator && (
          <TabsContent value="active" className="space-y-4 mt-4">
            {(filteredToday.length + filteredScheduled.length) === 0 ? (
              <OrientationEmptyState icon={CalendarDays} title="Nenhuma orientação ativa" description="Não há orientações para hoje nem agendadas." />
            ) : (
              <div className="space-y-4">
                {filteredToday.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span className="font-medium">Hoje — {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
                      <Badge variant="secondary" className="text-[10px]">{filteredToday.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredToday} {...listProps} showStatus={false} isOverdueTab={false} defaultExpanded />
                  </div>
                )}
                {filteredScheduled.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Agendadas</span>
                      <Badge variant="secondary" className="text-[10px]">{filteredScheduled.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredScheduled} {...listProps} showStatus={false} isOverdueTab={false} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* Coordinator: Pendentes (aguardando + atraso) */}
        {isCoordinator && (
          <TabsContent value="pending" className="space-y-4 mt-4">
            {(filteredAwaiting.length + filteredOverdue.length) === 0 ? (
              <OrientationEmptyState icon={CheckCircle2} title="Nenhuma pendência" description="Todas as orientações estão em dia." />
            ) : (
              <div className="space-y-4">
                {filteredOverdue.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Em Atraso</span>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">{filteredOverdue.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredOverdue} {...listProps} showStatus={false} isOverdueTab defaultExpanded />
                  </div>
                )}
                {filteredAwaiting.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-amber-600">
                      <PenLine className="h-4 w-4" />
                      <span className="font-medium">Aguardando Assinatura</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">{filteredAwaiting.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredAwaiting} {...listProps} showStatus={false} isOverdueTab={false} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* Coordinator: Finalizadas (assinados + cancelados) */}
        {isCoordinator && (
          <TabsContent value="finished" className="space-y-4 mt-4">
            {(filteredSigned.length + filteredCancelled.length) === 0 ? (
              <OrientationEmptyState icon={BookOpen} title="Nenhuma orientação finalizada" description="Não há orientações assinadas ou canceladas." />
            ) : (
              <div className="space-y-4">
                {filteredSigned.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Assinadas</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">{filteredSigned.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredSigned} {...listProps} showStatus={false} isOverdueTab={false} />
                  </div>
                )}
                {filteredCancelled.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-red-600">
                      <X className="h-4 w-4" />
                      <span className="font-medium">Canceladas</span>
                      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">{filteredCancelled.length}</Badge>
                    </div>
                    <GroupedOrientationsList orientations={filteredCancelled} {...listProps} showStatus={false} isOverdueTab={false} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {isProfessor && (
          <TabsContent value="all" className="space-y-4 mt-4">
            {filteredAll.length === 0 ? <OrientationEmptyState icon={BookOpen} title="Nenhuma orientação encontrada" description="Não há orientações com os filtros selecionados." /> : <GroupedOrientationsList orientations={filteredAll} {...listProps} showStatus isOverdueTab={false} />}
          </TabsContent>
        )}
      </Tabs>

      <OrientationDetailDialog
        open={detailOpen} onOpenChange={setDetailOpen} orientation={selectedOrientation}
        getProfessorName={getProfessorName} getSchoolName={getSchoolName} getCourseName={getCourseName}
        getOrientationDate={getOrientationDate} getOrientationTime={getOrientationTime} getStatusBadgeClasses={getStatusBadgeClasses}
        canProfessorSign={selectedOrientation ? canProfessorInteract(selectedOrientation) : false}
        isCoordinator={isCoordinator} onSign={handleSign} onGeneratePDF={handleGeneratePDF}
      />
      <CancelOrientationDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen} orientation={orientationToCancel} onSuccess={loadData} />
      <SignOrientationDialog open={signDialogOpen} onOpenChange={setSignDialogOpen} orientation={orientationToSign} onSuccess={loadData} />

      <AlertDialog open={!!orientationToDelete} onOpenChange={(open) => !open && setOrientationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar orientação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A orientação será removida permanentemente do sistema.
              {orientationToDelete && (
                <span className="block mt-2 text-foreground font-medium">
                  Professor: {getProfessorName(orientationToDelete.professor_id)} · Escola: {getSchoolName(orientationToDelete.school_id)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkDelete} onOpenChange={(open) => !open && setBulkDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todas as orientações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a apagar <strong className="text-foreground">{bulkDelete?.list.length ?? 0}</strong> orientação(ões) de <strong className="text-foreground">{bulkDelete?.label}</strong>.
              <span className="block mt-2">Orientações já <strong>assinadas</strong> serão preservadas. Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmBulkDelete(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sim, apagar ${bulkDelete?.list.length ?? ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
