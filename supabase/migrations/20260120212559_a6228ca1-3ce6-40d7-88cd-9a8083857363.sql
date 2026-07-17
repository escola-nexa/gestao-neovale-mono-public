-- ==========================================================================
-- MÓDULO: Pré-Planejamento Pedagógico - Reestruturação completa
-- ==========================================================================

-- 1. Adicionar novos campos à tabela pre_plannings
ALTER TABLE public.pre_plannings
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id),
ADD COLUMN IF NOT EXISTS class_group_id uuid REFERENCES public.class_groups(id),
ADD COLUMN IF NOT EXISTS calculated_total_classes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS calculated_total_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'GERADO' CHECK (status IN ('GERADO', 'EM_EDICAO', 'ENVIADO', 'DEVOLVIDO', 'ASSINADO'));

-- 2. Criar enum para status do pré-planejamento (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pre_planning_status') THEN
    CREATE TYPE public.pre_planning_status AS ENUM ('GERADO', 'EM_EDICAO', 'ENVIADO', 'DEVOLVIDO', 'ASSINADO');
  END IF;
END $$;

-- 3. Índice para busca rápida por contexto (geração em massa)
CREATE INDEX IF NOT EXISTS idx_pre_plannings_context 
ON public.pre_plannings (organization_id, school_id, course_id, class_group_id, subject_id, bimester_number);

-- 4. Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_pre_plannings_status 
ON public.pre_plannings (organization_id, status);

-- 5. Constraint de unicidade: 1 pré-planejamento por Disciplina × Turma × Bimestre × Ano
CREATE UNIQUE INDEX IF NOT EXISTS idx_pre_plannings_unique_context
ON public.pre_plannings (organization_id, course_id, class_group_id, subject_id, bimester_number, reference_year)
WHERE class_group_id IS NOT NULL;

-- ==========================================================================
-- FUNÇÕES RPC PARA CÁLCULO E VALIDAÇÃO
-- ==========================================================================

-- 6. Função para obter o bimestre atual baseado na data
CREATE OR REPLACE FUNCTION public.get_current_bimester(p_org_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
  v_bimester_number integer;
BEGIN
  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = p_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN 1;
  END IF;
  
  -- Find bimester containing the date
  SELECT number INTO v_bimester_number
  FROM public.academic_bimesters
  WHERE calendar_id = v_calendar_id
    AND p_date >= start_date
    AND p_date <= end_date
  LIMIT 1;
  
  RETURN COALESCE(v_bimester_number, 1);
END;
$function$;

-- 7. Função para calcular aulas por bimestre para uma disciplina
CREATE OR REPLACE FUNCTION public.calculate_bimester_classes(
  p_subject_id uuid,
  p_bimester_number integer
)
RETURNS TABLE(total_classes integer, total_hours integer, letivo_days integer, bimester_start date, bimester_end date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_weekly_hours integer;
  v_calendar_id uuid;
  v_start_date date;
  v_end_date date;
  v_letivo_count integer;
  v_total_classes integer;
  v_total_hours integer;
BEGIN
  -- Get subject info
  SELECT organization_id, carga_horaria_semanal
  INTO v_org_id, v_weekly_hours
  FROM public.subjects
  WHERE id = p_subject_id AND deleted_at IS NULL;
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, NULL::date, NULL::date;
    RETURN;
  END IF;
  
  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = v_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, NULL::date, NULL::date;
    RETURN;
  END IF;
  
  -- Get bimester date range
  SELECT start_date, end_date
  INTO v_start_date, v_end_date
  FROM public.academic_bimesters
  WHERE calendar_id = v_calendar_id AND number = p_bimester_number;
  
  IF v_start_date IS NULL THEN
    RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, NULL::date, NULL::date;
    RETURN;
  END IF;
  
  -- Count LETIVO days in the bimester
  SELECT COUNT(*)
  INTO v_letivo_count
  FROM public.calendar_events
  WHERE calendar_id = v_calendar_id
    AND event_type = 'LETIVO'
    AND event_date >= v_start_date
    AND event_date <= v_end_date;
  
  -- Calculate total classes: (letivo days / 5 weekdays) * weekly hours
  v_total_classes := GREATEST(1, (v_letivo_count / 5) * v_weekly_hours);
  -- Each class = 50 minutes
  v_total_hours := v_total_classes * 50;
  
  RETURN QUERY SELECT v_total_classes, v_total_hours, v_letivo_count, v_start_date, v_end_date;
END;
$function$;

-- 8. Função para validar se pode gerar pré-planejamento
CREATE OR REPLACE FUNCTION public.validate_pre_planning_generation(
  p_org_id uuid,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_subject_id uuid,
  p_bimester_number integer
)
RETURNS TABLE(
  can_generate boolean,
  error_message text,
  professors_count integer,
  has_schedule boolean,
  subject_semester text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
  v_subject_semester subject_semester;
  v_current_semester subject_semester;
  v_professors_count integer;
  v_has_schedule boolean;
  v_exists boolean;
BEGIN
  -- 1. Check active calendar exists
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = p_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN QUERY SELECT false, 'Não existe calendário acadêmico ativo'::text, 0, false, ''::text;
    RETURN;
  END IF;
  
  -- 2. Check if pre-planning already exists
  SELECT EXISTS(
    SELECT 1 FROM public.pre_plannings
    WHERE organization_id = p_org_id
      AND class_group_id = p_class_group_id
      AND subject_id = p_subject_id
      AND bimester_number = p_bimester_number
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN QUERY SELECT false, 'Pré-planejamento já existe para este contexto'::text, 0, false, ''::text;
    RETURN;
  END IF;
  
  -- 3. Get subject semester
  SELECT semester INTO v_subject_semester
  FROM public.subjects
  WHERE id = p_subject_id AND deleted_at IS NULL;
  
  IF v_subject_semester IS NULL THEN
    RETURN QUERY SELECT false, 'Disciplina não encontrada ou sem semestre definido'::text, 0, false, ''::text;
    RETURN;
  END IF;
  
  -- 4. Check if bimester belongs to subject semester
  v_current_semester := get_current_semester(p_org_id);
  
  IF v_subject_semester = 'FIRST' AND p_bimester_number > 2 THEN
    RETURN QUERY SELECT false, 'Disciplina é do 1º semestre, bimestre inválido'::text, 0, false, v_subject_semester::text;
    RETURN;
  END IF;
  
  IF v_subject_semester = 'SECOND' AND p_bimester_number < 3 THEN
    RETURN QUERY SELECT false, 'Disciplina é do 2º semestre, bimestre inválido'::text, 0, false, v_subject_semester::text;
    RETURN;
  END IF;
  
  -- 5. Check professors with schedules for this context
  SELECT COUNT(DISTINCT wtm.professor_id)
  INTO v_professors_count
  FROM public.weekly_teaching_models wtm
  WHERE wtm.organization_id = p_org_id
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.subject_id = p_subject_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE';
  
  v_has_schedule := v_professors_count > 0;
  
  IF NOT v_has_schedule THEN
    RETURN QUERY SELECT false, 'Não há professor com horário de aula cadastrado para esta disciplina/turma'::text, 0, false, v_subject_semester::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::text, v_professors_count, v_has_schedule, v_subject_semester::text;
END;
$function$;

-- 9. Função para listar disciplinas elegíveis para geração em massa
CREATE OR REPLACE FUNCTION public.get_eligible_subjects_for_pre_planning(
  p_org_id uuid,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_bimester_number integer
)
RETURNS TABLE(
  subject_id uuid,
  subject_name text,
  subject_code text,
  semester text,
  weekly_hours integer,
  professors_count integer,
  already_exists boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subject_id,
    s.nome as subject_name,
    s.codigo as subject_code,
    s.semester::text,
    s.carga_horaria_semanal as weekly_hours,
    COUNT(DISTINCT wtm.professor_id)::integer as professors_count,
    EXISTS(
      SELECT 1 FROM public.pre_plannings pp
      WHERE pp.organization_id = p_org_id
        AND pp.class_group_id = p_class_group_id
        AND pp.subject_id = s.id
        AND pp.bimester_number = p_bimester_number
    ) as already_exists
  FROM public.subjects s
  INNER JOIN public.weekly_teaching_models wtm 
    ON wtm.subject_id = s.id 
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
  WHERE s.course_id = p_course_id
    AND s.organization_id = p_org_id
    AND s.deleted_at IS NULL
    AND s.status = 'ativo'
    -- Filter by semester compatibility with bimester
    AND (
      (s.semester = 'FIRST' AND p_bimester_number IN (1, 2))
      OR (s.semester = 'SECOND' AND p_bimester_number IN (3, 4))
    )
  GROUP BY s.id, s.nome, s.codigo, s.semester, s.carga_horaria_semanal;
END;
$function$;

-- 10. Atualizar RLS para pre_plannings incluindo novos campos
DROP POLICY IF EXISTS "Coordinators can manage pre-plannings" ON public.pre_plannings;
DROP POLICY IF EXISTS "Users can view pre-plannings of their organizations" ON public.pre_plannings;

CREATE POLICY "Coordinators can manage pre-plannings" 
ON public.pre_plannings 
FOR ALL 
USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "Professors can view assigned pre-plannings" 
ON public.pre_plannings 
FOR SELECT 
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    INNER JOIN public.professors p ON p.id = wtm.professor_id
    WHERE wtm.school_id = pre_plannings.school_id
      AND wtm.course_id = pre_plannings.course_id
      AND wtm.class_group_id = pre_plannings.class_group_id
      AND wtm.subject_id = pre_plannings.subject_id
      AND wtm.status = 'ACTIVE'
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Professors can update assigned pre-plannings" 
ON public.pre_plannings 
FOR UPDATE 
USING (
  has_organization_access(auth.uid(), organization_id)
  AND status NOT IN ('ASSINADO')
  AND EXISTS (
    SELECT 1 FROM public.weekly_teaching_models wtm
    INNER JOIN public.professors p ON p.id = wtm.professor_id
    WHERE wtm.school_id = pre_plannings.school_id
      AND wtm.course_id = pre_plannings.course_id
      AND wtm.class_group_id = pre_plannings.class_group_id
      AND wtm.subject_id = pre_plannings.subject_id
      AND wtm.status = 'ACTIVE'
      AND p.user_id = auth.uid()
  )
);

-- 11. Atualizar teacher_plannings para vincular corretamente ao pre_planning
ALTER TABLE public.teacher_plannings
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id),
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id),
ADD COLUMN IF NOT EXISTS class_group_id uuid REFERENCES public.class_groups(id),
ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id),
ADD COLUMN IF NOT EXISTS bimester_number integer;