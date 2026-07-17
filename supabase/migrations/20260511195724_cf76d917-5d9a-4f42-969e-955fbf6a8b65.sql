-- Corrige policies do bucket hiring-documents.
-- Bug: usavam storage.foldername(o.name) (nome da organização) em vez do
-- nome do objeto no storage, fazendo a 1ª pasta (organization_id) nunca bater.

DROP POLICY IF EXISTS "Hiring docs: coord read"   ON storage.objects;
DROP POLICY IF EXISTS "Hiring docs: coord write"  ON storage.objects;
DROP POLICY IF EXISTS "Hiring docs: coord update" ON storage.objects;
DROP POLICY IF EXISTS "Hiring docs: coord delete" ON storage.objects;

CREATE POLICY "Hiring docs: coord read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hiring-documents'
  AND public.is_coordinator(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Hiring docs: coord write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hiring-documents'
  AND public.is_coordinator(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Hiring docs: coord update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hiring-documents'
  AND public.is_coordinator(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'hiring-documents'
  AND public.is_coordinator(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Hiring docs: coord delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hiring-documents'
  AND public.is_coordinator(auth.uid(), ((storage.foldername(name))[1])::uuid)
);