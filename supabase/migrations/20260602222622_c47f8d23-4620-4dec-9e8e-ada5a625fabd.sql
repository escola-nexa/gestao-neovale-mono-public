-- RLS para fotos de evidência das rotas (bucket route-evidence)
-- Caminho: <route_id>/<stop_id>/<in|out>-<timestamp>.<ext>

CREATE POLICY "route_evidence_select_org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'route-evidence'
  AND EXISTS (
    SELECT 1 FROM public.visit_routes vr
    WHERE vr.id::text = (storage.foldername(name))[1]
      AND vr.organization_id = public.get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "route_evidence_insert_supervisor_or_manager"
ON storage.objects FOR INSERT
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

CREATE POLICY "route_evidence_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'route-evidence'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);