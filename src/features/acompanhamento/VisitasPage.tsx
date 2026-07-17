import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { NeovaleStatCard } from '@/components/ui/NeovaleStatCard';
import { ListChecks, CalendarClock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { acompanhamentoApi } from './api';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, MapPin, Calendar, Search, Eye, Loader2, Route, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VisitFormDialog } from './components/VisitFormDialog';

const statusColors: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  concluida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  agendada: 'Agendada', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};

const guideSteps = [
  { icon: Plus, title: 'Nova Visita', description: 'Clique em "Nova Visita" para agendar' },
  { icon: MapPin, title: 'Selecione Escolas', description: 'Escolha cidades e escolas envolvidas' },
  { icon: Route, title: 'Monte a Rota', description: 'Organize a sequência de deslocamento' },
  { icon: CheckCircle2, title: 'Registre', description: 'Registre chegada, saída e evidências' },
];

export default function VisitasPage() {
  const navigate = useNavigate();
  const { schoolId } = useParams<{ schoolId?: string }>();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadVisits(); }, [organizationId]);

  const loadVisits = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      let filtered = await acompanhamentoApi.listVisits(organizationId);
      if (schoolId) filtered = filtered.filter((v: any) => v.school_visit_schools?.some((s: any) => s.school_id === schoolId));
      setVisits(filtered);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteClick = (e: React.MouseEvent, visit: any) => {
    e.stopPropagation();
    setDeleteTarget(visit);
    setDeleteReason('');
    if (isAdmin) {
      handleDelete(visit);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleDelete = async (visit?: any) => {
    const target = visit || deleteTarget;
    if (!target) return;
    if (!isAdmin && !deleteReason.trim()) {
      toast.error('Informe a justificativa para excluir');
      return;
    }
    setDeleting(true);
    try {
      await acompanhamentoApi.softDeleteVisit(target.id, user!.id, isAdmin, deleteReason.trim());
      toast.success('Visita excluída com sucesso');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      loadVisits();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const filteredVisits = visits.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search && !v.action_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    agendada: visits.filter((v) => v.status === 'agendada' && !v.deleted_at).length,
    em_andamento: visits.filter((v) => v.status === 'em_andamento' && !v.deleted_at).length,
    concluida: visits.filter((v) => v.status === 'concluida' && !v.deleted_at).length,
    total: visits.length,
  };

  const breadcrumbs = schoolId
    ? [{ label: 'Escolas', href: '/escolas' }, { label: 'Escola', href: `/escolas/${schoolId}` }, { label: 'Acompanhamento', href: `/escolas/${schoolId}/acompanhamento` }, { label: 'Visitas' }]
    : [{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Visitas Escolares' }];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Visitas Escolares"
        description="Agende, acompanhe e registre visitas nas escolas"
        icon={MapPin}
        actions={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Nova Visita</Button>}
      />

      <FeatureGuideCard title="Como usar Visitas Escolares" steps={guideSteps} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'Total', value: counts.total, icon: ListChecks, tone: 'neutral' as const },
          { label: 'Agendadas', value: counts.agendada, icon: CalendarClock, tone: 'info' as const },
          { label: 'Em Andamento', value: counts.em_andamento, icon: Activity, tone: 'warning' as const },
          { label: 'Concluídas', value: counts.concluida, icon: CheckCircle2, tone: 'success' as const },
        ]).map((c, i) => (
          <NeovaleStatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} compact index={i} />
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar visita..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredVisits.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-lg">Nenhuma visita encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Visita" para começar</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((visit) => {
            const schoolNames = visit.school_visit_schools?.map((s: any) => s.schools?.nome).filter(Boolean) || [];
            const cities = [...new Set(visit.school_visit_schools?.map((s: any) => s.city).filter(Boolean))] as string[];
            const isDeleted = !!visit.deleted_at;
            return (
              <Card key={visit.id} className={`transition-shadow ${isDeleted ? 'border-destructive/50 bg-destructive/5 opacity-70' : 'hover:shadow-md cursor-pointer'}`} onClick={() => !isDeleted && navigate(schoolId ? `/escolas/${schoolId}/acompanhamento/visitas/${visit.id}` : `/acompanhamento/visitas/${visit.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-base truncate ${isDeleted ? 'line-through text-destructive' : ''}`}>{visit.action_name}</h3>
                        {isDeleted ? (
                          <Badge variant="destructive">Excluída</Badge>
                        ) : (
                          <Badge className={statusColors[visit.status] || ''} variant="secondary">{statusLabels[visit.status] || visit.status}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(visit.start_datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        {cities.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{cities.join(', ')}</span>}
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{schoolNames.length} escola{schoolNames.length !== 1 ? 's' : ''}</span>
                      </div>
                      {isDeleted && visit.deletion_reason && (
                        <p className="text-xs text-destructive mt-1">Motivo: {visit.deletion_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isDeleted && (
                        <>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(schoolId ? `/escolas/${schoolId}/acompanhamento/visitas/${visit.id}` : `/acompanhamento/visitas/${visit.id}`); }}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => handleDeleteClick(e, visit)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <VisitFormDialog open={showForm} onOpenChange={setShowForm} onSuccess={loadVisits} preSelectedSchoolId={schoolId} />

      {/* Delete confirmation dialog for coordinators */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Visita</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Informe a justificativa para exclusão desta visita. O registro será mantido no histórico.
            </p>
            <div>
              <Label>Justificativa *</Label>
              <Textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Descreva o motivo da exclusão..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete()} disabled={deleting || !deleteReason.trim()}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
