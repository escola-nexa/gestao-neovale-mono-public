-- Drop existing overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own ticket attachments" ON storage.objects;

-- Scoped upload policy: user must belong to the organization (first folder segment)
CREATE POLICY "Org-scoped upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Scoped read policy: user must belong to the organization
CREATE POLICY "Org-scoped view ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

-- Scoped delete policy: user must belong to the organization
CREATE POLICY "Org-scoped delete ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);