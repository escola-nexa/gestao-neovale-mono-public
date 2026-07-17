
-- BI Analytical function: Get teacher BI summary metrics
-- This function computes compliance and risk scores per teacher
CREATE OR REPLACE FUNCTION public.get_teacher_bi_summary(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  teacher_id uuid,
  teacher_name text,
  school_ids uuid[],
  school_names text[],
  city_names text[],
  total_expected_plannings bigint,
  total_submitted_plannings bigint,
  total_approved_plannings bigint,
  total_signed_plannings bigint,
  total_draft_plannings bigint,
  total_returned_plannings bigint,
  total_expected_attendance bigint,
  total_recorded_attendance bigint,
  total_expected_grades bigint,
  total_completed_grades bigint,
  total_orientations bigint,
  total_open_orientations bigint,
  planning_score numeric,
  attendance_score numeric,
  grades_score numeric,
  orientation_score numeric,
  compliance_score numeric,
  risk_score numeric,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  -- First get total count for pagination
  SELECT COUNT(DISTINCT p.id) INTO v_total
  FROM public.professors p
  WHERE p.organization_id = p_org_id
    AND p.deleted_at IS NULL
    AND p.status = 'ACTIVE'
    AND (p_school_id IS NULL OR EXISTS(
      SELECT 1 FROM public.professor_school_courses psc 
      WHERE psc.professor_id = p.id AND psc.school_id = p_school_id AND psc.status = 'ACTIVE'
    ));

  RETURN QUERY
  WITH teacher_base AS (
    SELECT DISTINCT p.id as tid, p.full_name as tname
    FROM public.professors p
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND p.status = 'ACTIVE'
      AND (p_school_id IS NULL OR EXISTS(
        SELECT 1 FROM public.professor_school_courses psc 
        WHERE psc.professor_id = p.id AND psc.school_id = p_school_id AND psc.status = 'ACTIVE'
      ))
    ORDER BY p.full_name
    LIMIT p_limit OFFSET p_offset
  ),
  teacher_schools AS (
    SELECT 
      psc.professor_id,
      array_agg(DISTINCT s.id) as sids,
      array_agg(DISTINCT s.nome) as snames,
      array_agg(DISTINCT s.cidade) as cnames
    FROM public.professor_school_courses psc
    JOIN public.schools s ON s.id = psc.school_id
    WHERE psc.organization_id = p_org_id AND psc.status = 'ACTIVE'
      AND psc.professor_id IN (SELECT tid FROM teacher_base)
    GROUP BY psc.professor_id
  ),
  planning_metrics AS (
    SELECT 
      tp.professor_id as pid,
      COUNT(*) as total_tp,
      COUNT(*) FILTER (WHERE tp.status IN ('ENVIADO', 'PENDING', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR', 'ASSINADO', 'APPROVED', 'CONCLUIDO')) as submitted,
      COUNT(*) FILTER (WHERE tp.status IN ('ASSINADO', 'APPROVED', 'CONCLUIDO')) as approved,
      COUNT(*) FILTER (WHERE tp.status IN ('ASSINADO', 'CONCLUIDO') AND tp.professor_signed = true) as signed,
      COUNT(*) FILTER (WHERE tp.status = 'DRAFT') as draft,
      COUNT(*) FILTER (WHERE tp.status IN ('DEVOLVIDO', 'REJECTED')) as returned
    FROM public.teacher_plannings tp
    WHERE tp.organization_id = p_org_id
      AND tp.professor_id IN (SELECT tid FROM teacher_base)
      AND (p_bimester_number IS NULL OR tp.bimester_number = p_bimester_number)
      AND (p_school_id IS NULL OR tp.school_id = p_school_id)
      AND (p_course_id IS NULL OR tp.course_id = p_course_id)
    GROUP BY tp.professor_id
  ),
  pre_planning_expected AS (
    SELECT 
      COALESCE(pp.professor_id, wtm_prof.pid) as pid,
      COUNT(*) as expected
    FROM public.pre_plannings pp
    LEFT JOIN LATERAL (
      SELECT DISTINCT wtm.professor_id as pid
      FROM public.weekly_teaching_models wtm
      WHERE wtm.school_id = pp.school_id 
        AND wtm.course_id = pp.course_id
        AND wtm.class_group_id = pp.class_group_id
        AND wtm.subject_id = pp.subject_id
        AND wtm.status = 'ACTIVE'
        AND wtm.schedule_type = 'CLASS'
    ) wtm_prof ON pp.professor_id IS NULL
    WHERE pp.organization_id = p_org_id
      AND pp.deleted_at IS NULL
      AND (p_bimester_number IS NULL OR pp.bimester_number = p_bimester_number)
      AND (p_school_id IS NULL OR pp.school_id = p_school_id)
      AND (p_course_id IS NULL OR pp.course_id = p_course_id)
      AND COALESCE(pp.professor_id, wtm_prof.pid) IN (SELECT tid FROM teacher_base)
    GROUP BY COALESCE(pp.professor_id, wtm_prof.pid)
  ),
  attendance_metrics AS (
    SELECT
      ar.professor_id as pid,
      COUNT(DISTINCT (ar.class_group_id, ar.subject_id, ar.occurrence_date, ar.start_time)) as recorded
    FROM public.attendance_records ar
    WHERE ar.organization_id = p_org_id
      AND ar.professor_id IN (SELECT tid FROM teacher_base)
    GROUP BY ar.professor_id
  ),
  occurrence_expected AS (
    SELECT
      wtm.professor_id as pid,
      COUNT(DISTINCT aco.id) as expected
    FROM public.annual_class_occurrences aco
    JOIN public.weekly_teaching_models wtm ON wtm.id = aco.weekly_model_id
    WHERE aco.organization_id = p_org_id
      AND wtm.schedule_type = 'CLASS'
      AND wtm.status = 'ACTIVE'
      AND aco.status = 'SCHEDULED'
      AND aco.occurrence_date <= CURRENT_DATE
      AND wtm.professor_id IN (SELECT tid FROM teacher_base)
      AND (p_school_id IS NULL OR wtm.school_id = p_school_id)
      AND (p_course_id IS NULL OR wtm.course_id = p_course_id)
    GROUP BY wtm.professor_id
  ),
  grade_metrics AS (
    SELECT
      gc.professor_id as pid,
      COUNT(*) as expected,
      COUNT(*) FILTER (WHERE gc.status = 'CLOSED') as completed
    FROM public.grade_configurations gc
    WHERE gc.organization_id = p_org_id
      AND gc.professor_id IN (SELECT tid FROM teacher_base)
      AND (p_bimester_number IS NULL OR gc.bimester_number = p_bimester_number)
      AND (p_school_id IS NULL OR gc.school_id = p_school_id)
      AND (p_course_id IS NULL OR gc.course_id = p_course_id)
    GROUP BY gc.professor_id
  ),
  orientation_metrics AS (
    SELECT
      o.professor_id as pid,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE o.status IN ('pending', 'agendada', 'created')) as open_count
    FROM public.orientations o
    WHERE o.organization_id = p_org_id
      AND o.deleted_at IS NULL
      AND o.professor_id IN (SELECT tid FROM teacher_base)
      AND (p_school_id IS NULL OR o.school_id = p_school_id)
    GROUP BY o.professor_id
  )
  SELECT
    tb.tid,
    tb.tname::text,
    COALESCE(ts.sids, ARRAY[]::uuid[]),
    COALESCE(ts.snames, ARRAY[]::text[]),
    COALESCE(ts.cnames, ARRAY[]::text[]),
    -- Planning metrics
    COALESCE(pe.expected, 0)::bigint,
    COALESCE(pm.submitted, 0)::bigint,
    COALESCE(pm.approved, 0)::bigint,
    COALESCE(pm.signed, 0)::bigint,
    COALESCE(pm.draft, 0)::bigint,
    COALESCE(pm.returned, 0)::bigint,
    -- Attendance metrics
    COALESCE(oe.expected, 0)::bigint,
    COALESCE(am.recorded, 0)::bigint,
    -- Grade metrics
    COALESCE(gm.expected, 0)::bigint,
    COALESCE(gm.completed, 0)::bigint,
    -- Orientation metrics
    COALESCE(om.total, 0)::bigint,
    COALESCE(om.open_count, 0)::bigint,
    -- Scores (0-100)
    CASE WHEN COALESCE(pe.expected, 0) = 0 THEN 100.0
      ELSE ROUND(LEAST(100, (COALESCE(pm.approved, 0)::numeric / GREATEST(pe.expected, 1)) * 100), 1)
    END,
    CASE WHEN COALESCE(oe.expected, 0) = 0 THEN 100.0
      ELSE ROUND(LEAST(100, (COALESCE(am.recorded, 0)::numeric / GREATEST(oe.expected, 1)) * 100), 1)
    END,
    CASE WHEN COALESCE(gm.expected, 0) = 0 THEN 100.0
      ELSE ROUND(LEAST(100, (COALESCE(gm.completed, 0)::numeric / GREATEST(gm.expected, 1)) * 100), 1)
    END,
    -- Orientation score (fewer open = better, max 100)
    CASE WHEN COALESCE(om.total, 0) = 0 THEN 100.0
      ELSE ROUND(LEAST(100, ((COALESCE(om.total, 0) - COALESCE(om.open_count, 0))::numeric / GREATEST(om.total, 1)) * 100), 1)
    END,
    -- Compliance score (weighted average)
    ROUND(
      (CASE WHEN COALESCE(pe.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(pm.approved, 0)::numeric / GREATEST(pe.expected, 1)) * 100)
      END) * 0.30 +
      (CASE WHEN COALESCE(oe.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(am.recorded, 0)::numeric / GREATEST(oe.expected, 1)) * 100)
      END) * 0.25 +
      (CASE WHEN COALESCE(gm.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(gm.completed, 0)::numeric / GREATEST(gm.expected, 1)) * 100)
      END) * 0.20 +
      (CASE WHEN COALESCE(om.total, 0) = 0 THEN 100.0
        ELSE LEAST(100, ((COALESCE(om.total, 0) - COALESCE(om.open_count, 0))::numeric / GREATEST(om.total, 1)) * 100)
      END) * 0.15 +
      100 * 0.10  -- workload/regularity placeholder
    , 1),
    -- Risk score (inverse of compliance, higher = more risk)
    ROUND(100 - (
      (CASE WHEN COALESCE(pe.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(pm.approved, 0)::numeric / GREATEST(pe.expected, 1)) * 100)
      END) * 0.30 +
      (CASE WHEN COALESCE(oe.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(am.recorded, 0)::numeric / GREATEST(oe.expected, 1)) * 100)
      END) * 0.25 +
      (CASE WHEN COALESCE(gm.expected, 0) = 0 THEN 100.0
        ELSE LEAST(100, (COALESCE(gm.completed, 0)::numeric / GREATEST(gm.expected, 1)) * 100)
      END) * 0.20 +
      (CASE WHEN COALESCE(om.total, 0) = 0 THEN 100.0
        ELSE LEAST(100, ((COALESCE(om.total, 0) - COALESCE(om.open_count, 0))::numeric / GREATEST(om.total, 1)) * 100)
      END) * 0.15 +
      100 * 0.10
    ), 1),
    v_total
  FROM teacher_base tb
  LEFT JOIN teacher_schools ts ON ts.professor_id = tb.tid
  LEFT JOIN planning_metrics pm ON pm.pid = tb.tid
  LEFT JOIN pre_planning_expected pe ON pe.pid = tb.tid
  LEFT JOIN attendance_metrics am ON am.pid = tb.tid
  LEFT JOIN occurrence_expected oe ON oe.pid = tb.tid
  LEFT JOIN grade_metrics gm ON gm.pid = tb.tid
  LEFT JOIN orientation_metrics om ON om.pid = tb.tid
  ORDER BY tb.tname;
END;
$$;

-- BI Summary KPIs function
CREATE OR REPLACE FUNCTION public.get_bi_summary_kpis(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL
)
RETURNS TABLE(
  total_active_teachers bigint,
  teachers_full_compliance bigint,
  teachers_with_planning_delay bigint,
  teachers_with_attendance_pending bigint,
  teachers_with_grades_pending bigint,
  teachers_with_open_orientations bigint,
  avg_compliance_score numeric,
  avg_risk_score numeric,
  teachers_attention bigint,
  teachers_critical bigint,
  total_pending bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_data AS (
    SELECT * FROM public.get_teacher_bi_summary(p_org_id, p_school_id, NULL, p_bimester_number, 10000, 0)
  )
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE td.compliance_score >= 90)::bigint,
    COUNT(*) FILTER (WHERE td.planning_score < 75)::bigint,
    COUNT(*) FILTER (WHERE td.attendance_score < 75)::bigint,
    COUNT(*) FILTER (WHERE td.grades_score < 75)::bigint,
    COUNT(*) FILTER (WHERE td.total_open_orientations > 0)::bigint,
    ROUND(AVG(td.compliance_score), 1),
    ROUND(AVG(td.risk_score), 1),
    COUNT(*) FILTER (WHERE td.compliance_score >= 60 AND td.compliance_score < 75)::bigint,
    COUNT(*) FILTER (WHERE td.compliance_score < 60)::bigint,
    (SUM(td.total_expected_plannings - td.total_submitted_plannings) + 
     SUM(td.total_expected_attendance - td.total_recorded_attendance) +
     SUM(td.total_expected_grades - td.total_completed_grades))::bigint
  FROM teacher_data td;
END;
$$;

-- Planning flow metrics function
CREATE OR REPLACE FUNCTION public.get_bi_planning_metrics(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL
)
RETURNS TABLE(
  total_expected bigint,
  total_draft bigint,
  total_submitted bigint,
  total_returned bigint,
  total_approved bigint,
  total_signed bigint,
  total_completed bigint,
  on_time_count bigint,
  late_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE tp.status = 'DRAFT')::bigint,
    COUNT(*) FILTER (WHERE tp.status IN ('ENVIADO', 'PENDING'))::bigint,
    COUNT(*) FILTER (WHERE tp.status IN ('DEVOLVIDO', 'REJECTED'))::bigint,
    COUNT(*) FILTER (WHERE tp.status IN ('ASSINADO', 'APPROVED', 'AGUARDANDO_ASSINATURA', 'AGUARDANDO_ASSINATURA_COORDENADOR'))::bigint,
    COUNT(*) FILTER (WHERE tp.status IN ('ASSINADO', 'CONCLUIDO'))::bigint,
    COUNT(*) FILTER (WHERE tp.status = 'CONCLUIDO')::bigint,
    COUNT(*) FILTER (WHERE tp.status NOT IN ('DRAFT', 'DEVOLVIDO', 'REJECTED'))::bigint,
    COUNT(*) FILTER (WHERE tp.status IN ('DRAFT', 'DEVOLVIDO', 'REJECTED'))::bigint
  FROM public.teacher_plannings tp
  WHERE tp.organization_id = p_org_id
    AND (p_school_id IS NULL OR tp.school_id = p_school_id)
    AND (p_bimester_number IS NULL OR tp.bimester_number = p_bimester_number);
END;
$$;

-- Attendance BI metrics
CREATE OR REPLACE FUNCTION public.get_bi_attendance_metrics(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE(
  total_expected_classes bigint,
  total_with_attendance bigint,
  total_without_attendance bigint,
  attendance_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected bigint;
  v_recorded bigint;
BEGIN
  SELECT COUNT(DISTINCT aco.id) INTO v_expected
  FROM public.annual_class_occurrences aco
  JOIN public.weekly_teaching_models wtm ON wtm.id = aco.weekly_model_id
  WHERE aco.organization_id = p_org_id
    AND wtm.schedule_type = 'CLASS'
    AND wtm.status = 'ACTIVE'
    AND aco.status = 'SCHEDULED'
    AND aco.occurrence_date <= CURRENT_DATE
    AND (p_school_id IS NULL OR wtm.school_id = p_school_id);

  SELECT COUNT(DISTINCT (ar.class_group_id, ar.subject_id, ar.occurrence_date, ar.start_time)) INTO v_recorded
  FROM public.attendance_records ar
  WHERE ar.organization_id = p_org_id
    AND (p_school_id IS NULL OR EXISTS(
      SELECT 1 FROM public.weekly_teaching_models wtm
      JOIN public.professors p ON p.id = wtm.professor_id
      WHERE wtm.school_id = p_school_id AND p.id = ar.professor_id AND wtm.status = 'ACTIVE'
    ));

  RETURN QUERY SELECT
    v_expected,
    v_recorded,
    GREATEST(0, v_expected - v_recorded),
    CASE WHEN v_expected = 0 THEN 100.0
      ELSE ROUND(LEAST(100, (v_recorded::numeric / v_expected) * 100), 1)
    END;
END;
$$;
