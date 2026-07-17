import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  userId: string;
  fullName?: string;
  email?: string;
  role?: "admin" | "coordenador" | "professor" | "rh" | "financeiro";
  newPassword?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // RBAC check
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", caller.id);

    if (!callerRoles?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - no roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = callerRoles.some((r) => r.role === "admin");
    const isCoord = callerRoles.some((r) => r.role === "coordenador" || r.role === "rh");

    if (!isAdmin && !isCoord) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - admin or coordenador required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UpdateUserRequest = await req.json();
    const { userId, fullName, email, role, newPassword } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's roles to check permissions
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", userId);

    const targetIsAdmin = targetRoles?.some((r) => r.role === "admin");
    const targetIsRh = targetRoles?.some((r) => r.role === "rh");
    const targetIsFinanceiro = targetRoles?.some((r) => r.role === "financeiro");

    // Only admins can edit admins, RH or financeiro users
    if (!isAdmin && (targetIsAdmin || targetIsRh || targetIsFinanceiro)) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - only admins can edit admin/R.H./Financeiro users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only admins can promote to admin, rh or financeiro
    if (!isAdmin && (role === "admin" || role === "rh" || role === "financeiro")) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - only admins can assign admin/R.H./Financeiro role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate new password
    if (newPassword !== undefined && newPassword !== null && newPassword !== "") {
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: "Senha deve ter no mínimo 8 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build auth.users update payload
    const authUpdate: Record<string, unknown> = {};
    if (email) authUpdate.email = email;
    if (newPassword && newPassword.length >= 8) authUpdate.password = newPassword;
    if (fullName) authUpdate.user_metadata = { full_name: fullName };

    if (Object.keys(authUpdate).length > 0) {
      const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);
      if (authUpdateErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao atualizar autenticação: ${authUpdateErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profiles
    const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fullName) profileUpdate.full_name = fullName;
    if (email) profileUpdate.email = email;

    if (Object.keys(profileUpdate).length > 1) {
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", userId);

      if (profileErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao atualizar perfil: ${profileErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update role
    if (role) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleErr) {
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao atualizar perfil de acesso: ${roleErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sync professors.full_name if role is professor and name changed
      if (fullName && role === "professor") {
        await supabaseAdmin
          .from("professors")
          .update({ full_name: fullName })
          .eq("user_id", userId);
      }
    } else if (fullName) {
      // Even without role change, sync professors.full_name when applicable
      await supabaseAdmin
        .from("professors")
        .update({ full_name: fullName })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("update-user error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
