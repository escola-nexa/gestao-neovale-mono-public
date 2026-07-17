-- =============================================================
-- MÓDULO 1: CALENDÁRIO ACADÊMICO
-- =============================================================

-- Enum para tipo de evento do calendário
CREATE TYPE public.calendar_event_type AS ENUM ('LETIVO', 'FERIADO', 'RECESSO', 'EVENTO');

-- Enum para status do calendário
CREATE TYPE public.calendar_status AS ENUM ('ACTIVE', 'INACTIVE');

-- Enum para status de ocorrência de aula
CREATE TYPE public.occurrence_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- Enum para tipo de pré-planejamento
CREATE TYPE public.pre_planning_type AS ENUM ('MENSAL', 'BIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- Enum para status do planejamento do professor
CREATE TYPE public.teacher_planning_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- Enum para tipo de assinatura
CREATE TYPE public.signature_type AS ENUM ('PROFESSOR', 'COORDINATOR');

-- Enum para dia da semana
CREATE TYPE public.weekday AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA');

-- Enum para perfil de usuário (app_role)
CREATE TYPE public.app_role AS ENUM ('admin', 'coordenador', 'professor');

-- Tabela de organizations (multi-tenancy)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles do usuário (separada de profiles para segurança)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);

-- Tabela de profiles do usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de calendário acadêmico
CREATE TABLE public.academic_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.calendar_status NOT NULL DEFAULT 'INACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, academic_year)
);

-- Tabela de bimestres (exatamente 4 por calendário)
CREATE TABLE public.academic_bimesters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.academic_calendars(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1 AND number <= 4),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, number)
);

-- Tabela de eventos do calendário
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.academic_calendars(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type public.calendar_event_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================================
-- MÓDULO 2: PLANEJAMENTO ANUAL (AGENDA REAL)
-- =============================================================

-- Tabela de modelo semanal do professor
CREATE TABLE public.weekly_teaching_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  course_id UUID NOT NULL,
  class_group_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  weekday public.weekday NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.calendar_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ocorrências de aula (geradas a partir do modelo semanal)
CREATE TABLE public.annual_class_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  weekly_model_id UUID NOT NULL REFERENCES public.weekly_teaching_models(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.occurrence_status NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================================
-- MÓDULO 3: PLANEJAMENTO MENSAL DE ENSINO
-- =============================================================

-- Tabela de pré-planejamento (coordenador)
CREATE TABLE public.pre_plannings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  planning_type public.pre_planning_type NOT NULL,
  bimester_number INTEGER CHECK (bimester_number >= 1 AND bimester_number <= 4),
  reference_month INTEGER CHECK (reference_month >= 1 AND reference_month <= 12),
  reference_year INTEGER NOT NULL,
  -- 8 campos pedagógicos obrigatórios
  objective TEXT NOT NULL,
  competencies TEXT NOT NULL,
  contents TEXT NOT NULL,
  methodology TEXT NOT NULL,
  resources TEXT NOT NULL,
  evaluation TEXT NOT NULL,
  product TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de planejamento do professor
CREATE TABLE public.teacher_plannings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pre_planning_id UUID REFERENCES public.pre_plannings(id) ON DELETE SET NULL,
  occurrence_id UUID REFERENCES public.annual_class_occurrences(id) ON DELETE SET NULL,
  status public.teacher_planning_status NOT NULL DEFAULT 'DRAFT',
  -- 8 campos pedagógicos obrigatórios
  objective TEXT NOT NULL,
  competencies TEXT NOT NULL,
  contents TEXT NOT NULL,
  methodology TEXT NOT NULL,
  resources TEXT NOT NULL,
  evaluation TEXT NOT NULL,
  product TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  -- Campos de revisão
  coordinator_feedback TEXT,
  rejection_reason TEXT,
  -- Flags de assinatura
  professor_signed BOOLEAN NOT NULL DEFAULT false,
  coordinator_signed BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de assinaturas digitais
CREATE TABLE public.digital_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.teacher_plannings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_type public.signature_type NOT NULL,
  photo_url TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  ip_address TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (planning_id, signature_type)
);

-- =============================================================
-- FUNÇÕES AUXILIARES (Security Definer)
-- =============================================================

-- Função para verificar se usuário é admin em alguma organização
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role = 'admin'
  )
$$;

-- Função para verificar se usuário é coordenador em uma organização
CREATE OR REPLACE FUNCTION public.is_coordinator(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role IN ('coordenador', 'admin')
  )
$$;

-- Função para verificar se usuário é professor em uma organização
CREATE OR REPLACE FUNCTION public.is_professor(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role = 'professor'
  )
$$;

-- Função para verificar acesso à organização
CREATE OR REPLACE FUNCTION public.has_organization_access(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND organization_id = org_uuid
  )
$$;

-- Função para verificar se é o único calendário ativo
CREATE OR REPLACE FUNCTION public.check_single_active_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    -- Desativa outros calendários ativos da mesma organização
    UPDATE public.academic_calendars 
    SET status = 'INACTIVE', updated_at = now()
    WHERE organization_id = NEW.organization_id 
    AND id != NEW.id 
    AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para garantir apenas um calendário ativo por organização
CREATE TRIGGER ensure_single_active_calendar
  BEFORE INSERT OR UPDATE ON public.academic_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_active_calendar();

-- Função para verificar conflito de horário do professor
CREATE OR REPLACE FUNCTION public.check_professor_schedule_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.weekly_teaching_models
    WHERE professor_id = NEW.professor_id
    AND weekday = NEW.weekday
    AND status = 'ACTIVE'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de horário: Professor já possui aula neste horário';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para verificar conflito de horário
CREATE TRIGGER check_schedule_conflict
  BEFORE INSERT OR UPDATE ON public.weekly_teaching_models
  FOR EACH ROW
  EXECUTE FUNCTION public.check_professor_schedule_conflict();

-- Função para validar bimestres não sobrepostos
CREATE OR REPLACE FUNCTION public.check_bimester_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.academic_bimesters
    WHERE calendar_id = NEW.calendar_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_date >= start_date AND NEW.start_date <= end_date)
      OR (NEW.end_date >= start_date AND NEW.end_date <= end_date)
      OR (NEW.start_date <= start_date AND NEW.end_date >= end_date)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de datas: Bimestres não podem se sobrepor';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para verificar sobreposição de bimestres
CREATE TRIGGER check_bimester_dates
  BEFORE INSERT OR UPDATE ON public.academic_bimesters
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bimester_overlap();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers de updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_calendars_updated_at
  BEFORE UPDATE ON public.academic_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_teaching_models_updated_at
  BEFORE UPDATE ON public.weekly_teaching_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_annual_class_occurrences_updated_at
  BEFORE UPDATE ON public.annual_class_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pre_plannings_updated_at
  BEFORE UPDATE ON public.pre_plannings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_plannings_updated_at
  BEFORE UPDATE ON public.teacher_plannings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- Enable RLS em todas as tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_bimesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_teaching_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_class_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;

-- Policies para organizations
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (public.has_organization_access(auth.uid(), id));

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policies para user_roles
CREATE POLICY "Users can view roles in their organizations" ON public.user_roles
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid()) OR 
    (public.is_coordinator(auth.uid(), organization_id) AND role IN ('professor', 'coordenador'))
  );

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Policies para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies para academic_calendars
CREATE POLICY "Users can view calendars of their organizations" ON public.academic_calendars
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins can manage calendars" ON public.academic_calendars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND organization_id = academic_calendars.organization_id 
      AND role = 'admin'
    )
  );

-- Policies para academic_bimesters
CREATE POLICY "Users can view bimesters" ON public.academic_bimesters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academic_calendars ac
      WHERE ac.id = academic_bimesters.calendar_id
      AND public.has_organization_access(auth.uid(), ac.organization_id)
    )
  );

CREATE POLICY "Admins can manage bimesters" ON public.academic_bimesters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.academic_calendars ac
      JOIN public.user_roles ur ON ur.organization_id = ac.organization_id
      WHERE ac.id = academic_bimesters.calendar_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Policies para calendar_events
CREATE POLICY "Users can view calendar events" ON public.calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.academic_calendars ac
      WHERE ac.id = calendar_events.calendar_id
      AND public.has_organization_access(auth.uid(), ac.organization_id)
    )
  );

CREATE POLICY "Admins can manage calendar events" ON public.calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.academic_calendars ac
      JOIN public.user_roles ur ON ur.organization_id = ac.organization_id
      WHERE ac.id = calendar_events.calendar_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Policies para weekly_teaching_models
CREATE POLICY "Users can view teaching models of their organizations" ON public.weekly_teaching_models
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage teaching models" ON public.weekly_teaching_models
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view own teaching models" ON public.weekly_teaching_models
  FOR SELECT USING (professor_id = auth.uid());

-- Policies para annual_class_occurrences
CREATE POLICY "Users can view occurrences of their organizations" ON public.annual_class_occurrences
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins and coordinators can manage occurrences" ON public.annual_class_occurrences
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id));

-- Policies para pre_plannings
CREATE POLICY "Users can view pre-plannings of their organizations" ON public.pre_plannings
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Coordinators can manage pre-plannings" ON public.pre_plannings
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id));

-- Policies para teacher_plannings
CREATE POLICY "Professors can view own plannings" ON public.teacher_plannings
  FOR SELECT USING (professor_id = auth.uid());

CREATE POLICY "Coordinators can view all plannings in their org" ON public.teacher_plannings
  FOR SELECT USING (public.is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can create own plannings" ON public.teacher_plannings
  FOR INSERT WITH CHECK (professor_id = auth.uid() AND public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Professors can update own draft plannings" ON public.teacher_plannings
  FOR UPDATE USING (professor_id = auth.uid() AND status IN ('DRAFT', 'REJECTED'));

CREATE POLICY "Coordinators can update plannings for approval" ON public.teacher_plannings
  FOR UPDATE USING (public.is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can delete own draft plannings" ON public.teacher_plannings
  FOR DELETE USING (professor_id = auth.uid() AND status = 'DRAFT');

-- Policies para digital_signatures
CREATE POLICY "Users can view signatures of their plannings" ON public.digital_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teacher_plannings tp
      WHERE tp.id = digital_signatures.planning_id
      AND (tp.professor_id = auth.uid() OR public.is_coordinator(auth.uid(), tp.organization_id))
    )
  );

CREATE POLICY "Users can create their own signatures" ON public.digital_signatures
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================================
-- STORAGE BUCKET PARA FOTOS DE ASSINATURA
-- =============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Policies para o bucket de assinaturas
CREATE POLICY "Users can upload their own signature photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view signature photos they have access to" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'signatures' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.digital_signatures ds
        JOIN public.teacher_plannings tp ON tp.id = ds.planning_id
        WHERE ds.photo_url LIKE '%' || storage.objects.name
        AND public.is_coordinator(auth.uid(), tp.organization_id)
      )
    )
  );

-- =============================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(organization_id);
CREATE INDEX idx_academic_calendars_org_year ON public.academic_calendars(organization_id, academic_year);
CREATE INDEX idx_academic_calendars_status ON public.academic_calendars(status);
CREATE INDEX idx_academic_bimesters_calendar ON public.academic_bimesters(calendar_id);
CREATE INDEX idx_calendar_events_calendar_date ON public.calendar_events(calendar_id, event_date);
CREATE INDEX idx_weekly_models_professor ON public.weekly_teaching_models(professor_id);
CREATE INDEX idx_weekly_models_org ON public.weekly_teaching_models(organization_id);
CREATE INDEX idx_occurrences_model ON public.annual_class_occurrences(weekly_model_id);
CREATE INDEX idx_occurrences_date ON public.annual_class_occurrences(occurrence_date);
CREATE INDEX idx_pre_plannings_org ON public.pre_plannings(organization_id);
CREATE INDEX idx_teacher_plannings_professor ON public.teacher_plannings(professor_id);
CREATE INDEX idx_teacher_plannings_status ON public.teacher_plannings(status);
CREATE INDEX idx_digital_signatures_planning ON public.digital_signatures(planning_id);