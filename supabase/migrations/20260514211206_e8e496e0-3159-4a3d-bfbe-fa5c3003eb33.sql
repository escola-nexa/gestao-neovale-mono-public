
-- PWA settings (singleton)
CREATE TABLE public.pwa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  name text NOT NULL DEFAULT 'Neovale - Gestão Acadêmica',
  short_name text NOT NULL DEFAULT 'Neovale',
  description text NOT NULL DEFAULT 'Sistema de Gestão Acadêmica',
  theme_color text NOT NULL DEFAULT '#1B1E2C',
  background_color text NOT NULL DEFAULT '#1B1E2C',
  icon_url text,
  display text NOT NULL DEFAULT 'standalone',
  orientation text NOT NULL DEFAULT 'any',
  start_url_default text NOT NULL DEFAULT '/',
  start_url_by_role jsonb NOT NULL DEFAULT '{}'::jsonb,
  shortcuts jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_menu_items_mobile jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pwa_singleton_check CHECK (singleton = true)
);

ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwa_settings_select_authenticated"
  ON public.pwa_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pwa_settings_select_anon"
  ON public.pwa_settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "pwa_settings_admin_insert"
  ON public.pwa_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pwa_settings_admin_update"
  ON public.pwa_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pwa_settings_admin_delete"
  ON public.pwa_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pwa_settings_set_updated_at
  BEFORE UPDATE ON public.pwa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default singleton row
INSERT INTO public.pwa_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- Bucket for PWA icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('pwa-assets', 'pwa-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pwa_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pwa-assets');

CREATE POLICY "pwa_assets_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pwa-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pwa_assets_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pwa-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pwa_assets_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pwa-assets' AND public.has_role(auth.uid(), 'admin'));
