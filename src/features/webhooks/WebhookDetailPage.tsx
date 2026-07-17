import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webhook, Pencil, RotateCw, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWebhook } from './hooks/useWebhooks';
import { webhooksApi } from '@/features/webhooks/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Delivery {
  id: string;
  attempt: number;
  response_status: number | null;
  duration_ms: number | null;
  status: string;
  error: string | null;
  created_at: string;
  delivered_at: string | null;
  next_retry_at: string | null;
  event_id: string;
  webhook_events?: { event_type: string };
}

export default function WebhookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { webhook, loading } = useWebhook(id);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDels, setLoadingDels] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  async function loadDeliveries() {
    if (!id) return;
    setLoadingDels(true);
    const { data } = await supabase
      .from('webhook_deliveries')
      .select('*, webhook_events(event_type)')
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    setDeliveries((data || []) as unknown as Delivery[]);
    setLoadingDels(false);
  }
  useEffect(() => { loadDeliveries(); }, [id]);

  async function resend(deliveryId: string) {
    setResending(deliveryId);
    try {
      const { error } = await supabase.functions.invoke('webhook-dispatcher', { body: { delivery_id: deliveryId } });
      if (error) throw error;
      toast({ title: 'Reenviado' });
      setTimeout(loadDeliveries, 1500);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setResending(null); }
  }

  const last24h = deliveries.filter((d) => new Date(d.created_at) > new Date(Date.now() - 86400000));
  const successCount = last24h.filter((d) => d.status === 'success').length;
  const successRate = last24h.length ? Math.round((successCount / last24h.length) * 100) : null;
  const avgLatency = last24h.length ? Math.round(last24h.reduce((s, d) => s + (d.duration_ms || 0), 0) / last24h.length) : null;

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!webhook) return <div className="p-12 text-center text-muted-foreground">Webhook não encontrado.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }, { label: 'Webhooks', href: '/webhooks' }, { label: webhook.name }]}
        title={webhook.name}
        description={webhook.description || webhook.target_url}
        icon={Webhook}
        backTo="/webhooks"
        actions={<Button variant="outline" onClick={() => navigate(`/webhooks/${id}/editar`)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Entregas (24h)</p>
          <p className="text-2xl font-bold mt-1">{last24h.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Taxa de sucesso</p>
          <p className="text-2xl font-bold mt-1">{successRate !== null ? `${successRate}%` : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Latência média</p>
          <p className="text-2xl font-bold mt-1">{avgLatency !== null ? `${avgLatency}ms` : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Falhas consecutivas</p>
          <p className="text-2xl font-bold mt-1">{webhook.failure_count}</p>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Histórico de entregas</h3>
          <Button size="sm" variant="ghost" onClick={loadDeliveries}><RotateCw className="h-4 w-4 mr-1" /> Atualizar</Button>
        </div>
        {loadingDels ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhuma entrega ainda. Clique em "Testar agora" na lista para validar.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Latência</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{format(new Date(d.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}</TableCell>
                  <TableCell className="font-mono text-xs">{d.webhook_events?.event_type || '—'}</TableCell>
                  <TableCell>
                    {d.status === 'success' ? (
                      <Badge className="gap-1 bg-success/15 text-success border-success/30 hover:bg-success/20"><CheckCircle2 className="h-3 w-3" />Sucesso</Badge>
                    ) : d.status === 'retrying' ? (
                      <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Retry</Badge>
                    ) : d.status === 'failed' ? (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Falhou</Badge>
                    ) : <Badge variant="secondary">{d.status}</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.response_status ?? '—'}</TableCell>
                  <TableCell className="text-xs">{d.duration_ms ? `${d.duration_ms}ms` : '—'}</TableCell>
                  <TableCell className="text-xs">{d.attempt}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => resend(d.id)} disabled={resending === d.id}>
                      {resending === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reenviar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
