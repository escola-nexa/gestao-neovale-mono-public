import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, BellRing, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { configApi } from '@/features/configuracoes/api';
import { toast } from 'sonner';
import { initOneSignal, requestPushPermission } from '@/lib/onesignal';

type PermState = 'default' | 'granted' | 'denied' | 'unsupported';

export default function NotificationSettingsPage() {
  const [perm, setPerm] = useState<PermState>('default');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oneSignalReady, setOneSignalReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Browser permission
      if (typeof Notification !== 'undefined') {
        setPerm(Notification.permission as PermState);
      } else {
        setPerm('unsupported');
      }
      // Init OneSignal & read sub id
      const ok = await initOneSignal();
      setOneSignalReady(ok);
      if (ok) {
        (window as any).OneSignalDeferred?.push(async (OS: any) => {
          try {
            setSubscriptionId(OS.User?.PushSubscription?.id ?? null);
          } catch {}
        });
      }
      // Load prefs
      const u = await configApi.getAuthUser();
      if (u.user) {
        const data = await configApi.getNotificationSettings(u.id);
        if (data) {
          setPushEnabled(data.push_enabled);
          setEmailEnabled(data.email_enabled);
          if (data.onesignal_subscription_id) setSubscriptionId(data.onesignal_subscription_id);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function savePrefs(next: { push?: boolean; email?: boolean; subId?: string | null }) {
    const u = await configApi.getAuthUser();
    if (!u.user) return;
    const payload: any = { user_id: u.user.id };
    if (next.push !== undefined) payload.push_enabled = next.push;
    if (next.email !== undefined) payload.email_enabled = next.email;
    if (next.subId !== undefined) payload.onesignal_subscription_id = next.subId;
    const { error } = await supabase
      .from('user_notification_prefs')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) toast.error('Erro ao salvar: ' + error.message);
  }

  async function handleEnablePush() {
    setBusy(true);
    try {
      const granted = await requestPushPermission();
      if (typeof Notification !== 'undefined') {
        setPerm(Notification.permission as PermState);
      }
      if (!granted) {
        toast.error('Permissão negada pelo navegador');
        return;
      }
      // Get sub id
      let subId: string | null = null;
      await new Promise<void>((resolve) => {
        (window as any).OneSignalDeferred?.push(async (OS: any) => {
          try {
            subId = OS.User?.PushSubscription?.id ?? null;
          } catch {}
          resolve();
        });
        setTimeout(resolve, 2000);
      });
      setSubscriptionId(subId);
      setPushEnabled(true);
      await savePrefs({ push: true, subId });
      toast.success('Notificações ativadas');
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePush(v: boolean) {
    setPushEnabled(v);
    await savePrefs({ push: v });
    toast.success(v ? 'Push ativado' : 'Push desativado');
  }
  async function handleToggleEmail(v: boolean) {
    setEmailEnabled(v);
    await savePrefs({ email: v });
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  const isPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('id-preview--') ||
      window.location.hostname.includes('lovableproject.com'));

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Notificações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie como você recebe avisos do Neovale neste dispositivo.
        </p>
      </div>

      {isPreview && (
        <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <strong>Push só funciona no domínio publicado</strong> (
              <code>nexa-gestao.lovable.app</code>). Aqui no preview as opções aparecem
              desabilitadas.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" /> Notificações Push
          </CardTitle>
          <CardDescription>
            Receba avisos no celular ou desktop mesmo com o app fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">Status do navegador</div>
              <div className="text-muted-foreground text-xs">
                {perm === 'granted' && 'Permissão concedida'}
                {perm === 'denied' && 'Bloqueado — ajuste nas configurações do navegador'}
                {perm === 'default' && 'Aguardando permissão'}
                {perm === 'unsupported' && 'Não suportado neste navegador'}
              </div>
            </div>
            <Badge variant={perm === 'granted' ? 'default' : 'secondary'}>
              {perm}
            </Badge>
          </div>

          {perm !== 'granted' && (
            <Button
              onClick={handleEnablePush}
              disabled={busy || isPreview || perm === 'denied' || perm === 'unsupported' || !oneSignalReady}
              className="w-full"
            >
              <Bell className="mr-2 h-4 w-4" />
              {busy ? 'Solicitando…' : 'Ativar notificações neste dispositivo'}
            </Button>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">Receber pushes do sistema</div>
              <div className="text-muted-foreground text-xs">
                Tickets, planejamentos, orientações, comunicados.
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={handleTogglePush} />
          </div>

          {subscriptionId && (
            <div className="text-muted-foreground text-xs">
              <BellOff className="mr-1 inline h-3 w-3" />
              Inscrição: <code className="font-mono">{subscriptionId.slice(0, 12)}…</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações por e-mail</CardTitle>
          <CardDescription>Receber resumos por e-mail.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="font-medium">E-mail habilitado</div>
            <Switch checked={emailEnabled} onCheckedChange={handleToggleEmail} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
