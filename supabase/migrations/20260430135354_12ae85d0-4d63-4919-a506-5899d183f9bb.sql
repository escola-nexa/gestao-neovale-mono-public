-- Tabela de estado do Kanban de Professores (overrides manuais + descrição + etiquetas)
CREATE TABLE IF NOT EXISTS public.professor_kanban_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL UNIQUE REFERENCES public.professors(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  manual_column text NULL CHECK (manual_column IS NULL OR manual_column IN ('awaiting_link','link_sent','in_progress','completed')),
  description text NULL,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_moved_by uuid NULL,
  last_moved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professor_kanban_state_org ON public.professor_kanban_state(organization_id);
CREATE INDEX IF NOT EXISTS idx_professor_kanban_state_professor ON public.professor_kanban_state(professor_id);

ALTER TABLE public.professor_kanban_state ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro da organização vê (gestores precisam do quadro;
-- professor vê apenas o próprio registro pelo filtro adicional).
CREATE POLICY "Org members can view professor kanban state"
ON public.professor_kanban_state
FOR SELECT
TO authenticated
USING (public.has_organization_access(auth.uid(), organization_id));

-- INSERT/UPDATE/DELETE: apenas admin, coordenador ou RH da mesma organização.
CREATE POLICY "Managers can insert professor kanban state"
ON public.professor_kanban_state
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_organization_access(auth.uid(), organization_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "Managers can update professor kanban state"
ON public.professor_kanban_state
FOR UPDATE
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
)
WITH CHECK (
  public.has_organization_access(auth.uid(), organization_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);

CREATE POLICY "Managers can delete professor kanban state"
ON public.professor_kanban_state
FOR DELETE
TO authenticated
USING (
  public.has_organization_access(auth.uid(), organization_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'coordenador'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  )
);

-- Trigger updated_at
CREATE TRIGGER update_professor_kanban_state_updated_at
BEFORE UPDATE ON public.professor_kanban_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();