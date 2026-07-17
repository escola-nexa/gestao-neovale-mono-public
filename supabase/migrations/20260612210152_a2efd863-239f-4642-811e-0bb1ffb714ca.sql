
-- =========================================================
-- FASE A.1 — OneSignal: restringir leitura do rest_api_key a admins
-- =========================================================
DROP POLICY IF EXISTS settings_select_org ON public.onesignal_settings;

-- A policy settings_admin_all (FOR ALL) já cobre admins. Não recriamos SELECT amplo.

-- =========================================================
-- FASE A.2 — Bucket route-evidence: corrigir foldername
-- (storage.foldername(vr.name) -> storage.foldername(name) do próprio object)
-- =========================================================
DROP POLICY IF EXISTS route_evidence_insert_supervisor_or_manager ON storage.objects;
DROP POLICY IF EXISTS route_evidence_select_org ON storage.objects;

CREATE POLICY route_evidence_insert_supervisor_or_manager
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'route-evidence'
  AND EXISTS (
    SELECT 1 FROM public.visit_routes vr
    WHERE vr.id::text = (storage.foldername(name))[1]
      AND vr.organization_id = public.get_user_organization_id(auth.uid())
      AND (
        vr.supervisor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'coordenador'::app_role)
      )
  )
);

CREATE POLICY route_evidence_select_org
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'route-evidence'
  AND EXISTS (
    SELECT 1 FROM public.visit_routes vr
    WHERE vr.id::text = (storage.foldername(name))[1]
      AND vr.organization_id = public.get_user_organization_id(auth.uid())
  )
);

-- =========================================================
-- FASE B.1 — folha_ponto_generated_log: corrigir join professor
-- (professors.id = auth.uid()) é bug; o correto é professors.user_id = auth.uid()
-- =========================================================
DROP POLICY IF EXISTS fpgl_update_managers_or_self ON public.folha_ponto_generated_log;

CREATE POLICY fpgl_update_managers_or_self
ON public.folha_ponto_generated_log
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
    OR professor_id IN (
      SELECT p.id FROM public.professors p WHERE p.user_id = auth.uid()
    )
  )
);
