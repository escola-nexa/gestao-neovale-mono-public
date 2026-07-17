
CREATE TABLE public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Neovale',
  subtitle TEXT NOT NULL DEFAULT 'Gestão Acadêmica',
  logo_url TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organization branding"
ON public.branding_settings FOR SELECT
TO authenticated
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert branding"
ON public.branding_settings FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can update branding"
ON public.branding_settings FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete branding"
ON public.branding_settings FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TRIGGER trg_branding_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding assets are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));
