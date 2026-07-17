// OneSignal send proxy — push or email
// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendRequest {
  channel: 'push' | 'email';
  title?: string;
  message: string;
  subject?: string;
  emailHtml?: string;
  targetUserIds?: string[];      // app user_ids (external_id no OneSignal)
  targetEmails?: string[];        // for email channel
  url?: string;                   // launch URL on push click
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'missing auth' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) return json({ error: 'invalid token' }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Org + role check (admin/coord/rh)
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!roleRow) return json({ error: 'no organization' }, 403);
    if (!['admin', 'coordenador', 'rh'].includes(roleRow.role)) {
      return json({ error: 'forbidden' }, 403);
    }
    const orgId = roleRow.organization_id;

    const { data: settings } = await admin
      .from('onesignal_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!settings?.app_id || !settings?.rest_api_key) {
      return json({ error: 'OneSignal não configurado (App ID e REST API Key obrigatórios)' }, 400);
    }

    const body = (await req.json()) as SendRequest;
    if (!body?.channel || !body?.message) return json({ error: 'channel e message obrigatórios' }, 400);

    if (body.channel === 'push' && !settings.push_enabled) {
      return json({ error: 'Push está desabilitado nas configurações' }, 400);
    }
    if (body.channel === 'email' && !settings.email_enabled) {
      return json({ error: 'Email está desabilitado nas configurações' }, 400);
    }

    const payload: Record<string, unknown> = { app_id: settings.app_id };

    if (body.channel === 'push') {
      payload.headings = { en: body.title ?? 'Neovale', pt: body.title ?? 'Neovale' };
      payload.contents = { en: body.message, pt: body.message };
      if (body.url) payload.url = body.url;
      if (body.data) payload.data = body.data;
      if (body.targetUserIds?.length) {
        payload.include_aliases = { external_id: body.targetUserIds };
        payload.target_channel = 'push';
      } else {
        payload.included_segments = ['Subscribed Users'];
      }
    } else {
      payload.email_subject = body.subject ?? body.title ?? 'Neovale';
      payload.email_body = body.emailHtml ?? `<p>${escapeHtml(body.message)}</p>`;
      if (settings.email_from_name) payload.email_from_name = settings.email_from_name;
      if (settings.email_from_address) payload.email_from_address = settings.email_from_address;
      if (body.targetEmails?.length) {
        payload.include_email_tokens = body.targetEmails;
      } else if (body.targetUserIds?.length) {
        payload.include_aliases = { external_id: body.targetUserIds };
        payload.target_channel = 'email';
      } else {
        return json({ error: 'targetEmails ou targetUserIds obrigatórios para email' }, 400);
      }
    }

    const osRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${settings.rest_api_key}`,
      },
      body: JSON.stringify(payload),
    });
    const osJson = await osRes.json().catch(() => ({}));

    const status = osRes.ok ? 'sent' : 'failed';
    await admin.from('onesignal_send_log').insert({
      organization_id: orgId,
      channel: body.channel,
      template: null,
      subject: body.subject ?? body.title ?? null,
      message: body.message,
      target_user_ids: body.targetUserIds ?? null,
      target_emails: body.targetEmails ?? null,
      external_ids: body.targetUserIds ?? null,
      status,
      onesignal_id: osJson?.id ?? null,
      recipients_count: osJson?.recipients ?? null,
      error_message: osRes.ok ? null : JSON.stringify(osJson),
      payload: payload as any,
      triggered_by: userId,
    });

    if (!osRes.ok) {
      return json({ error: 'OneSignal API error', details: osJson }, 502);
    }
    return json({ ok: true, onesignal: osJson });
  } catch (err) {
    console.error('onesignal-send error', err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
