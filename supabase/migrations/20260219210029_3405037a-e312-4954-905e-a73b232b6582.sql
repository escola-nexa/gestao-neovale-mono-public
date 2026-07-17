
-- Table to store import batch metadata
CREATE TABLE public.import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  school_id uuid REFERENCES public.schools(id),
  course_id uuid REFERENCES public.courses(id),
  class_group_id uuid REFERENCES public.class_groups(id),
  ano_letivo text,
  status text NOT NULL DEFAULT 'COMPLETED',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table to store individual row results
CREATE TABLE public.import_batch_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  student_name text,
  codigo_matricula text,
  status text NOT NULL DEFAULT 'SUCCESS',
  error_message text,
  student_id uuid REFERENCES public.students(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_batches
CREATE POLICY "Coordinators can manage import batches"
  ON public.import_batches FOR ALL
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Users can view import batches in their org"
  ON public.import_batches FOR SELECT
  USING (has_organization_access(auth.uid(), organization_id));

-- RLS policies for import_batch_rows
CREATE POLICY "Users can view rows via batch org"
  ON public.import_batch_rows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.import_batches b
    WHERE b.id = import_batch_rows.batch_id
    AND has_organization_access(auth.uid(), b.organization_id)
  ));

-- Index for performance
CREATE INDEX idx_import_batch_rows_batch_id ON public.import_batch_rows(batch_id);
CREATE INDEX idx_import_batches_org_id ON public.import_batches(organization_id);
