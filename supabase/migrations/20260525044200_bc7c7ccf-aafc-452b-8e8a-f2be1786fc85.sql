-- Garantir que o bucket existe e é privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-substitutions', 'teacher-substitutions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Limpar políticas antigas com mesmo nome (idempotente)
DROP POLICY IF EXISTS "tsr_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "tsr_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "tsr_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "tsr_storage_delete" ON storage.objects;

-- Estrutura de path esperada: <organization_id>/<substitution_request_id>/<filename>
-- Leitura: usuários autenticados da mesma organização
CREATE POLICY "tsr_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = public.get_user_organization_id(auth.uid())::text
);

-- Insert: autenticado da mesma organização
CREATE POLICY "tsr_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = public.get_user_organization_id(auth.uid())::text
);

-- Update: gestores ou dono do upload
CREATE POLICY "tsr_storage_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = public.get_user_organization_id(auth.uid())::text
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR owner = auth.uid()
  )
);

-- Delete: somente admin/RH/coordenação
CREATE POLICY "tsr_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'teacher-substitutions'
  AND (storage.foldername(name))[1] = public.get_user_organization_id(auth.uid())::text
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
  )
);