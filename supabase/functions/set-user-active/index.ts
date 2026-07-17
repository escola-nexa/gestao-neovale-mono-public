import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user: caller }, error: authError } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRoles } = await admin
      .from("user_roles").select("role, organization_id").eq("user_id", caller.id);

    const isAdmin = callerRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem desativar usuários" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body.userId;
    const active: boolean = !!body.active;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "userId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ success: false, error: "Você não pode desativar sua própria conta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block desativar Master Admin
    const callerOrgId = callerRoles?.find((r) => r.role === "admin")?.organization_id;
    const { data: orgAdmins } = await admin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("organization_id", callerOrgId)
      .eq("role", "admin")
      .order("created_at", { ascending: true });

    if (!active && orgAdmins && orgAdmins.length > 0 && orgAdmins[0].user_id === userId) {
      return new Response(JSON.stringify({ success: false, error: "O Administrador Mestre não pode ser desativado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Block / unblock auth login via banned_until
    const banPayload = active
      ? { ban_duration: "none" as const }
      : { ban_duration: "876000h" }; // ~100 anos

    const { error: banErr } = await admin.auth.admin.updateUserById(userId, banPayload as any);
    if (banErr) {
      console.error("Ban error:", banErr);
      return new Response(JSON.stringify({ success: false, error: "Erro ao alterar acesso: " + banErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Update profile flag
    await admin.from("profiles").update({ is_active: active, updated_at: new Date().toISOString() }).eq("user_id", userId);

    // 3) If user is a professor, mirror status (without soft-delete) to remove from active dropdowns
    await admin.from("professors")
      .update({ status: active ? "ACTIVE" : "INACTIVE" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // 4) Revoke active sessions when deactivating
    if (!active) {
      try { await admin.auth.admin.signOut(userId, "global"); } catch (e) { console.warn("signOut warn", e); }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("set-user-active error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
