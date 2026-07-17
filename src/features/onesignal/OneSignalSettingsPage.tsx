import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Bell, Mail, Save, Send, Eye, EyeOff, PlugZap, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useOneSignalSettings } from '@/hooks/useOneSignalSettings';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { onesignalApi } from '@/features/onesignal/api';
import { toast } from '@/hooks/use-toast';

export default function OneSignalSettingsPage() {
  const { settings, loading, save } = useOneSignalSettings();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [connTesting, setConnTesting] = useState(false);
  const [connResult, setConnResult] = useState<any>(null);
  const [connModalOpen, setConnModalOpen] = useState(false);

  useEffect(() => { if (settings) setForm({ ...settings }); }, [settings]);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('onesignal_send_log' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setLogs((data as any[]) ?? []));
  }, [organizationId, testing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        app_id: form.app_id?.trim() || null,
        rest_api_key: form.rest_api_key?.trim() || null,
        email_from_name: form.email_from_name?.trim() || null,
        email_from_address: form.email_from_address?.trim() || null,
        push_enabled: !!form.push_enabled,
        email_enabled: !!form.email_enabled,
        safari_web_id: form.safari_web_id?.trim() || null,
      });
      toast({ title: 'Configurações salvas' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (channel: 'push' | 'email') => {
    setTesting(channel);
    try {
      const body: any = {
        channel,
        title: 'Teste Neovale',
        message: `Notificação de teste enviada em ${new Date().toLocaleString('pt-BR')}`,
        targetUserIds: [user!.id],
      };
      if (channel === 'email') {
        body.subject = 'Teste de e-mail Neovale';
        body.targetEmails = [user!.email];
        body.emailHtml = `<h2>Teste OneSignal</h2><p>Este é um e-mail de teste enviado pelo painel administrativo.</p>`;
      }
      const { data, error } = await supabase.functions.invoke('onesignal-send', { body });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Falha');
      }
      toast({ title: 'Enviado!', description: `Verifique o seu ${channel === 'push' ? 'navegador' : 'email'}.` });
    } catch (e: any) {
      toast({ title: 'Falha no envio', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  const testConnection = async () => {
    setConnTesting(true);
    setConnResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-test', {
        body: {
          app_id: form.app_id?.trim() || undefined,
          rest_api_key: form.rest_api_key?.trim() || undefined,
        },
      });
      if (error && !data) {
        setConnResult({
          ok: false,
          code: 'UNEXPECTED',
          remediation: {
            title: 'Falha ao chamar a função de teste',
            steps: [
              'Não foi possível invocar o endpoint /onesignal-test.',
              'Verifique sua conexão e tente novamente.',
            ],
          },
          response: { message: error.message },
        });
      } else {
        setConnResult(data);
      }
      setConnModalOpen(true);
      if ((data as any)?.ok) {
        toast({ title: 'Conexão OK', description: `App "${(data as any)?.app?.name ?? 'OneSignal'}" autenticado.` });
      }
    } catch (e: any) {
      setConnResult({
        ok: false,
        code: 'UNEXPECTED',
        remediation: { title: 'Erro inesperado', steps: [e.message] },
      });
      setConnModalOpen(true);
    } finally {
      setConnTesting(false);
    }
  };

  if (loading || !form) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administração', href: '/administracao' }, { label: 'Notificações OneSignal' }]}
        title="Notificações OneSignal"
        description="Push e e-mail via OneSignal. As credenciais ficam salvas apenas para administradores desta organização."
        icon={Bell}
        backTo="/administracao"
      />

      <Card>
        <CardHeader>
          <CardTitle>Credenciais</CardTitle>
          <CardDescription>
            Crie um app em onesignal.com e cole abaixo o <strong>App ID</strong> e a <strong>REST API Key</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>OneSignal App ID</Label>
              <Input
                placeholder="00000000-0000-0000-0000-000000000000"
                value={form.app_id ?? ''}
                onChange={(e) => setForm({ ...form, app_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Safari Web ID (opcional)</Label>
              <Input
                placeholder="web.onesignal.auto.xxxx"
                value={form.safari_web_id ?? ''}
                onChange={(e) => setForm({ ...form, safari_web_id: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>REST API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="os_v2_app_..."
                value={form.rest_api_key ?? ''}
                onChange={(e) => setForm({ ...form, rest_api_key: e.target.value })}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Visível apenas para administradores. Usada do servidor para autenticar contra a OneSignal API.
            </p>
          </div>

          <Separator />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={testConnection}
              disabled={connTesting || !form.app_id?.trim() || !form.rest_api_key?.trim()}
            >
              {connTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}
              {connTesting ? 'Testando…' : 'Testar conexão'}
            </Button>
            {connResult && !connModalOpen && (
              connResult.ok ? (
                <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Conectado a {connResult.app?.name ?? 'OneSignal'}
                </span>
              ) : (
                <button
                  type="button"
                  className="text-sm text-destructive inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  onClick={() => setConnModalOpen(true)}
                >
                  <XCircle className="h-4 w-4" /> Falha — ver detalhes
                </button>
              )
            )}
            <span className="text-xs text-muted-foreground">
              Valida App ID + REST API Key contra <code>api.onesignal.com</code>.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Push</CardTitle>
          <CardDescription>Notificações push para web/PWA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Habilitar push</p>
              <p className="text-sm text-muted-foreground">Permite enviar notificações push pelo sistema.</p>
            </div>
            <Switch
              checked={!!form.push_enabled}
              onCheckedChange={(v) => setForm({ ...form, push_enabled: v })}
            />
          </div>
          <Separator />
          <Button
            variant="outline"
            disabled={!form.push_enabled || !form.app_id || !form.rest_api_key || testing !== null}
            onClick={() => sendTest('push')}
          >
            <Send className="h-4 w-4 mr-2" />
            {testing === 'push' ? 'Enviando…' : 'Enviar push de teste para mim'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> E-mail</CardTitle>
          <CardDescription>Envio de e-mails transacionais via OneSignal. Requer domínio verificado no painel da OneSignal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Habilitar e-mail</p>
              <p className="text-sm text-muted-foreground">Permite enviar e-mails pelo sistema.</p>
            </div>
            <Switch
              checked={!!form.email_enabled}
              onCheckedChange={(v) => setForm({ ...form, email_enabled: v })}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do remetente</Label>
              <Input
                placeholder="Neovale"
                value={form.email_from_name ?? ''}
                onChange={(e) => setForm({ ...form, email_from_name: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail remetente</Label>
              <Input
                type="email"
                placeholder="nao-responda@seudominio.com"
                value={form.email_from_address ?? ''}
                onChange={(e) => setForm({ ...form, email_from_address: e.target.value })}
              />
            </div>
          </div>
          <Separator />
          <Button
            variant="outline"
            disabled={!form.email_enabled || !form.app_id || !form.rest_api_key || testing !== null}
            onClick={() => sendTest('email')}
          >
            <Send className="h-4 w-4 mr-2" />
            {testing === 'email' ? 'Enviando…' : 'Enviar e-mail de teste para mim'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de envios</CardTitle>
          <CardDescription>Últimos 50 envios desta organização.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum envio registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Assunto / Mensagem</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell><Badge variant="outline">{l.channel}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate">{l.subject || l.message}</TableCell>
                    <TableCell className="text-xs">{l.recipients_count ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'sent' ? 'default' : l.status === 'failed' ? 'destructive' : 'secondary'}>
                        {l.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={connModalOpen} onOpenChange={setConnModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connResult?.ok ? (
                <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Conexão bem-sucedida</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Falha na conexão com a OneSignal</>
              )}
            </DialogTitle>
            <DialogDescription>
              {connResult?.ok
                ? 'O App ID e a REST API Key estão válidos e foram aceitos pela OneSignal.'
                : 'A OneSignal recusou as credenciais ou houve falha ao consultar a API. Veja abaixo o que aconteceu e como resolver.'}
            </DialogDescription>
          </DialogHeader>

          {connResult?.ok ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                <div><span className="text-muted-foreground">App:</span> <strong>{connResult.app?.name ?? '—'}</strong></div>
                <div><span className="text-muted-foreground">App ID:</span> <code className="text-xs">{connResult.app?.id}</code></div>
                <div><span className="text-muted-foreground">Inscritos (players):</span> {connResult.app?.players ?? 0}</div>
                <div><span className="text-muted-foreground">Aptos a receber push:</span> {connResult.app?.messageable_players ?? 0}</div>
              </div>
            </div>
          ) : connResult ? (
            <div className="space-y-4 text-sm">
              <Alert variant="destructive">
                <AlertTitle className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {connResult.remediation?.title ?? 'Erro'} {connResult.code ? <Badge variant="outline" className="ml-2">{connResult.code}</Badge> : null}
                </AlertTitle>
                <AlertDescription>
                  {connResult.http_status != null && (
                    <div className="text-xs mt-1">HTTP status retornado pela OneSignal: <strong>{connResult.http_status}</strong></div>
                  )}
                </AlertDescription>
              </Alert>

              <div>
                <p className="font-medium mb-2">Como resolver:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  {(connResult.remediation?.steps ?? []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              {connResult.response && (
                <details className="rounded-lg border p-3 bg-muted/30">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    Detalhes técnicos da resposta da OneSignal
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all">
{JSON.stringify(connResult.response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConnModalOpen(false)}>Fechar</Button>
            {!connResult?.ok && (
              <Button onClick={testConnection} disabled={connTesting}>
                {connTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}
                Testar novamente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
