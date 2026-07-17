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
    const { school_id, keyword, title, description, category_id, priority, author_name, external_link_token } = body;

    // Validate required fields
    if (!school_id || !keyword || !title || !author_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: school_id, keyword, title, author_name" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (title.length > 255 || (description && description.length > 2000) || author_name.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos excedem o tamanho máximo permitido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get school and org info
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, organization_id, nome")
      .eq("id", school_id)
      .single();

    if (schoolError || !school) {
      return new Response(
        JSON.stringify({ success: false, error: "Escola não encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate external sharing link if provided
    if (external_link_token) {
      const { data: extLink } = await supabase
        .from("external_links")
        .select("id, is_active, expires_at, school_id")
        .eq("token", external_link_token)
        .eq("school_id", school_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!extLink) {
        return new Response(
          JSON.stringify({ success: false, error: "Link de compartilhamento inválido ou inativo" }),
          { status: 403, headers: corsHeaders }
        );
      }

      if (extLink.expires_at && new Date(extLink.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Link de compartilhamento expirado" }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Validate keyword against active quarterly keyword
    const { data: activeKeyword } = await supabase
      .from("quarterly_keywords")
      .select("*")
      .eq("organization_id", school.organization_id)
      .eq("is_active", true)
      .gte("expires_at", new Date().toISOString())
      .lte("starts_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeKeyword) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma palavra-chave ativa. Contate a administração." }),
        { status: 403, headers: corsHeaders }
      );
    }

    const keywordHash = await hashKeyword(keyword);
    if (keywordHash !== activeKeyword.keyword_hash) {
      return new Response(
        JSON.stringify({ success: false, error: "Palavra-chave incorreta" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Generate unique external token
    const externalToken = crypto.randomUUID();

    // Find school-specific coordinator for school_responsible_id
    let schoolResponsibleId: string | null = null;
    const { data: coordData } = await supabase
      .from("user_roles")
      .select("user_id, professors!inner(id, professor_school_courses!inner(school_id))")
      .eq("organization_id", school.organization_id)
      .eq("role", "coordenador")
      .eq("professors.organization_id", school.organization_id)
      .eq("professors.professor_school_courses.school_id", school_id)
      .eq("professors.professor_school_courses.status", "ACTIVE")
      .limit(1);

    if (coordData && coordData.length > 0) {
      schoolResponsibleId = coordData[0].user_id;
    } else {
      // Fallback: any coordinator in org
      const { data: fallbackCoord } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", school.organization_id)
        .eq("role", "coordenador")
        .limit(1);
      if (fallbackCoord && fallbackCoord.length > 0) {
        schoolResponsibleId = fallbackCoord[0].user_id;
      }
    }

    // Find admin for nexa_responsible_id
    let nexaResponsibleId: string | null = null;
    const { data: adminData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", school.organization_id)
      .eq("role", "admin")
      .limit(1);
    if (adminData && adminData.length > 0) {
      nexaResponsibleId = adminData[0].user_id;
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        organization_id: school.organization_id,
        title: title.trim(),
        description: description?.trim() || null,
        category_id: category_id || null,
        school_id: school_id,
        priority: priority || "media",
        external_token: externalToken,
        external_author_name: author_name.trim(),
        opened_by_id: null,
        school_responsible_id: schoolResponsibleId,
        nexa_responsible_id: nexaResponsibleId,
      })
      .select("id, external_token")
      .single();

    if (ticketError) {
      console.error("Error creating ticket:", ticketError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao criar ticket" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Create initial message
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: null,
      message: description?.trim() || title.trim(),
      is_internal_note: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ticket_id: ticket.id,
          external_token: ticket.external_token,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
