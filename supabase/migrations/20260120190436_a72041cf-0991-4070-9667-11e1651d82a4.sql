
-- Create professor status enum
CREATE TYPE public.professor_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- Create professor binding status enum
CREATE TYPE public.binding_status AS ENUM ('ACTIVE', 'INACTIVE');

-- ============================================
-- TABLE: professors (perfil acadêmico)
-- ============================================
CREATE TABLE public.professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  registration_code VARCHAR(50),
  phone VARCHAR(20),
  specialization VARCHAR(255),
  status professor_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- CPF unique per tenant
  CONSTRAINT professors_cpf_org_unique UNIQUE (organization_id, cpf)
);

-- ============================================
-- TABLE: professor_school_courses (vínculos operacionais)
-- ============================================
CREATE TABLE public.professor_school_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status binding_status NOT NULL DEFAULT 'ACTIVE',
  is_coordinator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique binding per professor/school/course
  CONSTRAINT professor_school_course_unique UNIQUE (professor_id, school_id, course_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_professors_organization ON public.professors(organization_id);
CREATE INDEX idx_professors_user ON public.professors(user_id);
CREATE INDEX idx_professors_status ON public.professors(status) WHERE deleted_at IS NULL;

CREATE INDEX idx_professor_school_courses_professor ON public.professor_school_courses(professor_id);
CREATE INDEX idx_professor_school_courses_school ON public.professor_school_courses(school_id);
CREATE INDEX idx_professor_school_courses_course ON public.professor_school_courses(course_id);
CREATE INDEX idx_professor_school_courses_status ON public.professor_school_courses(status);

-- ============================================
-- TRIGGER: update_updated_at
-- ============================================
CREATE TRIGGER update_professors_updated_at
  BEFORE UPDATE ON public.professors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES: professors
-- ============================================
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view professors in their organization"
  ON public.professors
  FOR SELECT
  USING (has_organization_access(auth.uid(), organization_id) AND deleted_at IS NULL);

CREATE POLICY "Admins and coordinators can manage professors"
  ON public.professors
  FOR ALL
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view own profile"
  ON public.professors
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Professors can update own profile"
  ON public.professors
  FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ============================================
-- RLS POLICIES: professor_school_courses
-- ============================================
ALTER TABLE public.professor_school_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bindings in their organization"
  ON public.professor_school_courses
  FOR SELECT
  USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage bindings"
  ON public.professor_school_courses
  FOR ALL
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view own bindings"
  ON public.professor_school_courses
  FOR SELECT
  USING (professor_id IN (SELECT id FROM public.professors WHERE user_id = auth.uid()));

-- ============================================
-- FUNCTION: Validate professor context for pedagogical actions
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_professor_context(
  _professor_id UUID,
  _school_id UUID,
  _course_id UUID,
  _class_group_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _binding_exists BOOLEAN;
  _class_valid BOOLEAN;
BEGIN
  -- Check if professor has active binding for school + course
  SELECT EXISTS (
    SELECT 1 FROM public.professor_school_courses
    WHERE professor_id = _professor_id
      AND school_id = _school_id
      AND course_id = _course_id
      AND status = 'ACTIVE'
  ) INTO _binding_exists;
  
  IF NOT _binding_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if class_group belongs to the same school and course
  SELECT EXISTS (
    SELECT 1 FROM public.class_groups
    WHERE id = _class_group_id
      AND school_id = _school_id
      AND course_id = _course_id
  ) INTO _class_valid;
  
  RETURN _class_valid;
END;
$$;

-- ============================================
-- FUNCTION: Get professor's valid schools
-- ============================================
CREATE OR REPLACE FUNCTION public.get_professor_schools(_professor_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT school_id
  FROM public.professor_school_courses
  WHERE professor_id = _professor_id
    AND status = 'ACTIVE';
$$;

-- ============================================
-- FUNCTION: Get professor's valid courses for a school
-- ============================================
CREATE OR REPLACE FUNCTION public.get_professor_courses(_professor_id UUID, _school_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT course_id
  FROM public.professor_school_courses
  WHERE professor_id = _professor_id
    AND school_id = _school_id
    AND status = 'ACTIVE';
$$;
