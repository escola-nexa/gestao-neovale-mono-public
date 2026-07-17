
CREATE OR REPLACE FUNCTION public.get_professor_rankings(
  p_org_id uuid,
  p_bimester_number integer DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS TABLE (
  professor_id uuid,
  professor_name text,
  school_id uuid,
  school_name text,
  city text,
  avatar_url text,
  planning_score numeric,
  attendance_score numeric,
  grades_score numeric,
  orientations_score numeric,
  regularity_score numeric,
  total_score numeric,
  planning_approved integer,
  planning_total integer,
  planning_signed integer,
  planning_returned integer,
  attendance_total integer,
  grades_closed integer,
  grades_total integer,
  orientations_signed integer,
  orientations_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH prof_schools AS (
    SELECT DISTINCT ON (p.id)
      p.id AS pid,
      p.full_name,
      p.user_id,
      psc.school_id AS sid,
      s.nome AS sname,
      s.cidade AS scity
    FROM professors p
    JOIN professor_school_courses psc ON psc.professor_id = p.id AND psc.status = 'ACTIVE'
    JOIN schools s ON s.id = psc.school_id
    WHERE p.organization_id = p_org_id
      AND p.status = 'ACTIVE'
      AND p.deleted_at IS NULL
      AND (p_school_id IS NULL OR psc.school_id = p_school_id)
      AND (p_city IS NULL OR s.cidade = p_city)
    ORDER BY p.id, psc.created_at DESC
  ),
  prof_profiles AS (
    SELECT pr.user_id, pr.avatar_url
    FROM profiles pr
    WHERE pr.organization_id = p_org_id
  ),
  planning_stats AS (
    SELECT
      tp.professor_id AS pid,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE tp.status IN ('APPROVED', 'ASSINADO')) AS approved,
      COUNT(*) FILTER (WHERE tp.status IN ('ASSINADO')) AS signed,
      COUNT(*) FILTER (WHERE tp.status IN ('REJECTED', 'DEVOLVIDO')) AS returned
    FROM teacher_plannings tp
    WHERE tp.organization_id = p_org_id
      AND (p_bimester_number IS NULL OR tp.bimester_number = p_bimester_number)
    GROUP BY tp.professor_id
  ),
  attendance_stats AS (
    SELECT
      ar.professor_id AS pid,
      COUNT(DISTINCT ar.occurrence_date || ar.class_group_id || ar.subject_id) AS total_sessions
    FROM attendance_records ar
    WHERE ar.organization_id = p_org_id
    GROUP BY ar.professor_id
  ),
  grade_stats AS (
    SELECT
      gc.professor_id AS pid,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE gc.status = 'CLOSED') AS closed
    FROM grade_configurations gc
    WHERE gc.organization_id = p_org_id
      AND (p_bimester_number IS NULL OR gc.bimester_number = p_bimester_number)
    GROUP BY gc.professor_id
  ),
  orientation_stats AS (
    SELECT
      o.professor_id AS pid,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE o.status IN ('ASSINADO_PROFESSOR', 'ASSINADO_COORDENADOR', 'CONCLUIDO')) AS signed
    FROM orientations o
    WHERE o.organization_id = p_org_id
      AND o.deleted_at IS NULL
    GROUP BY o.professor_id
  ),
  scores AS (
    SELECT
      ps.pid,
      ps.full_name,
      ps.sid,
      ps.sname,
      ps.scity,
      pp.avatar_url,
      -- Planning score (weight 30%): approved/total ratio + signed bonus - returned penalty
      COALESCE(
        CASE WHEN COALESCE(pl.total, 0) = 0 THEN 0
        ELSE LEAST(100, (COALESCE(pl.approved, 0)::numeric / GREATEST(pl.total, 1) * 80) +
              (COALESCE(pl.signed, 0)::numeric / GREATEST(pl.total, 1) * 30) -
              (COALESCE(pl.returned, 0)::numeric / GREATEST(pl.total, 1) * 15))
        END, 0
      ) AS p_score,
      -- Attendance score (weight 25%): based on sessions logged
      COALESCE(
        CASE WHEN COALESCE(att.total_sessions, 0) = 0 THEN 0
        ELSE LEAST(100, att.total_sessions::numeric * 5)
        END, 0
      ) AS a_score,
      -- Grades score (weight 20%): closed/total ratio
      COALESCE(
        CASE WHEN COALESCE(gs.total, 0) = 0 THEN 0
        ELSE (gs.closed::numeric / GREATEST(gs.total, 1) * 100)
        END, 0
      ) AS g_score,
      -- Orientations score (weight 15%): signed/total ratio
      COALESCE(
        CASE WHEN COALESCE(os.total, 0) = 0 THEN 0
        ELSE (os.signed::numeric / GREATEST(os.total, 1) * 100)
        END, 0
      ) AS o_score,
      -- Regularity score (weight 10%): based on having data across dimensions
      COALESCE(
        (CASE WHEN COALESCE(pl.total, 0) > 0 THEN 25 ELSE 0 END +
         CASE WHEN COALESCE(att.total_sessions, 0) > 0 THEN 25 ELSE 0 END +
         CASE WHEN COALESCE(gs.total, 0) > 0 THEN 25 ELSE 0 END +
         CASE WHEN COALESCE(os.total, 0) > 0 THEN 25 ELSE 0 END)::numeric, 0
      ) AS r_score,
      COALESCE(pl.approved::integer, 0) AS pl_approved,
      COALESCE(pl.total::integer, 0) AS pl_total,
      COALESCE(pl.signed::integer, 0) AS pl_signed,
      COALESCE(pl.returned::integer, 0) AS pl_returned,
      COALESCE(att.total_sessions::integer, 0) AS att_total,
      COALESCE(gs.closed::integer, 0) AS gs_closed,
      COALESCE(gs.total::integer, 0) AS gs_total,
      COALESCE(os.signed::integer, 0) AS os_signed,
      COALESCE(os.total::integer, 0) AS os_total
    FROM prof_schools ps
    LEFT JOIN prof_profiles pp ON pp.user_id = ps.user_id
    LEFT JOIN planning_stats pl ON pl.pid = ps.user_id
    LEFT JOIN attendance_stats att ON att.pid = ps.pid
    LEFT JOIN grade_stats gs ON gs.pid = ps.pid
    LEFT JOIN orientation_stats os ON os.pid = ps.pid
  )
  SELECT
    s.pid,
    s.full_name::text,
    s.sid,
    s.sname::text,
    s.scity::text,
    s.avatar_url::text,
    ROUND(s.p_score, 1),
    ROUND(s.a_score, 1),
    ROUND(s.g_score, 1),
    ROUND(s.o_score, 1),
    ROUND(s.r_score, 1),
    ROUND(s.p_score * 0.30 + s.a_score * 0.25 + s.g_score * 0.20 + s.o_score * 0.15 + s.r_score * 0.10, 1),
    s.pl_approved,
    s.pl_total,
    s.pl_signed,
    s.pl_returned,
    s.att_total,
    s.gs_closed,
    s.gs_total,
    s.os_signed,
    s.os_total
  FROM scores s
  ORDER BY (s.p_score * 0.30 + s.a_score * 0.25 + s.g_score * 0.20 + s.o_score * 0.15 + s.r_score * 0.10) DESC;
END;
$$;
