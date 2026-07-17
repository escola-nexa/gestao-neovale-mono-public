import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userClient = createClient(SUPABASE_URL, ANON);
  const { data: { user } } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const { webhook_id } = body;
  if (!webhook_id) {
    return new Response(JSON.stringify({ error: "webhook_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verifica se o usuário é admin da org do webhook
  const { data: wh } = await admin.from("webhooks").select("*").eq("id", webhook_id).maybeSingle();
  if (!wh) {
    return new Response(JSON.stringify({ error: "webhook não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("organization_id", wh.organization_id);
  const isAdmin = roles?.some((r: any) => r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Enfileira evento de teste
  const { data: eventId } = await admin.rpc("enqueue_webhook_event", {
    p_organization_id: wh.organization_id,
    p_event_type: "webhook.test",
    p_payload: {
      message: "Este é um evento de teste enviado manualmente.",
      triggered_by: user.email,
      triggered_at: new Date().toISOString(),
    },
    p_source_table: "webhooks",
    p_source_id: webhook_id,
  });

  // Força inscrição temporária se "webhook.test" não estiver no array — alternativa: dispatch direto
  if (!wh.event_types.includes("webhook.test")) {
    // Insere evento manualmente e força entrega para este webhook
    const { data: ev } = await admin.from("webhook_events").insert({
      organization_id: wh.organization_id,
      event_type: "webhook.test",
      payload: {
        message: "Evento de teste manual",
        triggered_by: user.email,
        triggered_at: new Date().toISOString(),
      },
      source_table: "webhooks",
      source_id: webhook_id,
      status: "pending",
    }).select().single();

    // Chama dispatcher diretamente para este evento
    await fetch(`${SUPABASE_URL}/functions/v1/webhook-dispatcher`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE}` },
      body: JSON.stringify({ event_id: ev?.id, force_webhook_id: webhook_id }),
    }).catch(() => {});
  } else if (eventId) {
    await fetch(`${SUPABASE_URL}/functions/v1/webhook-dispatcher`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE}` },
      body: JSON.stringify({ event_id: eventId }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
