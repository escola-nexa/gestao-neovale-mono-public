-- Create enum for entity status
CREATE TYPE public.entity_status AS ENUM ('ativo', 'inativo');

-- Create enum for education level
CREATE TYPE public.nivel_ensino AS ENUM ('educacao_infantil', 'fundamental_1', 'fundamental_2', 'ensino_medio', 'eja');

-- Create enum for enrollment status
CREATE TYPE public.enrollment_status AS ENUM ('ativa', 'transferida', 'cancelada');

-- Create schools table
CREATE TABLE public.schools (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL,
    cidade TEXT NOT NULL,
    endereco TEXT NOT NULL,
    diretor TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    status entity_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, codigo)
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    nivel_ensino nivel_ensino NOT NULL,
    status entity_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, codigo)
);

-- Create course_schools junction table (many-to-many)
CREATE TABLE public.course_schools (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(course_id, school_id)
);

-- Create subjects (disciplinas) table
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    carga_horaria_semanal INTEGER NOT NULL DEFAULT 1,
    status entity_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(course_id, codigo)
);

-- Create class_groups (turmas) table
CREATE TABLE public.class_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ano_letivo TEXT NOT NULL,
    status entity_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    data_nascimento DATE NOT NULL,
    codigo_matricula TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    -- Address fields
    endereco_rua TEXT,
    endereco_numero TEXT,
    endereco_bairro TEXT,
    endereco_cep TEXT,
    endereco_municipio TEXT,
    endereco_estado TEXT,
    -- Guardian fields
    nome_mae TEXT NOT NULL,
    nome_pai TEXT,
    contato_responsavel TEXT NOT NULL,
    email_responsavel TEXT,
    status entity_status NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, codigo_matricula)
);

-- Create enrollments (matriculas) table
CREATE TABLE public.enrollments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
    ano_letivo TEXT NOT NULL,
    data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
    data_encerramento DATE,
    status enrollment_status NOT NULL DEFAULT 'ativa',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools
CREATE POLICY "Users can view schools of their organization"
ON public.schools FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage schools"
ON public.schools FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for courses
CREATE POLICY "Users can view courses of their organization"
ON public.courses FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage courses"
ON public.courses FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for course_schools
CREATE POLICY "Users can view course_schools"
ON public.course_schools FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_schools.course_id
    AND has_organization_access(auth.uid(), c.organization_id)
));

CREATE POLICY "Admins and coordinators can manage course_schools"
ON public.course_schools FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_schools.course_id
    AND is_coordinator(auth.uid(), c.organization_id)
));

-- RLS Policies for subjects
CREATE POLICY "Users can view subjects of their organization"
ON public.subjects FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage subjects"
ON public.subjects FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for class_groups
CREATE POLICY "Users can view class_groups of their organization"
ON public.class_groups FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage class_groups"
ON public.class_groups FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for students
CREATE POLICY "Users can view students of their organization"
ON public.students FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage students"
ON public.students FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- RLS Policies for enrollments
CREATE POLICY "Users can view enrollments of their organization"
ON public.enrollments FOR SELECT
USING (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage enrollments"
ON public.enrollments FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- Create updated_at triggers
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_groups_updated_at
    BEFORE UPDATE ON public.class_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();