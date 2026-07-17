-- Create Orientations table
CREATE TABLE IF NOT EXISTS public.orientations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  professor_id uuid REFERENCES public.professors(id) NOT NULL,
  school_id uuid REFERENCES public.schools(id),
  course_id uuid REFERENCES public.courses(id),
  subject_id uuid REFERENCES public.subjects(id),
  planning_slot_id uuid REFERENCES public.weekly_teaching_models(id),
  
  orientation_type text NOT NULL,
  scheduling_notes text,
  description text,
  evidence_urls text[],
  
  status text DEFAULT 'REALIZADO' CHECK (status IN ('AGENDADO', 'REALIZADO', 'CANCELADO')),
  created_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- RLS Policies
ALTER TABLE public.orientations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators can manage orientations"
ON public.orientations
FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view their orientations"
ON public.orientations
FOR SELECT
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
);
