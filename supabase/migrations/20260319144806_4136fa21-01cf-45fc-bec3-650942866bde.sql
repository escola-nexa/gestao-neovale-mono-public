
-- ============================================================
-- Phase 2 BI Analytical Functions
-- ============================================================

-- 1. School BI Summary
CREATE OR REPLACE FUNCTION public.get_school_bi_summary(
  p_org_id uuid,
  p_bimester_number integer DEFAULT NULL
)
RETURNS TABLE(
  school_id uuid,
  school_name text,
  city_name text,
  total_teachers bigint,
  compliance_avg numeric,
  risk_avg numeric,
  learning_avg numeric,
  pending_plannings bigint,
  pending_attendance bigint,
  pending_grades bigint,
  open_orientations bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_data AS (
    SELECT * FROM public.get_teacher_bi_summary(p_org_id, NULL, NULL, p_bimester_number, 10000, 0)
  ),
  teacher_school_pairs AS (
    SELECT 
      psc.school_id as sid,
      td.*
    FROM teacher_data td
    JOIN public.professor_school_courses psc ON psc.professor_id = td.teacher_id
    WHERE psc.status = 'ACTIVE' AND psc.organization_id = p_org_id
  )
  SELECT
    s.id,
    s.nome::text,
    s.cidade::text,
    COUNT(DISTINCT tsp.teacher_id)::bigint,
    ROUND(COALESCE(AVG(tsp.compliance_score), 100), 1),
    ROUND(COALESCE(AVG(tsp.risk_score), 0), 1),
    0::numeric, -- learning_avg placeholder
    COALESCE(SUM(GREATEST(0, tsp.total_expected_plannings - tsp.total_submitted_plannings)), 0)::bigint,
    COALESCE(SUM(GREATEST(0, tsp.total_expected_attendance - tsp.total_recorded_attendance)), 0)::bigint,
    COALESCE(SUM(GREATEST(0, tsp.total_expected_grades - tsp.total_completed_grades)), 0)::bigint,
    COALESCE(SUM(tsp.total_open_orientations), 0)::bigint
  FROM public.schools s
  LEFT JOIN teacher_school_pairs tsp ON tsp.sid = s.id
  WHERE s.organization_id = p_org_id AND s.status = 'ativo'
  GROUP BY s.id, s.nome, s.cidade
  ORDER BY s.nome;
END;
$$;

-- 2. City BI Summary
CREATE OR REPLACE FUNCTION public.get_city_bi_summary(
  p_org_id uuid,
  p_bimester_number integer DEFAULT NULL
)
RETURNS TABLE(
  city_name text,
  total_schools bigint,
  total_teachers bigint,
  compliance_avg numeric,
  risk_avg numeric,
  learning_avg numeric,
  total_pending bigint,
  critical_teachers bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH school_data AS (
    SELECT * FROM public.get_school_bi_summary(p_org_id, p_bimester_number)
  ),
  teacher_data AS (
    SELECT * FROM public.get_teacher_bi_summary(p_org_id, NULL, NULL, p_bimester_number, 10000, 0)
  ),
  teacher_cities AS (
    SELECT DISTINCT
      s.cidade as city,
      td.teacher_id,
      td.compliance_score
    FROM teacher_data td
    JOIN public.professor_school_courses psc ON psc.professor_id = td.teacher_id AND psc.status = 'ACTIVE'
    JOIN public.schools s ON s.id = psc.school_id
    WHERE psc.organization_id = p_org_id
  )
  SELECT
    sd.city_name,
    COUNT(DISTINCT sd.school_id)::bigint,
    COUNT(DISTINCT tc.teacher_id)::bigint,
    ROUND(AVG(sd.compliance_avg), 1),
    ROUND(AVG(sd.risk_avg), 1),
    0::numeric,
    (COALESCE(SUM(sd.pending_plannings), 0) + COALESCE(SUM(sd.pending_attendance), 0) + COALESCE(SUM(sd.pending_grades), 0))::bigint,
    COUNT(DISTINCT tc.teacher_id) FILTER (WHERE tc.compliance_score < 60)::bigint
  FROM school_data sd
  LEFT JOIN teacher_cities tc ON tc.city = sd.city_name
  GROUP BY sd.city_name
  ORDER BY sd.city_name;
END;
$$;

-- 3. Grades / Learning Performance
CREATE OR REPLACE FUNCTION public.get_bi_grades_learning(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL
)
RETURNS TABLE(
  teacher_id uuid,
  teacher_name text,
  school_name text,
  city_name text,
  subject_name text,
  class_group_name text,
  bimester integer,
  grade_avg numeric,
  students_above_avg_pct numeric,
  students_at_risk_pct numeric,
  missing_grades_count bigint,
  total_students bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name::text,
    s.nome::text,
    s.cidade::text,
    sub.nome::text,
    cg.nome::text,
    gc.bimester_number,
    COALESCE(ROUND(AVG(sg.score), 2), 0),
    CASE WHEN COUNT(sg.id) = 0 THEN 0
      ELSE ROUND((COUNT(sg.id) FILTER (WHERE sg.score >= 6.0)::numeric / NULLIF(COUNT(sg.id), 0)) * 100, 1)
    END,
    CASE WHEN COUNT(sg.id) = 0 THEN 0
      ELSE ROUND((COUNT(sg.id) FILTER (WHERE sg.score < 6.0)::numeric / NULLIF(COUNT(sg.id), 0)) * 100, 1)
    END,
    COUNT(DISTINCT e.student_id) FILTER (WHERE sg.id IS NULL)::bigint,
    COUNT(DISTINCT e.student_id)::bigint
  FROM public.grade_configurations gc
  JOIN public.professors p ON p.id = gc.professor_id
  JOIN public.schools s ON s.id = gc.school_id
  JOIN public.subjects sub ON sub.id = gc.subject_id
  JOIN public.class_groups cg ON cg.id = gc.class_group_id
  LEFT JOIN public.grade_activities ga ON ga.grade_config_id = gc.id
  LEFT JOIN public.student_grades sg ON sg.grade_activity_id = ga.id
  LEFT JOIN public.enrollments e ON e.class_group_id = gc.class_group_id 
    AND e.organization_id = gc.organization_id 
    AND e.status = 'ativa'
  WHERE gc.organization_id = p_org_id
    AND p.deleted_at IS NULL
    AND (p_school_id IS NULL OR gc.school_id = p_school_id)
    AND (p_bimester_number IS NULL OR gc.bimester_number = p_bimester_number)
  GROUP BY p.id, p.full_name, s.nome, s.cidade, sub.nome, cg.nome, gc.bimester_number
  ORDER BY p.full_name, sub.nome;
END;
$$;

-- 4. Rankings function
CREATE OR REPLACE FUNCTION public.get_bi_rankings(
  p_org_id uuid,
  p_view_mode text DEFAULT 'professor',
  p_dimension text DEFAULT 'compliance',
  p_bimester_number integer DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  rank_position integer,
  entity_id text,
  entity_name text,
  entity_detail text,
  score numeric,
  secondary_score numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_view_mode = 'professor' THEN
    RETURN QUERY
    WITH td AS (
      SELECT * FROM public.get_teacher_bi_summary(p_org_id, NULL, NULL, p_bimester_number, 10000, 0)
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY 
        CASE p_dimension
          WHEN 'compliance' THEN td.compliance_score
          WHEN 'planning' THEN td.planning_score
          WHEN 'attendance' THEN td.attendance_score
          WHEN 'grades' THEN td.grades_score
          WHEN 'risk' THEN 100 - td.risk_score
          ELSE td.compliance_score
        END DESC
      )::integer,
      td.teacher_id::text,
      td.teacher_name::text,
      COALESCE(td.school_names[1], '')::text,
      CASE p_dimension
        WHEN 'compliance' THEN td.compliance_score
        WHEN 'planning' THEN td.planning_score
        WHEN 'attendance' THEN td.attendance_score
        WHEN 'grades' THEN td.grades_score
        WHEN 'risk' THEN 100 - td.risk_score
        ELSE td.compliance_score
      END,
      td.risk_score
    FROM td
    ORDER BY 5 DESC
    LIMIT p_limit;
    
  ELSIF p_view_mode = 'escola' THEN
    RETURN QUERY
    WITH sd AS (
      SELECT * FROM public.get_school_bi_summary(p_org_id, p_bimester_number)
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE p_dimension
          WHEN 'compliance' THEN sd.compliance_avg
          WHEN 'risk' THEN 100 - sd.risk_avg
          ELSE sd.compliance_avg
        END DESC
      )::integer,
      sd.school_id::text,
      sd.school_name::text,
      sd.city_name::text,
      CASE p_dimension
        WHEN 'compliance' THEN sd.compliance_avg
        WHEN 'risk' THEN 100 - sd.risk_avg
        ELSE sd.compliance_avg
      END,
      sd.risk_avg
    FROM sd
    ORDER BY 5 DESC
    LIMIT p_limit;
    
  ELSIF p_view_mode = 'cidade' THEN
    RETURN QUERY
    WITH cd AS (
      SELECT * FROM public.get_city_bi_summary(p_org_id, p_bimester_number)
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE p_dimension
          WHEN 'compliance' THEN cd.compliance_avg
          WHEN 'risk' THEN 100 - cd.risk_avg
          ELSE cd.compliance_avg
        END DESC
      )::integer,
      cd.city_name::text,
      cd.city_name::text,
      (cd.total_schools || ' escola(s)')::text,
      CASE p_dimension
        WHEN 'compliance' THEN cd.compliance_avg
        WHEN 'risk' THEN 100 - cd.risk_avg
        ELSE cd.compliance_avg
      END,
      cd.risk_avg
    FROM cd
    ORDER BY 5 DESC
    LIMIT p_limit;
  END IF;
END;
$$;
