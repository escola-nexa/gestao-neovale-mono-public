-- ==========================================================================
-- CONSOLIDATED MIGRATIONS
-- Execute este arquivo no Supabase SQL Editor
-- ==========================================================================

-- Migration 1: Add ANNUAL to semester enum
-- ==========================================================================
ALTER TYPE subject_semester ADD VALUE IF NOT EXISTS 'ANNUAL';

-- Migration 2: Fix pre-planning eligibility (filter by CLASS type and add ANNUAL support)
-- ==========================================================================
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
    AND wtm.schedule_type = 'CLASS' -- Garante apenas aulas, não planejamentos
    AND wtm.status = 'ACTIVE'
  WHERE s.course_id = p_course_id
    AND s.organization_id = p_org_id
    AND s.deleted_at IS NULL
    AND s.status = 'ativo'
    -- Filter by semester compatibility with bimester
    -- Agora inclui explicitamente ANNUAL, que é compatível com todos os bimestres (1, 2, 3, 4)
    AND (
      (s.semester = 'FIRST' AND p_bimester_number IN (1, 2))
      OR (s.semester = 'SECOND' AND p_bimester_number IN (3, 4))
      OR (s.semester = 'ANNUAL') -- ANUAL aceita qualquer bimestre válido
    )
  GROUP BY s.id, s.nome, s.codigo, s.semester, s.carga_horaria_semanal;
END;
$function$;

-- Migration 3: Create Orientations table
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.orientations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  professor_id uuid REFERENCES public.professors(id) NOT NULL,
  school_id uuid REFERENCES public.schools(id),
  course_id uuid REFERENCES public.courses(id),
  subject_id uuid REFERENCES public.subjects(id),
  planning_slot_id uuid REFERENCES public.weekly_teaching_models(id),
  
  orientation_type text NOT NULL,
  scheduling_notes text,
  description text,
  evidence_urls text[],
  
  status text DEFAULT 'REALIZADO' CHECK (status IN ('AGENDADO', 'REALIZADO', 'CANCELADO')),
  created_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- RLS Policies for orientations
ALTER TABLE public.orientations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coordinators can manage orientations" ON public.orientations;
DROP POLICY IF EXISTS "Professors can view their orientations" ON public.orientations;

-- Create coordinator policy
CREATE POLICY "Coordinators can manage orientations"
ON public.orientations
FOR ALL
USING (is_coordinator(auth.uid(), organization_id));

-- Create professor view policy
CREATE POLICY "Professors can view their orientations"
ON public.orientations
FOR SELECT
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
);

-- Create storage bucket for evidences (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload evidences" ON storage.objects;
DROP POLICY IF EXISTS "Users can view evidences" ON storage.objects;

-- Storage policies for evidences bucket
CREATE POLICY "Users can upload evidences"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidences' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view evidences"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidences');

-- ==========================================================================
-- MIGRATIONS APLICADAS COM SUCESSO!
-- ==========================================================================
