
-- Create storage bucket for generated boletim PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('boletins-pdf', 'boletins-pdf', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read files from their org folder
CREATE POLICY "Users can read boletim PDFs from their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'boletins-pdf'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- Allow edge functions (service role) to insert files - no policy needed for service role
-- But allow authenticated users to also read via signed URLs
CREATE POLICY "Authenticated users can download boletim PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'boletins-pdf');
