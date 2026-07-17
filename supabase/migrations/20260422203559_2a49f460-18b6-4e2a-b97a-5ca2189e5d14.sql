CREATE TABLE public.professor_medical_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  cid_code TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pmr_professor ON public.professor_medical_reports(professor_id);
CREATE INDEX idx_pmr_org ON public.professor_medical_reports(organization_id);

ALTER TABLE public.professor_medical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators can manage medical reports"
ON public.professor_medical_reports
FOR ALL
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view own medical reports"
ON public.professor_medical_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.professors p
  WHERE p.id = professor_medical_reports.professor_id AND p.user_id = auth.uid()
));

CREATE TRIGGER trg_pmr_updated_at
BEFORE UPDATE ON public.professor_medical_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();