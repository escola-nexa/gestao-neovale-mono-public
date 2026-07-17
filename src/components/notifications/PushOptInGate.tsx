import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { isStandalone } from '@/hooks/useInstallPrompt';
import { initOneSignal, requestPushPermission } from '@/lib/onesignal';
import { toast } from 'sonner';

const SNOOZE_KEY = 'neovale.push.optin.snoozedAt';
const SNOOZE_DAYS = 7;

const PREVIEW_HOSTS = ['id-preview--', 'lovableproject.com'];
function isPreview() {
  if (typeof window === 'undefined') return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return PREVIEW_HOSTS.some((p) => host.includes(p));
}

export function PushOptInGate() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPreview()) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;

    // iOS Safari só suporta push em PWA instalado — não pede no navegador comum
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIOS && !isStandalone()) return;

    const snoozedAt = Number(localStorage.getItem(SNOOZE_KEY) ?? '0');
    if (Date.now() < snoozedAt + SNOOZE_DAYS * 24 * 60 * 60 * 1000) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ok = await initOneSignal();
      if (!ok || cancelled) return;
      // Espera 3s para não atropelar o login
      setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 3000);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  };

  const enable = async () => {
    setBusy(true);

    // CRITICAL: dispara o prompt nativo SINCRONAMENTE dentro do gesto do usuário.
    // Qualquer `await` antes disso quebra o "user activation" no iOS/Safari/Chrome
    // e a chamada fica pendurada ("Solicitando...").
    let permissionPromise: Promise<NotificationPermission> | null = null;
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        permissionPromise = Notification.requestPermission();
      }
    } catch (e) {
      console.warn('[Push] requestPermission sync failed', e);
    }

    // Timeout de segurança para não travar a modal
    const timeout = new Promise<NotificationPermission>((resolve) =>
      setTimeout(() => resolve(Notification.permission), 15000),
    );

    try {
      const permission = permissionPromise
        ? await Promise.race([permissionPromise, timeout])
        : Notification.permission;

      if (permission !== 'granted') {
        toast.info('Você pode ativar depois em Configurações → Notificações.');
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
        setOpen(false);
        return;
      }

      // Agora sim inicializa OneSignal e registra a subscription (não precisa de gesto)
      const ok = await initOneSignal();
      let subId: string | null = null;
      if (ok) {
        await new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 4000);
          (window as any).OneSignalDeferred?.push(async (OS: any) => {
            try {
              await OS.Notifications.requestPermission().catch(() => {});
              subId = OS.User?.PushSubscription?.id ?? null;
            } catch {}
            clearTimeout(t);
            resolve();
          });
        });
      }

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase
          .from('user_notification_prefs')
          .upsert(
            {
              user_id: u.user.id,
              push_enabled: true,
              onesignal_subscription_id: subId,
            },
            { onConflict: 'user_id' },
          );
      }
      toast.success('Notificações ativadas');
      setOpen(false);
    } catch (e) {
      console.error('[Push] enable failed', e);
      toast.error('Não foi possível ativar agora');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && snooze()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Ativar notificações?</DialogTitle>
          <DialogDescription className="text-center">
            Receba avisos em tempo real de tickets, planejamentos devolvidos,
            comunicados e mensagens do chat — direto neste dispositivo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={enable} disabled={busy} className="w-full">
            {busy ? 'Solicitando…' : 'Ativar notificações'}
          </Button>
          <Button onClick={snooze} variant="ghost" disabled={busy} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
