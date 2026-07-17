import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string; email?: string };
  callerRoles: { role: string; organization_id: string }[];
  isAdmin: boolean;
  isCoordinator: boolean;
  isRh: boolean;
  supabaseAdmin: ReturnType<typeof createClient>;
}

/**
 * Shared auth middleware for Edge Functions.
 * Validates JWT token, retrieves user roles, and checks minimum required role.
 *
 * @param req - The incoming request
 * @param minRole - Minimum role required: 'admin' | 'coordenador' | 'professor'
 * @returns AuthResult on success, or a Response (error) on failure
 */
export async function requireAuth(
  req: Request,
  minRole: "admin" | "coordenador" | "professor" = "professor"
): Promise<AuthResult | Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Validate Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized - missing or invalid authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate the token
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized - invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get caller roles
  const { data: callerRoles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", user.id);

  if (rolesError || !callerRoles?.length) {
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden - no roles found" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const isAdmin = callerRoles.some((r) => r.role === "admin");
  const isCoordinator = callerRoles.some((r) => r.role === "coordenador");
  const isRh = callerRoles.some((r) => r.role === "rh");
  const isProfessor = callerRoles.some((r) => r.role === "professor");

  // Check minimum role. R.H. is treated at the same level as coordenador.
  const roleHierarchy: Record<string, number> = { professor: 1, coordenador: 2, rh: 2, admin: 3 };
  const callerMaxLevel = Math.max(
    ...callerRoles.map((r) => roleHierarchy[r.role] || 0)
  );
  const requiredLevel = roleHierarchy[minRole] || 0;

  if (callerMaxLevel < requiredLevel) {
    return new Response(
      JSON.stringify({ success: false, error: `Forbidden - ${minRole} access required` }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return {
    user: { id: user.id, email: user.email },
    callerRoles,
    isAdmin,
    isCoordinator,
    isRh,
    supabaseAdmin,
  };
}
