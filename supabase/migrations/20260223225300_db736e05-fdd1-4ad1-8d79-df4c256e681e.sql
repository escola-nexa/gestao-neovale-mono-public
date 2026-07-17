
-- Create planning templates table (one template per subject+bimester, reusable across all schools/classes)
CREATE TABLE public.planning_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  bimester_number INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  competencies TEXT NOT NULL DEFAULT '',
  contents TEXT NOT NULL DEFAULT '',
  methodology TEXT NOT NULL DEFAULT '',
  resources TEXT NOT NULL DEFAULT '',
  evaluation TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  next_steps TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, subject_id, bimester_number, week_number)
);

-- Enable RLS
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;

-- Coordinators can manage templates
CREATE POLICY "Coordinators can manage planning_templates"
ON public.planning_templates
FOR ALL
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

-- Professors can view templates for their subjects
CREATE POLICY "Professors can view planning_templates"
ON public.planning_templates
FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_planning_templates_updated_at
BEFORE UPDATE ON public.planning_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
