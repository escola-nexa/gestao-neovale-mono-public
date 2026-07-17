-- 1) Restrict teacher-attendance-pdfs SELECT to user's own organization (folder[1] = org_id)
DROP POLICY IF EXISTS "Org members read attendance PDFs" ON storage.objects;

CREATE POLICY "Org members read attendance PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-attendance-pdfs'
  AND (storage.foldername(name))[1] = (public.get_user_organization_id(auth.uid()))::text
);

-- 2) Restrict professors broad SELECT to managers only (admin/coord/rh).
-- Professors keep "view own profile" policy. Fixes CPF exposure to peers.
DROP POLICY IF EXISTS "Users can view professors in their organization" ON public.professors;

CREATE POLICY "Managers can view professors in their organization"
ON public.professors
FOR SELECT
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND deleted_at IS NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);