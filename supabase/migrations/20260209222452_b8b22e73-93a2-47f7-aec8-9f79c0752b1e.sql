
-- Table to store all coordinator feedback/return history
CREATE TABLE public.planning_feedback_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_planning_id UUID NOT NULL REFERENCES public.teacher_plannings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  coordinator_id UUID NOT NULL, -- auth.uid() of coordinator
  coordinator_name TEXT NOT NULL,
  feedback TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'DEVOLVIDO', -- DEVOLVIDO, ENVIADO, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planning_feedback_history ENABLE ROW LEVEL SECURITY;

-- Coordinators can insert and view
CREATE POLICY "Coordinators can manage feedback history"
ON public.planning_feedback_history
FOR ALL
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- Professors can view feedback on their plannings
CREATE POLICY "Professors can view feedback on their plannings"
ON public.planning_feedback_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teacher_plannings tp
    WHERE tp.id = planning_feedback_history.teacher_planning_id
    AND tp.professor_id = auth.uid()
  )
);

-- Index for fast lookup
CREATE INDEX idx_planning_feedback_history_planning_id ON public.planning_feedback_history(teacher_planning_id);
