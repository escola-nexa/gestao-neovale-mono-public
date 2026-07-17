
-- Create lesson_materials table
CREATE TABLE public.lesson_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL CHECK (material_type IN ('pdf', 'image', 'text', 'audio', 'video')),
  file_url TEXT,
  text_content TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Coordinators can manage lesson_materials"
ON public.lesson_materials FOR ALL
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Users can view lesson_materials in their org"
ON public.lesson_materials FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

-- Updated at trigger
CREATE TRIGGER update_lesson_materials_updated_at
BEFORE UPDATE ON public.lesson_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for lesson materials
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-materials', 'lesson-materials', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload lesson materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view lesson materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-materials');

CREATE POLICY "Authenticated users can update lesson materials"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete lesson materials"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-materials' AND auth.uid() IS NOT NULL);
