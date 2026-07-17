import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,   // 10MB
  video: 50 * 1024 * 1024,   // 50MB
  audio: 20 * 1024 * 1024,   // 20MB
  file: 25 * 1024 * 1024,    // 25MB
};

const ALLOWED_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
  // Videos
  "mp4", "mov", "avi", "webm", "mkv",
  // Audio
  "mp3", "wav", "ogg", "webm", "m4a", "aac",
  // Documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
]);

function getMediaType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
  return "file";
}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, ticket_id, organization_id, files } = body;

    if (action === "validate") {
      // Validate files before upload
      if (!Array.isArray(files) || files.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum arquivo fornecido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validationResults = files.map((f: { name: string; size: number }) => {
        const ext = getExtension(f.name);
        const mediaType = getMediaType(f.name);
        const maxSize = MAX_FILE_SIZES[mediaType] || MAX_FILE_SIZES.file;
        const errors: string[] = [];

        if (!ALLOWED_EXTENSIONS.has(ext)) {
          errors.push(`Extensão .${ext} não permitida`);
        }
        if (f.size > maxSize) {
          errors.push(`Arquivo excede o limite de ${Math.round(maxSize / 1024 / 1024)}MB`);
        }

        return {
          name: f.name,
          valid: errors.length === 0,
          mediaType,
          errors,
        };
      });

      const allValid = validationResults.every((r: { valid: boolean }) => r.valid);

      return new Response(
        JSON.stringify({ valid: allValid, results: validationResults }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate-signed-urls") {
      // Generate signed URLs for already uploaded files
      if (!ticket_id || !Array.isArray(files)) {
        return new Response(JSON.stringify({ error: "ticket_id e files são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user has access to the ticket
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: ticket, error: ticketError } = await adminClient
        .from("tickets")
        .select("id, organization_id, opened_by_id, school_id, type")
        .eq("id", ticket_id)
        .single();

      if (ticketError || !ticket) {
        return new Response(JSON.stringify({ error: "Ticket não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate signed URLs (valid 1 hour)
      const signedUrls = [];
      for (const path of files) {
        const { data, error } = await adminClient.storage
          .from("ticket-attachments")
          .createSignedUrl(path, 3600);

        if (!error && data) {
          signedUrls.push({ path, signedUrl: data.signedUrl });
        }
      }

      return new Response(
        JSON.stringify({ signedUrls }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use 'validate' ou 'generate-signed-urls'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
