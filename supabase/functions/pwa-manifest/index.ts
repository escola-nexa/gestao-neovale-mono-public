import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data } = await supabase
      .from("pwa_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();

    const s = data ?? {};
    const iconUrl = s.icon_url || "/nexa-logo.svg";
    const customIcons = Array.isArray(s.icons) && s.icons.length > 0 ? s.icons : null;
    const fallbackIcons = [
      { src: iconUrl, sizes: "192x192", type: iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any" },
      { src: iconUrl, sizes: "512x512", type: iconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any maskable" },
    ];

    const manifest: Record<string, unknown> = {
      id: s.manifest_id ?? "neovale-app-v1",
      name: s.name ?? "Neovale - Gestão Acadêmica",
      short_name: s.short_name ?? "Neovale",
      description: s.description ?? "Sistema de Gestão Acadêmica",
      start_url: s.start_url_default ?? "/",
      scope: "/",
      display: s.display ?? "standalone",
      orientation: s.orientation ?? "any",
      theme_color: s.theme_color ?? "#1B1E2C",
      background_color: s.background_color ?? "#1B1E2C",
      lang: "pt-BR",
      dir: "ltr",
      icons: customIcons ?? fallbackIcons,
      screenshots: Array.isArray(s.screenshots) ? s.screenshots : [],
      shortcuts: Array.isArray(s.shortcuts)
        ? s.shortcuts.slice(0, 4).map((sc: any) => ({
            name: sc.name,
            short_name: sc.short_name ?? sc.name,
            url: sc.url,
            icons: [{ src: iconUrl, sizes: "96x96" }],
          }))
        : [],
    };

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        ...cors,
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
