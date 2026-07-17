import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "coordenador" | "professor";
}

const testUsers: TestUser[] = [
  {
    email: "goulart.bass@gmail.com",
    password: "12345678",
    fullName: "Administrador Mestre",
    role: "admin",
  },
  {
    email: "coordenador@neovale.com",
    password: "12345678",
    fullName: "Maria Coordenadora",
    role: "coordenador",
  },
  {
    email: "professor@neovale.com",
    password: "12345678",
    fullName: "João Professor",
    role: "professor",
  },
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ===== AUTHENTICATION CHECK =====
    // Require valid authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the token using anon client
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

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify calling user is an admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError || !userRoles?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - no roles found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = userRoles.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== END AUTHENTICATION CHECK =====

    // First, create or get an organization for these users
    let organizationId: string;

    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("name", "Neovale - Organização Padrão")
      .single();

    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({ name: "Neovale - Organização Padrão" })
        .select("id")
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }
      organizationId = newOrg.id;
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const testUser of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === testUser.email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          results.push({ email: testUser.email, status: "already_exists" });
        } else {
          // Create user in auth.users
          const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
            user_metadata: {
              full_name: testUser.fullName,
            },
          });

          if (createAuthError) {
            results.push({ email: testUser.email, status: "error", error: createAuthError.message });
            continue;
          }

          userId = authData.user.id;
          results.push({ email: testUser.email, status: "created" });
        }

        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingProfile) {
          // Create profile
          await supabaseAdmin.from("profiles").insert({
            user_id: userId,
            email: testUser.email,
            full_name: testUser.fullName,
            organization_id: organizationId,
          });
        }

        // Check if role exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .single();

        if (!existingRole) {
          // Assign role
          await supabaseAdmin.from("user_roles").insert({
            user_id: userId,
            organization_id: organizationId,
            role: testUser.role,
          });
        }
      } catch (userError: any) {
        results.push({ email: testUser.email, status: "error", error: userError.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: organizationId,
        users: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
