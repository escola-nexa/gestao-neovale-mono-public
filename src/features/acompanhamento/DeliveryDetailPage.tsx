import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { acompanhamentoApi } from './api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Package, CheckCircle2, Plus, Trash2, MapPin, Calendar, ExternalLink } from 'lucide-react';

const statusColors: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-800',
  entregue: 'bg-emerald-100 text-emerald-800',
  parcial: 'bg-amber-100 text-amber-800',
};

export default function DeliveryDetailPage() {
  const { deliveryId, schoolId: contextSchoolId } = useParams();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<any>(null);
  const [deliverySchools, setDeliverySchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [selectedDS, setSelectedDS] = useState<any>(null);
  const [items, setItems] = useState<Array<{ booklet_name: string; quantity_expected: number; quantity_delivered: number; notes: string }>>([]);
  const [receiverForm, setReceiverForm] = useState({ receiver_name: '', receiver_role: '', delivery_notes: '' });
  const [existingItems, setExistingItems] = useState<Record<string, any[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (deliveryId) loadDelivery(); }, [deliveryId]);

  const loadDelivery = async () => {
    setLoading(true);
    try {
      if (!deliveryId) return;
      const { delivery, schools, existingItems } = await acompanhamentoApi.getDeliveryDetails(deliveryId);
      setDelivery(delivery);
      setDeliverySchools(schools);
      setExistingItems(existingItems);
    } catch { } finally { setLoading(false); }
  };

  const openConfirmDialog = (ds: any) => {
    setSelectedDS(ds);
    setItems([{ booklet_name: '', quantity_expected: 0, quantity_delivered: 0, notes: '' }]);
    setReceiverForm({ receiver_name: ds.receiver_name || '', receiver_role: ds.receiver_role || '', delivery_notes: ds.delivery_notes || '' });
    setShowItemsDialog(true);
  };

  const saveDeliveryConfirmation = async () => {
    if (!selectedDS) return;
    setSaving(true);
    try {
      await acompanhamentoApi.confirmDelivery(selectedDS.id, receiverForm, items);

      toast.success('Entrega confirmada!');
      setShowItemsDialog(false);
      loadDelivery();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally { setSaving(false); }
  };

  const updateDeliveryStatus = async (status: string) => {
    await acompanhamentoApi.updateDeliveryStatus(delivery.id, status);
    toast.success('Status atualizado!');
    loadDelivery();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!delivery) return <div className="text-center py-20 text-muted-foreground">Entrega não encontrada</div>;

  const backPath = contextSchoolId ? `/escolas/${contextSchoolId}/acompanhamento/entregas` : '/acompanhamento/entregas';
  const breadcrumbs = contextSchoolId
    ? [{ label: 'Escola', href: `/escolas/${contextSchoolId}` }, { label: 'Entregas', href: backPath }, { label: delivery.action_name }]
    : [{ label: 'Acompanhamento', href: '/acompanhamento' }, { label: 'Entregas', href: '/acompanhamento/entregas' }, { label: delivery.action_name }];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={delivery.action_name}
        description={`Entrega agendada para ${format(new Date(delivery.start_datetime), "dd/MM/yyyy", { locale: ptBR })}`}
        backTo={contextSchoolId ? backPath : '/acompanhamento/entregas'}
        actions={
          <>
            {delivery.status === 'agendada' && <Button size="sm" onClick={() => updateDeliveryStatus('em_andamento')}>Iniciar</Button>}
            {delivery.status === 'em_andamento' && <Button size="sm" onClick={() => updateDeliveryStatus('concluida')}>Concluir</Button>}
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Escolas ({deliverySchools.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {deliverySchools.map((ds, idx) => {
            const dsItems = existingItems[ds.id] || [];
            return (
              <div key={ds.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{ds.schools?.nome}</p>
                      <p className="text-xs text-muted-foreground">{ds.city}</p>
                    </div>
                    <Badge className={statusColors[ds.delivery_status]} variant="secondary">
                      {ds.delivery_status === 'entregue' ? 'Entregue' : ds.delivery_status === 'parcial' ? 'Parcial' : 'Pendente'}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openConfirmDialog(ds)}>
                    <Package className="mr-1 h-3 w-3" /> Confirmar Entrega
                  </Button>
                </div>
                {ds.receiver_name && (
                  <p className="text-xs text-muted-foreground mt-2">Recebido por: {ds.receiver_name} ({ds.receiver_role}){ds.received_at && ` em ${format(new Date(ds.received_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}</p>
                )}
                {dsItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dsItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1 text-sm">
                        <span>{item.booklet_name}</span>
                        <span className={item.quantity_delivered < item.quantity_expected ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                          {item.quantity_delivered}/{item.quantity_expected}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirmar Entrega — {selectedDS?.schools?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome de quem recebeu</Label><Input value={receiverForm.receiver_name} onChange={(e) => setReceiverForm({ ...receiverForm, receiver_name: e.target.value })} /></div>
              <div><Label>Cargo/Função</Label><Input value={receiverForm.receiver_role} onChange={(e) => setReceiverForm({ ...receiverForm, receiver_role: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Input value={receiverForm.delivery_notes} onChange={(e) => setReceiverForm({ ...receiverForm, delivery_notes: e.target.value })} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Apostilas</Label>
                <Button variant="outline" size="sm" onClick={() => setItems([...items, { booklet_name: '', quantity_expected: 0, quantity_delivered: 0, notes: '' }])}><Plus className="mr-1 h-3 w-3" /> Adicionar</Button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <Input placeholder="Nome da apostila" value={item.booklet_name} onChange={(e) => { const n = [...items]; n[i].booklet_name = e.target.value; setItems(n); }} className="col-span-2" />
                  <Input type="number" placeholder="Previsto" value={item.quantity_expected || ''} onChange={(e) => { const n = [...items]; n[i].quantity_expected = parseInt(e.target.value) || 0; setItems(n); }} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Entregue" value={item.quantity_delivered || ''} onChange={(e) => { const n = [...items]; n[i].quantity_delivered = parseInt(e.target.value) || 0; setItems(n); }} />
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowItemsDialog(false)}>Cancelar</Button>
              <Button onClick={saveDeliveryConfirmation} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
