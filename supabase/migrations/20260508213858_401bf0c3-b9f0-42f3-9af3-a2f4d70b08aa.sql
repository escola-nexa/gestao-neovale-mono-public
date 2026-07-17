
DROP POLICY IF EXISTS "Coordinators manage professor-documents storage" ON storage.objects;

CREATE POLICY "Coordinators manage professor-documents storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'professor-documents'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'coordenador'::app_role, 'rh'::app_role])
  )
)
WITH CHECK (
  bucket_id = 'professor-documents'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT user_roles.organization_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin'::app_role, 'coordenador'::app_role, 'rh'::app_role])
  )
);
