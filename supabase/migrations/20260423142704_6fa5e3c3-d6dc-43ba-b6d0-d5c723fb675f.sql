-- Fix branding_settings RLS policies to use profiles.user_id instead of profiles.id
DROP POLICY IF EXISTS "Admins can insert branding" ON public.branding_settings;
DROP POLICY IF EXISTS "Admins can update branding" ON public.branding_settings;
DROP POLICY IF EXISTS "Admins can delete branding" ON public.branding_settings;
DROP POLICY IF EXISTS "Members can view their organization branding" ON public.branding_settings;

CREATE POLICY "Members can view their organization branding"
ON public.branding_settings FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert branding"
ON public.branding_settings FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update branding"
ON public.branding_settings FOR UPDATE
USING (
  is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can delete branding"
ON public.branding_settings FOR DELETE
USING (
  is_admin(auth.uid())
  AND organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);