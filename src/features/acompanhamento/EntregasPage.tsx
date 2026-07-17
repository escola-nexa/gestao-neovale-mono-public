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
import { Plus, Truck, Calendar, Search, Eye, Loader2, Package, CheckCircle2, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeliveryFormDialog } from './components/DeliveryFormDialog';

const statusColors: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  em_andamento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  concluida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
const statusLabels: Record<string, string> = { agendada: 'Agendada', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada' };

const guideSteps = [
  { icon: Plus, title: 'Nova Entrega', description: 'Clique para cadastrar uma nova entrega' },
  { icon: MapPin, title: 'Selecione Escolas', description: 'Defina cidades e escolas de destino' },
  { icon: Package, title: 'Registre Apostilas', description: 'Informe quantidades previstas e entregues' },
  { icon: CheckCircle2, title: 'Confirme', description: 'Registre quem recebeu e anexe evidências' },
];

export default function EntregasPage() {
  const navigate = useNavigate();
  const { schoolId } = useParams<{ schoolId?: string }>();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadDeliveries(); }, [organizationId]);

  const loadDeliveries = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      let filtered = await acompanhamentoApi.listDeliveries(organizationId);
      if (schoolId) filtered = filtered.filter((d: any) => d.booklet_delivery_schools?.some((s: any) => s.school_id === schoolId));
      setDeliveries(filtered);
    } catch { } finally { setLoading(false); }
  };

  const handleDeleteClick = (e: React.MouseEvent, delivery: any) => {
    e.stopPropagation();
    setDeleteTarget(delivery);
    setDeleteReason('');
    if (isAdmin) {
      handleDelete(delivery);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleDelete = async (delivery?: any) => {
    const target = delivery || deleteTarget;
    if (!target) return;
    if (!isAdmin && !deleteReason.trim()) {
      toast.error('Informe a justificativa para excluir');
      return;
    }
    setDeleting(true);
    try {
      await acompanhamentoApi.softDeleteDelivery(target.id, user!.id, isAdmin, deleteReason.trim());
      toast.success('Entrega excluída com sucesso');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      loadDeliveries();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !d.action_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: deliveries.length,
    agendada: deliveries.filter((d) => d.status === 'agendada' && !d.deleted_at).length,
    em_andamento: deliveries.filter((d) => d.status === 'em_andamento' && !d.deleted_at).length,
    concluida: deliveries.filter((d) => d.status === 'concluida' && !d.deleted_at).length,
  };

  const breadcrumbs = schoolId
    ? [{ label: 'Escolas', href: '/escolas' }, { label: 'Escola', href: `/escolas/${schoolId}` }, { label: 'Acompanhamento', href: `/escolas/${schoolId}/acompanhamento` }, { label: 'Entregas' }]
    : [{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Entregas de Apostilas' }];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Entregas de Apostilas"
        description="Organize e rastreie entregas de material didático"
        icon={Truck}
        actions={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Nova Entrega</Button>}
      />

      <FeatureGuideCard title="Como usar Entregas de Apostilas" steps={guideSteps} />

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
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar entrega..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="agendada">Agendada</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="concluida">Concluída</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredDeliveries.length === 0 ? (
        <Card><CardContent className="p-12 text-center"><Truck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" /><h3 className="font-semibold text-lg">Nenhuma entrega encontrada</h3><p className="text-sm text-muted-foreground mt-1">Clique em "Nova Entrega" para começar</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((d) => {
            const schoolNames = d.booklet_delivery_schools?.map((s: any) => s.schools?.nome).filter(Boolean) || [];
            const isDeleted = !!d.deleted_at;
            return (
              <Card key={d.id} className={`transition-shadow ${isDeleted ? 'border-destructive/50 bg-destructive/5 opacity-70' : 'hover:shadow-md cursor-pointer'}`} onClick={() => !isDeleted && navigate(schoolId ? `/escolas/${schoolId}/acompanhamento/entregas/${d.id}` : `/acompanhamento/entregas/${d.id}`)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold truncate ${isDeleted ? 'line-through text-destructive' : ''}`}>{d.action_name}</h3>
                        {isDeleted ? (
                          <Badge variant="destructive">Excluída</Badge>
                        ) : (
                          <Badge className={statusColors[d.status]} variant="secondary">{statusLabels[d.status]}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(d.start_datetime), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span>{schoolNames.length} escola(s)</span>
                      </div>
                      {isDeleted && d.deletion_reason && (
                        <p className="text-xs text-destructive mt-1">Motivo: {d.deletion_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isDeleted && (
                        <>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(schoolId ? `/escolas/${schoolId}/acompanhamento/entregas/${d.id}` : `/acompanhamento/entregas/${d.id}`); }}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => handleDeleteClick(e, d)}>
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

      <DeliveryFormDialog open={showForm} onOpenChange={setShowForm} onSuccess={loadDeliveries} preSelectedSchoolId={schoolId} />

      {/* Delete confirmation dialog for coordinators */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir Entrega</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Informe a justificativa para exclusão desta entrega. O registro será mantido no histórico.
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
