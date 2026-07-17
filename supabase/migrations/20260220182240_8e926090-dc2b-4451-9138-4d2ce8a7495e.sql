
-- Table: grade_configurations
CREATE TABLE public.grade_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  class_group_id uuid NOT NULL REFERENCES public.class_groups(id),
  subject_id uuid NOT NULL REFERENCES public.subjects(id),
  professor_id uuid NOT NULL REFERENCES public.professors(id),
  bimester_number integer NOT NULL,
  average_type text NOT NULL CHECK (average_type IN ('SOMATORIA', 'ARITMETICA')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_grade_config UNIQUE (organization_id, class_group_id, subject_id, bimester_number)
);

ALTER TABLE public.grade_configurations ENABLE ROW LEVEL SECURITY;

-- Table: grade_activities
CREATE TABLE public.grade_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_config_id uuid NOT NULL REFERENCES public.grade_configurations(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL,
  max_score numeric NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grade_activities ENABLE ROW LEVEL SECURITY;

-- Table: student_grades
CREATE TABLE public.student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_activity_id uuid NOT NULL REFERENCES public.grade_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  score numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_grade UNIQUE (grade_activity_id, student_id)
);

ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_grade_configurations_updated_at
  BEFORE UPDATE ON public.grade_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_grades_updated_at
  BEFORE UPDATE ON public.student_grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: grade_configurations
CREATE POLICY "Coordinators can manage grade_configurations"
  ON public.grade_configurations FOR ALL
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can select own grade_configurations"
  ON public.grade_configurations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = grade_configurations.professor_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can insert own grade_configurations"
  ON public.grade_configurations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = grade_configurations.professor_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can update own open grade_configurations"
  ON public.grade_configurations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = grade_configurations.professor_id AND p.user_id = auth.uid()
  ));

-- RLS: grade_activities
CREATE POLICY "Coordinators can manage grade_activities"
  ON public.grade_activities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.grade_configurations gc
    WHERE gc.id = grade_activities.grade_config_id
      AND is_coordinator(auth.uid(), gc.organization_id)
  ));

CREATE POLICY "Professors can select own grade_activities"
  ON public.grade_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.grade_configurations gc
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE gc.id = grade_activities.grade_config_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can insert own grade_activities"
  ON public.grade_activities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grade_configurations gc
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE gc.id = grade_activities.grade_config_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can update own grade_activities"
  ON public.grade_activities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.grade_configurations gc
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE gc.id = grade_activities.grade_config_id AND p.user_id = auth.uid()
  ));

-- RLS: student_grades
CREATE POLICY "Coordinators can manage student_grades"
  ON public.student_grades FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.grade_activities ga
    JOIN public.grade_configurations gc ON gc.id = ga.grade_config_id
    WHERE ga.id = student_grades.grade_activity_id
      AND is_coordinator(auth.uid(), gc.organization_id)
  ));

CREATE POLICY "Professors can select own student_grades"
  ON public.student_grades FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.grade_activities ga
    JOIN public.grade_configurations gc ON gc.id = ga.grade_config_id
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE ga.id = student_grades.grade_activity_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can insert own student_grades"
  ON public.student_grades FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grade_activities ga
    JOIN public.grade_configurations gc ON gc.id = ga.grade_config_id
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE ga.id = student_grades.grade_activity_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Professors can update own student_grades"
  ON public.student_grades FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.grade_activities ga
    JOIN public.grade_configurations gc ON gc.id = ga.grade_config_id
    JOIN public.professors p ON p.id = gc.professor_id
    WHERE ga.id = student_grades.grade_activity_id AND p.user_id = auth.uid()
  ));
