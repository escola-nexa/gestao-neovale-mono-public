/**
 * OneSignal Web SDK lazy initialization.
 *
 * Rules:
 *  - NEVER init in iframe / Lovable preview (same guards as PWA SW).
 *  - Only init if push_enabled and app_id are configured for this org.
 *  - On login, call `loginOneSignal(userId)` to bind external_id.
 */

import { supabase } from '@/integrations/supabase/client';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const PREVIEW_HOSTS = ['id-preview--', 'lovableproject.com', 'lovable.app/preview'];

let initPromise: Promise<boolean> | null = null;

function isBlockedContext(): boolean {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  const href = window.location.href;
  return PREVIEW_HOSTS.some((p) => host.includes(p) || href.includes(p));
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('OneSignal SDK failed to load'));
    document.head.appendChild(s);
  });
}

export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isBlockedContext()) return false;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Fetch public-safe config (app_id + safari_web_id) of the user's org.
    // RLS allows authenticated org members to read.
    const { data, error } = await supabase
      .from('onesignal_settings' as any)
      .select('app_id,safari_web_id,push_enabled')
      .maybeSingle();

    if (error || !data) return false;
    const cfg = data as any;
    if (!cfg.push_enabled || !cfg.app_id) return false;

    await loadScript(SDK_URL);

    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    await new Promise<void>((resolve) => {
      (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: cfg.app_id,
            safari_web_id: cfg.safari_web_id || undefined,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/onesignal/' },
          });
        } catch (e) {
          console.warn('[OneSignal] init failed', e);
        }
        resolve();
      });
    });
    return true;
  })();

  return initPromise;
}

export async function loginOneSignal(userId: string): Promise<void> {
  if (isBlockedContext() || !userId) return;
  const ok = await initOneSignal();
  if (!ok) return;
  (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
    try {
      await OneSignal.login(userId);
    } catch (e) {
      console.warn('[OneSignal] login failed', e);
    }
  });
}

export async function logoutOneSignal(): Promise<void> {
  if (isBlockedContext()) return;
  (window as any).OneSignalDeferred?.push(async (OneSignal: any) => {
    try {
      await OneSignal.logout();
    } catch {}
  });
}

export async function requestPushPermission(): Promise<boolean> {
  const ok = await initOneSignal();
  if (!ok) return false;
  return new Promise<boolean>((resolve) => {
    (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.Notifications.requestPermission();
        resolve(OneSignal.Notifications.permission === true);
      } catch {
        resolve(false);
      }
    });
  });
}
