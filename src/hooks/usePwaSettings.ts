import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PwaShortcut = { name: string; short_name?: string; url: string };

export interface PwaSettings {
  id: string;
  name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  icon_url: string | null;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "any" | "portrait" | "landscape";
  start_url_default: string;
  start_url_by_role: Record<string, string>;
  shortcuts: PwaShortcut[];
  hidden_menu_items_mobile: string[];
  hidden_menu_items_by_role: Partial<Record<'admin' | 'coordenador' | 'rh' | 'professor' | 'financeiro', string[]>>;
  manifest_id: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  screenshots: Array<{ src: string; sizes: string; type: string; form_factor?: 'narrow' | 'wide'; label?: string }>;
}

const KEY = ["pwa-settings"] as const;

export function usePwaSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PwaSettings | null> => {
      const { data, error } = await supabase
        .from("pwa_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PwaSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePwaSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PwaSettings>) => {
      const { data, error } = await supabase
        .from("pwa_settings")
        .update(patch as any)
        .eq("singleton", true)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
