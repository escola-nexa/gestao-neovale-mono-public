
CREATE TABLE IF NOT EXISTS public.professor_kanban_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL CHECK (color IN ('gray','blue','green','yellow','red','purple')),
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_kanban_labels_org ON public.professor_kanban_labels(organization_id);

ALTER TABLE public.professor_kanban_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view kanban labels"
ON public.professor_kanban_labels FOR SELECT TO authenticated
USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Managers insert kanban labels"
ON public.professor_kanban_labels FOR INSERT TO authenticated
WITH CHECK (
  public.has_organization_access(auth.uid(), organization_id)
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'coordenador'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
);

CREATE POLICY "Managers update kanban labels"
ON public.professor_kanban_labels FOR UPDATE TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'coordenador'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
)
WITH CHECK (
  public.has_organization_access(auth.uid(), organization_id)
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'coordenador'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
);

CREATE POLICY "Managers delete kanban labels"
ON public.professor_kanban_labels FOR DELETE TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'coordenador'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
);

CREATE TRIGGER update_kanban_labels_updated_at
BEFORE UPDATE ON public.professor_kanban_labels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
