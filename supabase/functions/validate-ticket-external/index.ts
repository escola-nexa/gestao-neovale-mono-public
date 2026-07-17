import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function hashKeyword(keyword: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(keyword.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { token, keyword, action, message, sender_name } = body;

    if (!token || !keyword) {
      return new Response(JSON.stringify({ success: false, error: "Token e palavra-chave obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Find ticket by external_token
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*, schools(nome, organization_id)")
      .eq("external_token", token)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ success: false, error: "Ticket não encontrado" }), { status: 404, headers: corsHeaders });
    }

    // Validate keyword
    const { data: activeKeyword } = await supabase
      .from("quarterly_keywords")
      .select("*")
      .eq("organization_id", ticket.organization_id)
      .eq("is_active", true)
      .gte("expires_at", new Date().toISOString())
      .lte("starts_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeKeyword) {
      return new Response(JSON.stringify({ success: false, error: "Nenhuma palavra-chave ativa" }), { status: 403, headers: corsHeaders });
    }

    const keywordHash = await hashKeyword(keyword);
    if (keywordHash !== activeKeyword.keyword_hash) {
      return new Response(JSON.stringify({ success: false, error: "Palavra-chave incorreta" }), { status: 403, headers: corsHeaders });
    }

    // Action: validate - return ticket info
    if (action === "validate") {
      return new Response(JSON.stringify({
        success: true,
        data: {
          ticket_id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          school_name: ticket.schools?.nome || "Escola",
          external_author_name: ticket.external_author_name,
        },
      }), { headers: corsHeaders });
    }

    // Action: messages - return non-internal messages only
    if (action === "messages") {
      const { data: msgs } = await supabase
        .from("ticket_messages")
        .select("id, author_id, message, created_at, attachments")
        .eq("ticket_id", ticket.id)
        .eq("is_internal_note", false)
        .order("created_at", { ascending: true });

      // Map author names for display
      const enrichedMsgs = (msgs || []).map((m: any) => ({
        ...m,
        sender_name: m.author_id ? "Equipe Neovale" : (ticket.external_author_name || "Externo"),
      }));

      return new Response(JSON.stringify({ success: true, data: { messages: enrichedMsgs } }), { headers: corsHeaders });
    }

    // Action: send_message
    if (action === "send_message") {
      if (!message?.trim() || !sender_name?.trim()) {
        return new Response(JSON.stringify({ success: false, error: "Mensagem e nome obrigatórios" }), { status: 400, headers: corsHeaders });
      }
      if (ticket.status === "cancelado" || ticket.status === "resolvido") {
        return new Response(JSON.stringify({ success: false, error: "Ticket encerrado" }), { status: 400, headers: corsHeaders });
      }
      if (message.length > 2000 || sender_name.length > 100) {
        return new Response(JSON.stringify({ success: false, error: "Campos excedem tamanho máximo" }), { status: 400, headers: corsHeaders });
      }

      const { error: insertError } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: null,
        message: message.trim(),
        is_internal_note: false,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ success: false, error: "Erro ao enviar mensagem" }), { status: 500, headers: corsHeaders });
      }

      // Update ticket status to indicate external response
      if (ticket.status === "aguardando_escola" || ticket.status === "aberto") {
        await supabase.from("tickets").update({ status: "em_atendimento" }).eq("id", ticket.id);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), { status: 500, headers: corsHeaders });
  }
});
