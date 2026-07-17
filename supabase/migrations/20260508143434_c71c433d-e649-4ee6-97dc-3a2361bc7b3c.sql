CREATE TABLE IF NOT EXISTS public.professor_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  reason text NOT NULL,
  changed_by_user_id uuid,
  changed_by_user_name text,
  changed_by_user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_status_hist_prof ON public.professor_status_history(professor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prof_status_hist_org ON public.professor_status_history(organization_id, created_at DESC);

ALTER TABLE public.professor_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view status history of their org"
ON public.professor_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = professor_status_history.organization_id
      AND ur.role IN ('admin','coordenador','rh')
  )
);

CREATE POLICY "Managers can insert status history of their org"
ON public.professor_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = professor_status_history.organization_id
      AND ur.role IN ('admin','coordenador','rh')
  )
);