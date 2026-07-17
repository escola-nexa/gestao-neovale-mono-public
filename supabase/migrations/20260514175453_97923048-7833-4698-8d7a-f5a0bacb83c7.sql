
-- PACOTE B
ALTER PUBLICATION supabase_realtime DROP TABLE public.professor_documents;
ALTER PUBLICATION supabase_realtime DROP TABLE public.professor_document_files;

-- PACOTE C
DROP POLICY IF EXISTS "Managers read talent resumes" ON storage.objects;
DROP POLICY IF EXISTS "Managers upload talent resumes" ON storage.objects;
DROP POLICY IF EXISTS "Managers update talent resumes" ON storage.objects;
DROP POLICY IF EXISTS "Managers delete talent resumes" ON storage.objects;

CREATE POLICY "Talent resumes select org-scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

CREATE POLICY "Talent resumes insert org-scoped"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

CREATE POLICY "Talent resumes update org-scoped"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

CREATE POLICY "Talent resumes delete org-scoped"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'talent-pool-resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

-- PACOTE E.1
ALTER FUNCTION public._digits_only(text) SET search_path = public;
ALTER FUNCTION public.tg_chat_channels_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_incidents_updated_at() SET search_path = public;

-- PACOTE E.2: pg_net -> schema extensions (não suporta SET SCHEMA, então drop+recreate)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- PACOTE F.1
CREATE POLICY "Incident attach select org-scoped"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Incident attach insert org-scoped"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Incident attach update org-scoped"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Incident attach delete org-scoped"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT ur.organization_id::text FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'coordenador'::app_role, 'rh'::app_role)
  )
);

-- PACOTE F.2
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.external_access_logs;
CREATE POLICY "Anyone can insert valid logs"
ON public.external_access_logs FOR INSERT TO anon, authenticated
WITH CHECK (
  external_link_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.external_links el WHERE el.id = external_link_id)
);
