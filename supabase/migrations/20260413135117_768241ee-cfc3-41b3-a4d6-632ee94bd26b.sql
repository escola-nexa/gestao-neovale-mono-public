
-- 1. Fix evidence storage: drop ALL existing SELECT policies and recreate
DROP POLICY IF EXISTS "Users can view evidences" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view evidences" ON storage.objects;
CREATE POLICY "Auth users can view evidences"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidences');

-- 2. Fix boletins-pdf: remove overly broad policy
DROP POLICY IF EXISTS "Authenticated users can download boletim PDFs" ON storage.objects;

-- 3. Fix notifications INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications or coordinators can insert for others" ON public.notifications;
CREATE POLICY "Restricted notification inserts"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordenador')
      AND ur.organization_id = organization_id
  )
);

-- 4. Fix external_links: restrict to coordinators/admins
DROP POLICY IF EXISTS "Admin and coordinators can manage links" ON public.external_links;
DROP POLICY IF EXISTS "Coordinators and admins can manage links" ON public.external_links;
CREATE POLICY "Coord and admin manage links"
ON public.external_links FOR ALL
TO authenticated
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- 5. Fix school-monitoring storage: add org-scoped folder checks
DROP POLICY IF EXISTS "Authenticated users can upload monitoring files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update monitoring files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete monitoring files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload monitoring files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update monitoring files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete monitoring files" ON storage.objects;

CREATE POLICY "Org scoped upload monitoring"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-monitoring'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org scoped update monitoring"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-monitoring'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org scoped delete monitoring"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-monitoring'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()
  )
);
