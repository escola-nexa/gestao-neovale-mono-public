import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const documentId = body?.documentId;
    if (!documentId || typeof documentId !== "string") {
      return new Response(JSON.stringify({ error: "documentId obrigatório" }), { status: 400, headers: corsHeaders });
    }

    const { data: doc } = await admin
      .from("hr_hiring_documents")
      .select("file_path, organization_id, file_name")
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Documento não encontrado" }), { status: 404, headers: corsHeaders });
    }

    // Verifica permissão: admin/coord/RH na organização (mesma regra de is_coordinator)
    const { data: allowed } = await admin.rpc("is_coordinator", { user_uuid: userId, org_uuid: doc.organization_id });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: signed, error } = await admin.storage
      .from("hiring-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ signedUrl: signed?.signedUrl, fileName: doc.file_name }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "erro" }), { status: 500, headers: corsHeaders });
  }
});
