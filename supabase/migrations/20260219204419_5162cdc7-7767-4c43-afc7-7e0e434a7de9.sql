
-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  professor_id UUID NOT NULL REFERENCES public.professors(id),
  occurrence_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('P', 'F', 'A')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_group_id, subject_id, student_id, occurrence_date)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Coordinators/Admins can manage all attendance records
CREATE POLICY "Coordinators can manage attendance"
ON public.attendance_records
FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- Professors can view attendance for their classes
CREATE POLICY "Professors can view attendance for their classes"
ON public.attendance_records
FOR SELECT
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    JOIN public.weekly_teaching_models wtm ON wtm.professor_id = p.id
    WHERE p.user_id = auth.uid()
      AND wtm.class_group_id = attendance_records.class_group_id
      AND wtm.subject_id = attendance_records.subject_id
      AND wtm.status = 'ACTIVE'
  )
);

-- Professors can insert attendance for their classes
CREATE POLICY "Professors can insert attendance for their classes"
ON public.attendance_records
FOR INSERT
WITH CHECK (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = attendance_records.professor_id
      AND p.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    WHERE wtm.professor_id = attendance_records.professor_id
      AND wtm.class_group_id = attendance_records.class_group_id
      AND wtm.subject_id = attendance_records.subject_id
      AND wtm.status = 'ACTIVE'
  )
);

-- Professors can update their own attendance records
CREATE POLICY "Professors can update their own attendance"
ON public.attendance_records
FOR UPDATE
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = attendance_records.professor_id
      AND p.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_attendance_records_lookup 
ON public.attendance_records(class_group_id, subject_id, occurrence_date);

CREATE INDEX idx_attendance_records_student 
ON public.attendance_records(student_id, subject_id);
