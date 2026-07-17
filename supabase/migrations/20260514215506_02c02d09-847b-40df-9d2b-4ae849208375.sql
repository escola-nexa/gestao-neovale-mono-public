ALTER TABLE public.pwa_settings
  ADD COLUMN IF NOT EXISTS manifest_id text NOT NULL DEFAULT 'neovale-app-v1';