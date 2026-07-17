CREATE TABLE public.folha_ponto_generated_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  school_id uuid NOT NULL,
  turno text NOT NULL,
  year int NOT NULL,
  month int NOT NULL,
  signature text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid
);

CREATE UNIQUE INDEX folha_ponto_generated_log_uniq
  ON public.folha_ponto_generated_log (organization_id, professor_id, school_id, turno, year, month);

CREATE INDEX folha_ponto_generated_log_org_period_idx
  ON public.folha_ponto_generated_log (organization_id, year, month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_ponto_generated_log TO authenticated;
GRANT ALL ON public.folha_ponto_generated_log TO service_role;

ALTER TABLE public.folha_ponto_generated_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpgl_select_same_org"
ON public.folha_ponto_generated_log FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "fpgl_insert_managers_or_self"
ON public.folha_ponto_generated_log FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coordenador')
    OR public.has_role(auth.uid(), 'rh')
    OR professor_id IN (SELECT id FROM public.professors WHERE id = auth.uid())
  )
);

CREATE POLICY "fpgl_update_managers_or_self"
ON public.folha_ponto_generated_log FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'coordenador')
    OR public.has_role(auth.uid(), 'rh')
    OR professor_id IN (SELECT id FROM public.professors WHERE id = auth.uid())
  )
);

CREATE POLICY "fpgl_delete_admin"
ON public.folha_ponto_generated_log FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);