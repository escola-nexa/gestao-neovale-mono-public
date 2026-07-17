import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10000;
const BACKOFF_MINUTES = [1, 5, 30];

async function hmacSha256(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isPrivateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return true;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.startsWith("127.") ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "0.0.0.0"
    ) return true;
    return false;
  } catch {
    return true;
  }
}

async function deliverOne(
  supabase: ReturnType<typeof createClient>,
  webhook: any,
  event: any,
  attempt: number,
): Promise<{ success: boolean; status?: number; body?: string; durationMs: number; error?: string }> {
  const startedAt = Date.now();
  const deliveryId = crypto.randomUUID();

  const requestBody = {
    id: event.id,
    event: event.event_type,
    created_at: event.created_at,
    organization_id: event.organization_id,
    delivery_id: deliveryId,
    attempt,
    data: event.payload,
  };

  const bodyStr = JSON.stringify(requestBody);
  const signature = await hmacSha256(webhook.secret, bodyStr);

  const customHeaders = (webhook.headers && typeof webhook.headers === "object")
    ? webhook.headers as Record<string, string>
    : {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Neovale-Webhooks/1.0",
    "X-Neovale-Signature": `sha256=${signature}`,
    "X-Neovale-Event": event.event_type,
    "X-Neovale-Delivery-Id": deliveryId,
    "X-Neovale-Attempt": String(attempt),
    ...customHeaders,
  };

  if (isPrivateUrl(webhook.target_url)) {
    return { success: false, durationMs: 0, error: "URL bloqueada (privada/localhost/não-HTTPS)" };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(webhook.target_url, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const respBody = (await res.text()).slice(0, 4000);
    const duration = Date.now() - startedAt;
    return { success: res.ok, status: res.status, body: respBody, durationMs: duration };
  } catch (err) {
    const duration = Date.now() - startedAt;
    return { success: false, durationMs: duration, error: (err as Error).message };
  }
}

async function processEvent(supabase: ReturnType<typeof createClient>, eventId: string) {
  // claim
  const { data: claimed } = await supabase
    .from("webhook_events")
    .update({ status: "processing" })
    .eq("id", eventId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (!claimed) return;

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("organization_id", claimed.organization_id)
    .eq("is_active", true)
    .contains("event_types", [claimed.event_type]);

  if (!webhooks?.length) {
    await supabase.from("webhook_events").update({ status: "no_subscribers", processed_at: new Date().toISOString() }).eq("id", eventId);
    return;
  }

  for (const wh of webhooks) {
    const result = await deliverOne(supabase, wh, claimed, 1);

    await supabase.from("webhook_deliveries").insert({
      webhook_id: wh.id,
      event_id: claimed.id,
      attempt: 1,
      request_body: claimed.payload,
      response_status: result.status,
      response_body: result.body,
      duration_ms: result.durationMs,
      error: result.error,
      status: result.success ? "success" : "retrying",
      delivered_at: result.success ? new Date().toISOString() : null,
      next_retry_at: result.success ? null : new Date(Date.now() + BACKOFF_MINUTES[0] * 60_000).toISOString(),
    });

    if (result.success) {
      await supabase.from("webhooks").update({
        last_triggered_at: new Date().toISOString(),
        failure_count: 0,
      }).eq("id", wh.id);
    } else {
      const newCount = (wh.failure_count || 0) + 1;
      const updates: any = {
        last_failure_at: new Date().toISOString(),
        failure_count: newCount,
      };
      if (newCount >= 20) updates.is_active = false;
      await supabase.from("webhooks").update(updates).eq("id", wh.id);
    }
  }

  await supabase.from("webhook_events").update({ status: "completed", processed_at: new Date().toISOString() }).eq("id", eventId);
}

async function processRetries(supabase: ReturnType<typeof createClient>) {
  const { data: retries } = await supabase
    .from("webhook_deliveries")
    .select("*, webhooks(*), webhook_events(*)")
    .eq("status", "retrying")
    .lte("next_retry_at", new Date().toISOString())
    .lt("attempt", MAX_ATTEMPTS)
    .limit(20);

  for (const d of retries || []) {
    const wh = (d as any).webhooks;
    const ev = (d as any).webhook_events;
    if (!wh || !ev || !wh.is_active) continue;

    const nextAttempt = d.attempt + 1;
    const result = await deliverOne(supabase, wh, ev, nextAttempt);

    const isLast = nextAttempt >= MAX_ATTEMPTS;
    await supabase.from("webhook_deliveries").update({
      status: result.success ? "success" : (isLast ? "failed" : "retrying"),
      attempt: nextAttempt,
      response_status: result.status,
      response_body: result.body,
      duration_ms: result.durationMs,
      error: result.error,
      delivered_at: result.success ? new Date().toISOString() : null,
      next_retry_at: result.success || isLast
        ? null
        : new Date(Date.now() + BACKOFF_MINUTES[Math.min(nextAttempt - 1, BACKOFF_MINUTES.length - 1)] * 60_000).toISOString(),
    }).eq("id", d.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }

    if (body.event_id) {
      // Reactive mode (called right after enqueue)
      await processEvent(supabase, body.event_id);
      return new Response(JSON.stringify({ ok: true, mode: "single" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.delivery_id) {
      // Manual resend
      const { data: del } = await supabase
        .from("webhook_deliveries")
        .select("*, webhooks(*), webhook_events(*)")
        .eq("id", body.delivery_id)
        .maybeSingle();
      if (!del) {
        return new Response(JSON.stringify({ ok: false, error: "delivery not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const wh = (del as any).webhooks;
      const ev = (del as any).webhook_events;
      const result = await deliverOne(supabase, wh, ev, (del.attempt || 0) + 1);
      await supabase.from("webhook_deliveries").insert({
        webhook_id: wh.id,
        event_id: ev.id,
        attempt: (del.attempt || 0) + 1,
        request_body: ev.payload,
        response_status: result.status,
        response_body: result.body,
        duration_ms: result.durationMs,
        error: result.error,
        status: result.success ? "success" : "failed",
        delivered_at: result.success ? new Date().toISOString() : null,
      });
      return new Response(JSON.stringify({ ok: true, success: result.success, status: result.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cron mode: process pending + retries
    const { data: pending } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    for (const ev of pending || []) {
      await processEvent(supabase, ev.id);
    }
    await processRetries(supabase);

    return new Response(JSON.stringify({ ok: true, processed: pending?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
