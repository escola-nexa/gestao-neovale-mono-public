
-- =====================================================
-- Security hardening: storage bucket scope + RLS policies
-- =====================================================

-- ---------- 1) evidences bucket ----------
-- Replace broad authenticated policies with org-scoped folder policies.
-- New uploads MUST be prefixed with `{org_id}/...`.
-- Admins retain access to any path (covers legacy files without org prefix).

DROP POLICY IF EXISTS "Authenticated users can upload evidences" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload evidences" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evidences" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete evidences" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view evidences" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update evidence files" ON storage.objects;

CREATE POLICY "evidences_select_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidences'
  AND (
    (storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "evidences_insert_org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidences'
  AND (storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
);

CREATE POLICY "evidences_update_org"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidences'
  AND (
    (storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "evidences_delete_org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'evidences'
  AND (
    ((storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
      AND (owner = auth.uid()
           OR has_role(auth.uid(), 'admin'::app_role)
           OR has_role(auth.uid(), 'coordenador'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ---------- 2) substitution-docs bucket: add role/ownership scope ----------
DROP POLICY IF EXISTS "sub_docs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "sub_docs_storage_insert" ON storage.objects;

CREATE POLICY "sub_docs_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'substitution-docs'
  AND (get_user_organization_id(auth.uid()))::text = (storage.foldername(name))[1]
  AND (
    owner = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "sub_docs_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'substitution-docs'
  AND (get_user_organization_id(auth.uid()))::text = (storage.foldername(name))[1]
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  )
);

-- ---------- 3) teacher-substitutions bucket: add role scope ----------
DROP POLICY IF EXISTS "tsr_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tsr_storage_insert" ON storage.objects;

CREATE POLICY "tsr_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
  AND (
    owner = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "tsr_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = (get_user_organization_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordenador'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  )
);

-- ---------- 4) pwa_pushed_notifications: explicit RLS policies ----------
-- Table has RLS enabled but no policies. Only admins should read it.
-- Writes happen via SECURITY DEFINER trigger / edge functions using service_role.
CREATE POLICY "pwa_pushed_notifications_admin_select"
ON public.pwa_pushed_notifications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
