-- Corrige policies do bucket library-content para considerar user_roles (admin/coord/rh) e profiles (professor)
DROP POLICY IF EXISTS "library-content org members can upload" ON storage.objects;
DROP POLICY IF EXISTS "library-content org members can view" ON storage.objects;
DROP POLICY IF EXISTS "library-content owner or manager can delete" ON storage.objects;
DROP POLICY IF EXISTS "library-content owner or manager can update" ON storage.objects;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    (SELECT organization_id FROM public.profiles WHERE id = _user_id LIMIT 1)
  );
$$;

CREATE POLICY "library-content org members can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "library-content org members can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "library-content org members can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "library-content org members can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library-content'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);