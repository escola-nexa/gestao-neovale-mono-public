// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

interface Pt { lat: number; lng: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!LOVABLE_API_KEY || !GMAPS_KEY) throw new Error("Credenciais Google Maps ausentes");

    const { points } = await req.json() as { points: Pt[] };
    if (!Array.isArray(points) || points.length < 2) {
      return new Response(JSON.stringify({ error: "points >= 2" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (points.length > 26) {
      return new Response(JSON.stringify({ error: "Máx 26 pontos por chamada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      origins: points.map(p => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } })),
      destinations: points.map(p => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
    };

    const res = await fetch(`${GATEWAY}/routes/distanceMatrix/v2:computeRouteMatrix`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAPS_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Routes API ${res.status}: ${text}`);
    }
    const rows = await res.json() as any[];

    const n = points.length;
    const km = Array.from({ length: n }, () => Array(n).fill(0));
    const min = Array.from({ length: n }, () => Array(n).fill(0));
    for (const r of rows) {
      if (r.condition && r.condition !== "ROUTE_EXISTS") continue;
      const o = r.originIndex, d = r.destinationIndex;
      km[o][d] = (r.distanceMeters ?? 0) / 1000;
      const durStr = (r.duration ?? "0s").toString().replace("s", "");
      min[o][d] = Math.round(parseFloat(durStr) / 60);
    }

    return new Response(JSON.stringify({ km, min }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
