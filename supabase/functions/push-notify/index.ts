// push-notify — invoked by DB trigger on notifications insert.
// Public (verify_jwt=false). Uses notification_id; reads via service role.
// Dedupes via pwa_pushed_notifications. Only pushes notifications < 5 min old.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { notification_id } = (await req.json()) as { notification_id?: string };
    if (!notification_id) return json({ error: 'notification_id required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Dedup
    const { error: dupErr } = await admin
      .from('pwa_pushed_notifications')
      .insert({ notification_id });
    if (dupErr) {
      // already pushed (PK conflict) — silent success
      return json({ skipped: 'duplicate' });
    }

    const { data: notif } = await admin
      .from('notifications')
      .select('id,user_id,title,message,type,reference_id,created_at')
      .eq('id', notification_id)
      .maybeSingle();
    if (!notif) return json({ error: 'notification not found' }, 404);

    // Only push if recent (< 5 min) — avoid backfill blasts
    const ageMs = Date.now() - new Date(notif.created_at).getTime();
    if (ageMs > 5 * 60 * 1000) return json({ skipped: 'too old' });

    // Get user's org + push pref
    const { data: pref } = await admin
      .from('user_notification_prefs')
      .select('push_enabled')
      .eq('user_id', notif.user_id)
      .maybeSingle();
    if (pref && pref.push_enabled === false) return json({ skipped: 'user opted out' });

    const { data: roleRow } = await admin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', notif.user_id)
      .maybeSingle();
    if (!roleRow) return json({ skipped: 'no org' });

    const { data: settings } = await admin
      .from('onesignal_settings')
      .select('app_id,rest_api_key,push_enabled')
      .eq('organization_id', roleRow.organization_id)
      .maybeSingle();
    if (!settings?.app_id || !settings?.rest_api_key || !settings.push_enabled) {
      return json({ skipped: 'onesignal not configured' });
    }

    // URL routing per notification type
    const url = deriveUrl(notif.type, notif.reference_id);

    const payload = {
      app_id: settings.app_id,
      headings: { en: notif.title, pt: notif.title },
      contents: { en: notif.message, pt: notif.message },
      include_aliases: { external_id: [notif.user_id] },
      target_channel: 'push',
      url,
      data: { type: notif.type, reference_id: notif.reference_id, notification_id: notif.id },
    };

    const resp = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${settings.rest_api_key}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.warn('[push-notify] OneSignal error', resp.status, result);
      return json({ error: 'onesignal_failed', detail: result }, 502);
    }
    return json({ ok: true, onesignal: result });
  } catch (e) {
    console.error('[push-notify] exception', e);
    return json({ error: String(e) }, 500);
  }
});

function deriveUrl(type: string, ref: string | null): string | undefined {
  const base = 'https://nexa-gestao.lovable.app';
  if (!type) return undefined;
  if (type.startsWith('TICKET_')) return ref ? `${base}/tickets/${ref}` : `${base}/tickets`;
  if (type.startsWith('ORIENTATION_')) return ref ? `${base}/orientacoes` : `${base}/orientacoes`;
  return base;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
