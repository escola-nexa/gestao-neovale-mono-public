// Cache simples (in-memory) da logo Neovale carregada via branding_settings.
// Usado por todos os geradores de PDF do frontend para garantir que a logo
// oficial apareça em TODOS os relatórios sem precisar repetir o fetch.
import { supabase } from '@/integrations/supabase/client';
import { resolveBrandLogo, type BrandLogo } from '@/lib/pdfBranding';

let cached: BrandLogo | null | undefined;
let inflight: Promise<BrandLogo | null> | null = null;

export async function getBrandLogoForPdf(): Promise<BrandLogo | null> {
  if (cached !== undefined) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from('branding_settings')
        .select('logo_url, icon_url')
        .limit(1)
        .maybeSingle();
      const logo = await resolveBrandLogo(data?.logo_url ?? null, data?.icon_url ?? null);
      cached = logo;
      return logo;
    } catch {
      // Fallback final: logo bundled (resolveBrandLogo cai para o asset interno)
      const logo = await resolveBrandLogo(null, null);
      cached = logo;
      return logo;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Invalida o cache (use após o admin trocar a marca em /configuracoes/marca). */
export function invalidateBrandLogoCache(): void {
  cached = undefined;
  inflight = null;
}
