
CREATE TABLE public.professor_contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'OTHER',
  description text NOT NULL,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcl_professor_created ON public.professor_contact_logs (professor_id, created_at DESC);
CREATE INDEX idx_pcl_org ON public.professor_contact_logs (organization_id);

ALTER TABLE public.professor_contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_select_contact_logs"
ON public.professor_contact_logs FOR SELECT
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "managers_insert_contact_logs"
ON public.professor_contact_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.has_organization_access(auth.uid(), organization_id)
  AND created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "author_or_admin_update_contact_logs"
ON public.professor_contact_logs FOR UPDATE
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "author_or_admin_delete_contact_logs"
ON public.professor_contact_logs FOR DELETE
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE TRIGGER trg_pcl_updated_at
BEFORE UPDATE ON public.professor_contact_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
