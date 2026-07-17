-- PARTE 2: Estrutura de tabelas e funções para pré-planejamento por aula

-- 1. Adicionar occurrence_id e class_date ao pre_plannings
ALTER TABLE public.pre_plannings 
ADD COLUMN IF NOT EXISTS occurrence_id uuid REFERENCES public.annual_class_occurrences(id);

ALTER TABLE public.pre_plannings 
ADD COLUMN IF NOT EXISTS class_date date;

-- 2. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_pre_plannings_occurrence 
ON public.pre_plannings(occurrence_id);

-- 3. Criar tabela de auditoria para rastrear ações
CREATE TABLE IF NOT EXISTS public.planning_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  pre_planning_id uuid REFERENCES public.pre_plannings(id),
  teacher_planning_id uuid REFERENCES public.teacher_plannings(id),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS na tabela de auditoria
ALTER TABLE public.planning_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para auditoria
CREATE POLICY "Coordinators can view audit logs"
ON public.planning_audit_log
FOR SELECT
USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "System can insert audit logs"
ON public.planning_audit_log
FOR INSERT
WITH CHECK (has_organization_access(auth.uid(), organization_id));

-- 6. Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_planning_audit_log_pre_planning 
ON public.planning_audit_log(pre_planning_id);

CREATE INDEX IF NOT EXISTS idx_planning_audit_log_teacher_planning 
ON public.planning_audit_log(teacher_planning_id);

CREATE INDEX IF NOT EXISTS idx_planning_audit_log_action 
ON public.planning_audit_log(action);

-- 7. Função para registrar auditoria
CREATE OR REPLACE FUNCTION public.log_planning_action(
  p_org_id uuid,
  p_pre_planning_id uuid,
  p_teacher_planning_id uuid,
  p_action text,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.planning_audit_log (
    organization_id,
    pre_planning_id,
    teacher_planning_id,
    user_id,
    action,
    details
  ) VALUES (
    p_org_id,
    p_pre_planning_id,
    p_teacher_planning_id,
    auth.uid(),
    p_action,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 8. Função para obter aulas elegíveis para geração de pré-planejamento
CREATE OR REPLACE FUNCTION public.get_eligible_occurrences_for_pre_planning(
  p_org_id uuid,
  p_school_id uuid,
  p_course_id uuid,
  p_class_group_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  occurrence_id uuid,
  occurrence_date date,
  weekday text,
  start_time time,
  end_time time,
  subject_id uuid,
  subject_name text,
  professor_id uuid,
  professor_name text,
  already_has_pre_planning boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aco.id as occurrence_id,
    aco.occurrence_date,
    wtm.weekday::text,
    aco.start_time,
    aco.end_time,
    s.id as subject_id,
    s.nome as subject_name,
    p.id as professor_id,
    p.full_name::text as professor_name,
    EXISTS(
      SELECT 1 FROM public.pre_plannings pp
      WHERE pp.occurrence_id = aco.id
        AND pp.deleted_at IS NULL
    ) as already_has_pre_planning
  FROM public.annual_class_occurrences aco
  INNER JOIN public.weekly_teaching_models wtm ON wtm.id = aco.weekly_model_id
  INNER JOIN public.professors p ON p.id = wtm.professor_id
  INNER JOIN public.subjects s ON s.id = wtm.subject_id
  INNER JOIN public.calendar_events ce ON ce.event_date = aco.occurrence_date
  INNER JOIN public.academic_calendars ac ON ac.id = ce.calendar_id
  WHERE wtm.organization_id = p_org_id
    AND wtm.school_id = p_school_id
    AND wtm.course_id = p_course_id
    AND wtm.class_group_id = p_class_group_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND aco.status = 'SCHEDULED'
    AND ce.event_type = 'LETIVO'
    AND ac.organization_id = p_org_id
    AND ac.status = 'ACTIVE'
    AND (p_start_date IS NULL OR aco.occurrence_date >= p_start_date)
    AND (p_end_date IS NULL OR aco.occurrence_date <= p_end_date)
    AND (
      s.semester = 'ANNUAL'
      OR (s.semester = 'FIRST' AND aco.occurrence_date <= (
        SELECT MAX(ab.end_date) FROM public.academic_bimesters ab WHERE ab.calendar_id = ac.id AND ab.number = 2
      ))
      OR (s.semester = 'SECOND' AND aco.occurrence_date >= (
        SELECT MIN(ab.start_date) FROM public.academic_bimesters ab WHERE ab.calendar_id = ac.id AND ab.number = 3
      ))
    )
  ORDER BY aco.occurrence_date, aco.start_time;
END;
$$;

-- 9. Trigger para auditar mudanças de status
CREATE OR REPLACE FUNCTION public.audit_teacher_planning_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_planning_action(
      NEW.organization_id,
      NEW.pre_planning_id,
      NEW.id,
      CASE NEW.status::text
        WHEN 'DRAFT' THEN 'EDIT_STARTED'
        WHEN 'ENVIADO' THEN 'SUBMITTED'
        WHEN 'PENDING' THEN 'SUBMITTED'
        WHEN 'DEVOLVIDO' THEN 'RETURNED'
        WHEN 'REJECTED' THEN 'RETURNED'
        WHEN 'ASSINADO' THEN 'SIGNED'
        WHEN 'APPROVED' THEN 'SIGNED'
        ELSE 'STATUS_CHANGED'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_teacher_planning_status ON public.teacher_plannings;
CREATE TRIGGER trg_audit_teacher_planning_status
AFTER UPDATE ON public.teacher_plannings
FOR EACH ROW
EXECUTE FUNCTION public.audit_teacher_planning_status_change();

-- 10. Atualizar trigger de edição do pré-planejamento
CREATE OR REPLACE FUNCTION public.mark_pre_planning_in_editing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('GERADO', 'DISPONIVEL') AND (
    NEW.objective IS DISTINCT FROM OLD.objective OR
    NEW.competencies IS DISTINCT FROM OLD.competencies OR
    NEW.contents IS DISTINCT FROM OLD.contents OR
    NEW.methodology IS DISTINCT FROM OLD.methodology OR
    NEW.resources IS DISTINCT FROM OLD.resources OR
    NEW.evaluation IS DISTINCT FROM OLD.evaluation OR
    NEW.product IS DISTINCT FROM OLD.product OR
    NEW.next_steps IS DISTINCT FROM OLD.next_steps
  ) THEN
    IF NOT is_coordinator(auth.uid(), NEW.organization_id) THEN
      NEW.status := 'EM_EDICAO';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;