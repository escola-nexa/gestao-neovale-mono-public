// One-shot admin cleanup: remove arquivos do bucket library-content
// que NÃO possuem referência em public.library_contents.
// Requer admin autenticado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(url, anon);
  const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: rolesData } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (rolesData || []).some((r: any) => r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden - admin only" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 1) Lista referências do banco
  const refs = new Set<string>();
  const { data: rows, error: refsErr } = await admin
    .from("library_contents")
    .select("storage_path")
    .not("storage_path", "is", null);
  if (refsErr) {
    return new Response(JSON.stringify({ error: refsErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  for (const r of rows || []) {
    if (r.storage_path) refs.add(r.storage_path);
  }

  // 2) Lista TODOS os arquivos do bucket (recursivo, paginado)
  async function listAll(prefix: string): Promise<string[]> {
    const out: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from("library-content").list(prefix, {
        limit: 1000, offset, sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null) {
          // pasta -> recursão
          const sub = await listAll(full);
          out.push(...sub);
        } else {
          out.push(full);
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    return out;
  }

  let allFiles: string[] = [];
  try {
    allFiles = await listAll("");
  } catch (e) {
    return new Response(JSON.stringify({ error: `list failed: ${(e as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const orphans = allFiles.filter((p) => !refs.has(p));

  // 3) Remove em lotes de 100
  let removed = 0;
  const errors: string[] = [];
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100);
    const { data, error } = await admin.storage.from("library-content").remove(batch);
    if (error) errors.push(error.message);
    removed += (data || []).length;
  }

  return new Response(JSON.stringify({
    total_files: allFiles.length,
    db_references: refs.size,
    orphans_found: orphans.length,
    removed,
    errors,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
