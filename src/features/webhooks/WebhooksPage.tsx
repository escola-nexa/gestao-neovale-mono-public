import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Webhook, Plus, Activity, AlertTriangle, CheckCircle2, Pause, Play, Trash2, Send, Eye, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWebhooks } from './hooks/useWebhooks';
import { webhooksApi } from '@/features/webhooks/api';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WebhooksPage() {
  const navigate = useNavigate();
  const { webhooks, loading, refetch } = useWebhooks();
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function toggleActive(id: string, current: boolean) {
    const { error } = await webhooksApi.client.from('webhooks').update({ is_active: !current, failure_count: 0 }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: !current ? 'Webhook ativado' : 'Webhook pausado' }); refetch(); }
  }

  async function testNow(id: string) {
    setTesting(id);
    try {
      const { error } = await supabase.functions.invoke('webhook-test', { body: { webhook_id: id } });
      if (error) throw error;
      toast({ title: 'Teste enviado', description: 'Verifique o histórico em alguns segundos.' });
      setTimeout(refetch, 2000);
    } catch (e: any) {
      toast({ title: 'Erro no teste', description: e.message, variant: 'destructive' });
    } finally { setTesting(null); }
  }

  async function doDelete() {
    if (!deleteId) return;
    const { error } = await webhooksApi.client.from('webhooks').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Webhook excluído' }); refetch(); }
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }, { label: 'Webhooks' }]}
        title="Webhooks"
        description="Envie notificações automáticas para sistemas externos quando eventos acontecem no Neovale."
        icon={Webhook}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/webhooks/historico')}>
              <Activity className="h-4 w-4 mr-2" /> Histórico
            </Button>
            <Button onClick={() => navigate('/webhooks/novo')}>
              <Plus className="h-4 w-4 mr-2" /> Novo Webhook
            </Button>
          </div>
        }
      />

      <Card>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum webhook cadastrado ainda.</p>
            <Button onClick={() => navigate('/webhooks/novo')}><Plus className="h-4 w-4 mr-2" /> Criar primeiro webhook</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última execução</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[260px] truncate text-muted-foreground">{w.target_url}</TableCell>
                  <TableCell><Badge variant="secondary">{w.event_types.length}</Badge></TableCell>
                  <TableCell>
                    {!w.is_active ? (
                      <Badge variant="outline" className="gap-1"><Pause className="h-3 w-3" /> Pausado</Badge>
                    ) : w.failure_count >= 3 ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Falhando ({w.failure_count})</Badge>
                    ) : (
                      <Badge className="gap-1 bg-success/15 text-success border-success/30 hover:bg-success/20"><CheckCircle2 className="h-3 w-3" /> Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {w.last_triggered_at ? formatDistanceToNow(new Date(w.last_triggered_at), { addSuffix: true, locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => testNow(w.id)} disabled={testing === w.id} title="Testar agora">
                      {testing === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/webhooks/${w.id}`)} title="Histórico">
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/webhooks/${w.id}/editar`)} title="Editar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(w.id, w.is_active)} title={w.is_active ? 'Pausar' : 'Ativar'}>
                      {w.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(w.id)} title="Excluir" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todo o histórico de entregas será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
