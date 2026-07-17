import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, CheckCircle2, XCircle, Clock, RotateCw, Loader2, Filter, X, ChevronRight, Webhook as WebhookIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebhooks } from './hooks/useWebhooks';
import { WEBHOOK_DOMAINS } from './eventCatalog';
import { webhooksApi } from '@/features/webhooks/api';
import { toast } from '@/hooks/use-toast';
import { format, subHours, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_id: string;
  attempt: number;
  response_status: number | null;
  response_body: string | null;
  request_body: any;
  duration_ms: number | null;
  status: string;
  error: string | null;
  created_at: string;
  delivered_at: string | null;
  next_retry_at: string | null;
  webhook_events?: { event_type: string; payload?: any } | null;
  webhooks?: { name: string } | null;
}

const TIME_RANGES = [
  { value: '1h', label: 'Última hora' },
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Todo o período' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Falha' },
  { value: 'pending', label: 'Pendente' },
  { value: 'retrying', label: 'Em retry' },
];

const ATTEMPT_OPTIONS = [
  { value: 'all', label: 'Qualquer' },
  { value: '1', label: '1ª tentativa' },
  { value: '2', label: '2ª tentativa' },
  { value: '3', label: '3ª tentativa' },
  { value: '4+', label: '4ª ou mais' },
];

const ALL_EVENTS = WEBHOOK_DOMAINS.flatMap((d) => d.events.map((e) => ({ ...e, domain: d.label })));

function getRangeStart(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case '1h': return subHours(now, 1);
    case '24h': return subHours(now, 24);
    case '7d': return subDays(now, 7);
    case '30d': return subDays(now, 30);
    default: return null;
  }
}

function StatusBadge({ status, responseStatus }: { status: string; responseStatus: number | null }) {
  if (status === 'success') return <Badge className="gap-1 bg-success/15 text-success border-success/30 hover:bg-success/20"><CheckCircle2 className="h-3 w-3" /> Sucesso {responseStatus ? `· ${responseStatus}` : ''}</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falha {responseStatus ? `· ${responseStatus}` : ''}</Badge>;
  if (status === 'retrying') return <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"><RotateCw className="h-3 w-3" /> Em retry</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
}

function LatencyCell({ ms }: { ms: number | null }) {
  if (ms == null) return <span className="text-muted-foreground">—</span>;
  const tone = ms > 3000 ? 'text-destructive' : ms > 1000 ? 'text-amber-600 dark:text-amber-400' : 'text-success';
  return <span className={`font-mono text-xs ${tone}`}>{ms} ms</span>;
}

export default function WebhookDeliveryHistoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { webhooks } = useWebhooks();

  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeliveryRow | null>(null);

  const webhookId = params.get('webhook') || 'all';
  const eventType = params.get('event') || 'all';
  const status = params.get('status') || 'all';
  const attempt = params.get('attempt') || 'all';
  const range = params.get('range') || '24h';

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const clearFilters = () => setParams({}, { replace: true });

  async function load() {
    setLoading(true);
    let q = supabase
      .from('webhook_deliveries')
      .select('*, webhook_events(event_type, payload), webhooks(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (webhookId !== 'all') q = q.eq('webhook_id', webhookId);
    if (status !== 'all') q = q.eq('status', status);
    const start = getRangeStart(range);
    if (start) q = q.gte('created_at', start.toISOString());
    if (attempt !== 'all') {
      if (attempt === '4+') q = q.gte('attempt', 4);
      else q = q.eq('attempt', Number(attempt));
    }

    const { data, error } = await q;
    if (error) {
      toast({ title: 'Erro ao carregar histórico', description: error.message, variant: 'destructive' });
      setRows([]);
    } else {
      let filtered = (data || []) as unknown as DeliveryRow[];
      if (eventType !== 'all') {
        filtered = filtered.filter((r) => r.webhook_events?.event_type === eventType);
      }
      setRows(filtered);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [webhookId, eventType, status, attempt, range]);

  async function resend(deliveryId: string) {
    setResending(deliveryId);
    try {
      const { error } = await supabase.functions.invoke('webhook-dispatcher', { body: { delivery_id: deliveryId } });
      if (error) throw error;
      toast({ title: 'Reenvio disparado' });
      setTimeout(load, 1500);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setResending(null); }
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const success = rows.filter((r) => r.status === 'success').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const avg = rows.filter((r) => r.duration_ms != null).reduce((s, r) => s + (r.duration_ms || 0), 0);
    const avgCount = rows.filter((r) => r.duration_ms != null).length;
    return {
      total,
      success,
      failed,
      successRate: total ? Math.round((success / total) * 100) : 0,
      avgLatency: avgCount ? Math.round(avg / avgCount) : 0,
    };
  }, [rows]);

  const hasActiveFilters = webhookId !== 'all' || eventType !== 'all' || status !== 'all' || attempt !== 'all' || range !== '24h';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }, { label: 'Webhooks', href: '/webhooks' }, { label: 'Histórico de entregas' }]}
        title="Histórico de entregas"
        description="Auditoria completa de cada chamada disparada: filtre, inspecione latência e payloads de erro."
        icon={Activity}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total no período</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Taxa de sucesso</div>
          <div className="text-2xl font-bold mt-1 text-success">{stats.successRate}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Falhas</div>
          <div className={`text-2xl font-bold mt-1 ${stats.failed ? 'text-destructive' : ''}`}>{stats.failed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Latência média</div>
          <div className="text-2xl font-bold mt-1 font-mono">{stats.avgLatency} ms</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Webhook</Label>
            <Select value={webhookId} onValueChange={(v) => setParam('webhook', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {webhooks.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Evento</Label>
            <Select value={eventType} onValueChange={(v) => setParam('event', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todos</SelectItem>
                {ALL_EVENTS.map((e) => <SelectItem key={e.type} value={e.type}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setParam('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tentativa</Label>
            <Select value={attempt} onValueChange={(v) => setParam('attempt', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTEMPT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={range} onValueChange={(v) => setParam('range', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma entrega encontrada para os filtros atuais.</p>
            {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(r)}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.webhooks?.name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.webhook_events?.event_type || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">#{r.attempt}</Badge></TableCell>
                  <TableCell><StatusBadge status={r.status} responseStatus={r.response_status} /></TableCell>
                  <TableCell><LatencyCell ms={r.duration_ms} /></TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {r.status === 'failed' && (
                      <Button size="sm" variant="ghost" onClick={() => resend(r.id)} disabled={resending === r.id}>
                        {resending === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCw className="h-4 w-4 mr-1" /> Reenviar</>}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      Detalhes <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Drawer de detalhes */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <WebhookIcon className="h-5 w-5" /> Entrega
              {selected && <StatusBadge status={selected.status} responseStatus={selected.response_status} />}
            </SheetTitle>
            <SheetDescription>
              {selected && <span className="font-mono text-xs">{selected.webhook_events?.event_type} · #{selected.attempt}</span>}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
              <div className="space-y-5 pb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Webhook</div>
                    <div className="font-medium">{selected.webhooks?.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Latência</div>
                    <LatencyCell ms={selected.duration_ms} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Criado em</div>
                    <div className="font-mono text-xs">{format(new Date(selected.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Entregue em</div>
                    <div className="font-mono text-xs">{selected.delivered_at ? format(new Date(selected.delivered_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : '—'}</div>
                  </div>
                  {selected.next_retry_at && (
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Próxima tentativa</div>
                      <div className="font-mono text-xs text-amber-600 dark:text-amber-400">
                        {format(new Date(selected.next_retry_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </div>
                    </div>
                  )}
                </div>

                {selected.error && (
                  <div>
                    <div className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">Erro</div>
                    <pre className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-3 rounded-md whitespace-pre-wrap break-all">{selected.error}</pre>
                  </div>
                )}

                {selected.response_body && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-muted-foreground">
                      Resposta {selected.response_status ? `(HTTP ${selected.response_status})` : ''}
                    </div>
                    <pre className="bg-muted text-xs p-3 rounded-md max-h-64 overflow-auto whitespace-pre-wrap break-all">{selected.response_body}</pre>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-muted-foreground">Payload enviado</div>
                  <pre className="bg-muted text-xs p-3 rounded-md max-h-80 overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selected.request_body ?? selected.webhook_events?.payload ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-2 pt-2">
                  {selected.status === 'failed' && (
                    <Button onClick={() => resend(selected.id)} disabled={resending === selected.id}>
                      {resending === selected.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCw className="h-4 w-4 mr-2" />}
                      Reenviar agora
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate(`/webhooks/${selected.webhook_id}`)}>
                    Ver webhook
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
