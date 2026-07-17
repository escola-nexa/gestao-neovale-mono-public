-- Campos para rastrear desvínculo na própria tabela
ALTER TABLE public.professor_school_courses
  ADD COLUMN IF NOT EXISTS unbind_reason text,
  ADD COLUMN IF NOT EXISTS unbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS unbound_by uuid REFERENCES auth.users(id);

-- Tabela de histórico permanente
CREATE TABLE IF NOT EXISTS public.professor_unbinding_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  binding_id uuid,
  reason text NOT NULL,
  workload_morning_hours numeric(5,2) DEFAULT 0,
  workload_afternoon_hours numeric(5,2) DEFAULT 0,
  workload_night_hours numeric(5,2) DEFAULT 0,
  unbound_by uuid REFERENCES auth.users(id),
  unbound_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_history_professor ON public.professor_unbinding_history(professor_id);
CREATE INDEX IF NOT EXISTS idx_pub_history_organization ON public.professor_unbinding_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_pub_history_unbound_at ON public.professor_unbinding_history(unbound_at DESC);

ALTER TABLE public.professor_unbinding_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view unbinding history"
  ON public.professor_unbinding_history
  FOR SELECT
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Managers can insert unbinding history"
  ON public.professor_unbinding_history
  FOR INSERT
  WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- Professores também podem ver o próprio histórico
CREATE POLICY "Professors can view own unbinding history"
  ON public.professor_unbinding_history
  FOR SELECT
  USING (professor_id IN (SELECT id FROM public.professors WHERE user_id = auth.uid()));