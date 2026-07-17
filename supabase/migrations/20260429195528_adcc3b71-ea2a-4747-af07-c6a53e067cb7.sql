-- ===== ENUMS =====
DO $$ BEGIN
  CREATE TYPE public.ucp_type AS ENUM ('UCP1', 'UCP2', 'UCP3', 'PEDAGOGICA', 'OUTRA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_period AS ENUM ('MANHA', 'TARDE', 'NOITE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_plan_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_item_origin AS ENUM ('SUGERIDO', 'MANUAL', 'INDICADO_ESCOLA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_item_status AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'PUBLICADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== HR SETTINGS =====
CREATE TABLE public.hr_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teto_ch_semanal INTEGER NOT NULL DEFAULT 20 CHECK (teto_ch_semanal > 0 AND teto_ch_semanal <= 60),
  default_ucp1_aulas INTEGER NOT NULL DEFAULT 2,
  default_ucp2_aulas INTEGER NOT NULL DEFAULT 4,
  default_ucp3_aulas INTEGER NOT NULL DEFAULT 2,
  default_pedagogica_aulas INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

-- ===== UCP OVERRIDES =====
CREATE TABLE public.hr_subject_ucp_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  ucp_type public.ucp_type NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id)
);
CREATE INDEX idx_hr_ucp_overrides_org ON public.hr_subject_ucp_overrides(organization_id);

-- ===== ALLOCATION PLANS =====
CREATE TABLE public.hr_allocation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  periodo public.hr_period NOT NULL,
  ano_letivo TEXT NOT NULL,
  qtd_turmas INTEGER NOT NULL CHECK (qtd_turmas > 0 AND qtd_turmas <= 50),
  teto_ch_semanal INTEGER NOT NULL DEFAULT 20,
  status public.hr_plan_status NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  created_by UUID,
  published_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_plans_org ON public.hr_allocation_plans(organization_id);
CREATE INDEX idx_hr_plans_school ON public.hr_allocation_plans(school_id);
CREATE INDEX idx_hr_plans_status ON public.hr_allocation_plans(status);

-- ===== ALLOCATION ITEMS =====
CREATE TABLE public.hr_allocation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.hr_allocation_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  vaga_label TEXT,
  ucp_type public.ucp_type NOT NULL DEFAULT 'OUTRA',
  aulas INTEGER NOT NULL DEFAULT 0,
  weekday TEXT,
  school_time_slot_id UUID REFERENCES public.school_time_slots(id) ON DELETE SET NULL,
  origem public.hr_item_origin NOT NULL DEFAULT 'SUGERIDO',
  status public.hr_item_status NOT NULL DEFAULT 'PENDENTE',
  indicado_por_external_link_id UUID REFERENCES public.external_links(id) ON DELETE SET NULL,
  indicado_por_nome TEXT,
  motivo_recusa TEXT,
  weekly_teaching_model_id UUID REFERENCES public.weekly_teaching_models(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_items_plan ON public.hr_allocation_items(plan_id);
CREATE INDEX idx_hr_items_org ON public.hr_allocation_items(organization_id);
CREATE INDEX idx_hr_items_professor ON public.hr_allocation_items(professor_id) WHERE professor_id IS NOT NULL;
CREATE INDEX idx_hr_items_status ON public.hr_allocation_items(status);

-- ===== TRIGGERS for updated_at =====
CREATE TRIGGER trg_hr_settings_updated_at
  BEFORE UPDATE ON public.hr_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_hr_ucp_overrides_updated_at
  BEFORE UPDATE ON public.hr_subject_ucp_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_hr_plans_updated_at
  BEFORE UPDATE ON public.hr_allocation_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_hr_items_updated_at
  BEFORE UPDATE ON public.hr_allocation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== HELPER: get caller organization ids =====
-- Reutilizamos has_role + user_roles que já existem no projeto.

-- ===== RLS =====
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_subject_ucp_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_allocation_items ENABLE ROW LEVEL SECURITY;

-- helper inline: caller é manager (admin/coord/rh) na organização?
CREATE OR REPLACE FUNCTION public.is_hr_manager(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = _org_id
      AND ur.role IN ('admin', 'coordenador', 'rh')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_hr_admin(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = _org_id
      AND ur.role = 'admin'
  )
$$;

-- ===== POLICIES: hr_settings =====
CREATE POLICY "HR settings: managers read"
  ON public.hr_settings FOR SELECT
  USING (public.is_hr_manager(organization_id));

CREATE POLICY "HR settings: admin insert"
  ON public.hr_settings FOR INSERT
  WITH CHECK (public.is_hr_admin(organization_id));

CREATE POLICY "HR settings: admin update"
  ON public.hr_settings FOR UPDATE
  USING (public.is_hr_admin(organization_id))
  WITH CHECK (public.is_hr_admin(organization_id));

CREATE POLICY "HR settings: admin delete"
  ON public.hr_settings FOR DELETE
  USING (public.is_hr_admin(organization_id));

-- ===== POLICIES: hr_subject_ucp_overrides =====
CREATE POLICY "HR ucp overrides: managers read"
  ON public.hr_subject_ucp_overrides FOR SELECT
  USING (public.is_hr_manager(organization_id));

CREATE POLICY "HR ucp overrides: admin write"
  ON public.hr_subject_ucp_overrides FOR ALL
  USING (public.is_hr_admin(organization_id))
  WITH CHECK (public.is_hr_admin(organization_id));

-- ===== POLICIES: hr_allocation_plans =====
CREATE POLICY "HR plans: managers all"
  ON public.hr_allocation_plans FOR ALL
  USING (public.is_hr_manager(organization_id))
  WITH CHECK (public.is_hr_manager(organization_id));

-- ===== POLICIES: hr_allocation_items =====
CREATE POLICY "HR items: managers all"
  ON public.hr_allocation_items FOR ALL
  USING (public.is_hr_manager(organization_id))
  WITH CHECK (public.is_hr_manager(organization_id));

CREATE POLICY "HR items: professor reads own published"
  ON public.hr_allocation_items FOR SELECT
  USING (
    status = 'PUBLICADO'
    AND professor_id IS NOT NULL
    AND professor_id IN (
      SELECT p.id FROM public.professors p WHERE p.user_id = auth.uid()
    )
  );