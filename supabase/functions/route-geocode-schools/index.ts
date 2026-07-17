// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    if (!GMAPS_KEY) throw new Error("GOOGLE_MAPS_API_KEY ausente");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { school_ids, force } = await req.json();
    if (!Array.isArray(school_ids) || !school_ids.length) {
      return new Response(JSON.stringify({ error: "school_ids vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase.from("schools")
      .select("id,nome,cidade,endereco,endereco_rua,endereco_numero,endereco_bairro,endereco_cep,lat,lng")
      .in("id", school_ids);
    const { data: schools, error } = await query;
    if (error) throw error;

    const results: any[] = [];
    for (const s of schools ?? []) {
      if (!force && s.lat != null && s.lng != null) {
        results.push({ id: s.id, lat: s.lat, lng: s.lng, cached: true });
        continue;
      }
      const addr = [
        s.endereco_rua || s.endereco,
        s.endereco_numero,
        s.endereco_bairro,
        s.cidade,
        s.endereco_cep,
        "Brasil",
      ].filter(Boolean).join(", ");
      if (!addr) {
        results.push({ id: s.id, error: "sem endereço" });
        continue;
      }
      const url = `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(addr)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GMAPS_KEY },
      });
      const json = await res.json();
      const loc = json?.results?.[0]?.geometry?.location;
      if (!loc) {
        results.push({ id: s.id, error: json?.status || "no_result" });
        continue;
      }
      await supabase.from("schools").update({
        lat: loc.lat, lng: loc.lng, geocoded_at: new Date().toISOString(),
      }).eq("id", s.id);
      results.push({ id: s.id, lat: loc.lat, lng: loc.lng });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
