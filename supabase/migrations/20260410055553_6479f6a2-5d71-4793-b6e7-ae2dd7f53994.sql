
-- 1) Temporal trends from bi_metric_snapshots
CREATE OR REPLACE FUNCTION public.get_bi_temporal_trends(
  p_org_id uuid,
  p_months_back integer DEFAULT 6
)
RETURNS TABLE(
  snapshot_month text,
  avg_compliance numeric,
  avg_risk numeric,
  avg_planning numeric,
  avg_attendance numeric,
  avg_grades numeric,
  total_teachers integer,
  teachers_critical integer,
  compliance_change numeric,
  risk_change numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT
      to_char(s.snapshot_date, 'YYYY-MM') AS month_key,
      to_char(s.snapshot_date, 'Mon/YY') AS month_label,
      ROUND(AVG(COALESCE(s.avg_compliance_score, 0)), 1) AS c_avg,
      ROUND(AVG(COALESCE(s.avg_risk_score, 0)), 1) AS r_avg,
      ROUND(AVG(COALESCE(s.avg_planning_score, 0)), 1) AS p_avg,
      ROUND(AVG(COALESCE(s.avg_attendance_score, 0)), 1) AS a_avg,
      ROUND(AVG(COALESCE(s.avg_grades_score, 0)), 1) AS g_avg,
      COALESCE(SUM(s.total_teachers), 0)::integer AS t_total,
      COALESCE(SUM(s.teachers_critical), 0)::integer AS t_critical
    FROM bi_metric_snapshots s
    WHERE s.organization_id = p_org_id
      AND s.scope_type = 'global'
      AND s.snapshot_date >= (CURRENT_DATE - (p_months_back || ' months')::interval)
    GROUP BY month_key, month_label
    ORDER BY month_key
  )
  SELECT
    m.month_label,
    m.c_avg,
    m.r_avg,
    m.p_avg,
    m.a_avg,
    m.g_avg,
    m.t_total,
    m.t_critical,
    ROUND(m.c_avg - COALESCE(LAG(m.c_avg) OVER (ORDER BY m.month_key), m.c_avg), 1) AS c_change,
    ROUND(m.r_avg - COALESCE(LAG(m.r_avg) OVER (ORDER BY m.month_key), m.r_avg), 1) AS r_change
  FROM monthly m
  ORDER BY m.month_key;
END;
$$;

-- 2) Student-level risk prediction
CREATE OR REPLACE FUNCTION public.get_student_risk_predictions(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL,
  p_absence_threshold numeric DEFAULT 0.20,
  p_min_weak_subjects integer DEFAULT 2
)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  school_id uuid,
  school_name text,
  class_group_id uuid,
  class_group_name text,
  course_name text,
  total_classes bigint,
  total_absences bigint,
  absence_rate numeric,
  subjects_below_average integer,
  weak_subject_names text[],
  risk_level text,
  risk_factors text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH enrolled_students AS (
    SELECT
      e.student_id AS sid,
      st.nome_completo AS sname,
      e.school_id AS schid,
      sc.nome AS schname,
      e.class_group_id AS cgid,
      cg.nome AS cgname,
      co.nome AS coname
    FROM enrollments e
    JOIN students st ON st.id = e.student_id
    JOIN schools sc ON sc.id = e.school_id
    JOIN class_groups cg ON cg.id = e.class_group_id
    JOIN courses co ON co.id = e.course_id
    WHERE e.organization_id = p_org_id
      AND e.status = 'ativa'
      AND (p_school_id IS NULL OR e.school_id = p_school_id)
  ),
  -- Attendance analysis
  attendance_data AS (
    SELECT
      ar.student_id AS sid,
      ar.class_group_id AS cgid,
      COUNT(*) AS total_records,
      COUNT(*) FILTER (WHERE ar.status IN ('falta', 'F', 'FALTA')) AS absences
    FROM attendance_records ar
    WHERE ar.organization_id = p_org_id
      AND (p_school_id IS NULL OR ar.class_group_id IN (
        SELECT cg2.id FROM class_groups cg2 WHERE cg2.school_id = p_school_id
      ))
    GROUP BY ar.student_id, ar.class_group_id
  ),
  -- Grade analysis per subject
  grade_analysis AS (
    SELECT
      sg.student_id AS sid,
      ga.grade_config_id,
      gc.class_group_id AS cgid,
      gc.subject_id,
      sub.nome AS subject_name,
      AVG(sg.score) AS student_avg,
      (SELECT AVG(sg2.score) FROM student_grades sg2
       JOIN grade_activities ga2 ON ga2.id = sg2.grade_activity_id
       WHERE ga2.grade_config_id = ga.grade_config_id AND sg2.score IS NOT NULL
      ) AS class_avg
    FROM student_grades sg
    JOIN grade_activities ga ON ga.id = sg.grade_activity_id
    JOIN grade_configurations gc ON gc.id = ga.grade_config_id
    JOIN subjects sub ON sub.id = gc.subject_id
    WHERE gc.organization_id = p_org_id
      AND (p_bimester_number IS NULL OR gc.bimester_number = p_bimester_number)
      AND sg.score IS NOT NULL
    GROUP BY sg.student_id, ga.grade_config_id, gc.class_group_id, gc.subject_id, sub.nome
  ),
  weak_subjects AS (
    SELECT
      ga2.sid,
      ga2.cgid,
      COUNT(*) AS weak_count,
      array_agg(DISTINCT ga2.subject_name) AS weak_names
    FROM grade_analysis ga2
    WHERE ga2.student_avg < ga2.class_avg
    GROUP BY ga2.sid, ga2.cgid
  ),
  combined AS (
    SELECT
      es.sid,
      es.sname,
      es.schid,
      es.schname,
      es.cgid,
      es.cgname,
      es.coname,
      COALESCE(ad.total_records, 0) AS t_classes,
      COALESCE(ad.absences, 0) AS t_absences,
      CASE WHEN COALESCE(ad.total_records, 0) = 0 THEN 0
        ELSE ROUND(ad.absences::numeric / ad.total_records, 3)
      END AS abs_rate,
      COALESCE(ws.weak_count, 0)::integer AS subj_below,
      COALESCE(ws.weak_names, ARRAY[]::text[]) AS w_names
    FROM enrolled_students es
    LEFT JOIN attendance_data ad ON ad.sid = es.sid AND ad.cgid = es.cgid
    LEFT JOIN weak_subjects ws ON ws.sid = es.sid AND ws.cgid = es.cgid
  )
  SELECT
    c.sid,
    c.sname::text,
    c.schid,
    c.schname::text,
    c.cgid,
    c.cgname::text,
    c.coname::text,
    c.t_classes,
    c.t_absences,
    c.abs_rate,
    c.subj_below,
    c.w_names,
    CASE
      WHEN c.abs_rate > p_absence_threshold AND c.subj_below >= p_min_weak_subjects THEN 'CRITICO'
      WHEN c.abs_rate > p_absence_threshold OR c.subj_below >= p_min_weak_subjects THEN 'ATENCAO'
      ELSE 'ADEQUADO'
    END::text AS r_level,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.abs_rate > p_absence_threshold THEN 'Faltas acima de ' || ROUND(p_absence_threshold * 100) || '%' END,
      CASE WHEN c.subj_below >= p_min_weak_subjects THEN 'Abaixo da média em ' || c.subj_below || ' disciplina(s)' END
    ], NULL)::text[] AS r_factors
  FROM combined c
  WHERE c.abs_rate > p_absence_threshold OR c.subj_below >= p_min_weak_subjects
  ORDER BY
    CASE
      WHEN c.abs_rate > p_absence_threshold AND c.subj_below >= p_min_weak_subjects THEN 0
      WHEN c.abs_rate > p_absence_threshold THEN 1
      ELSE 2
    END,
    c.abs_rate DESC;
END;
$$;

-- 3) Action recommendations generator
CREATE OR REPLACE FUNCTION public.get_bi_action_recommendations(
  p_org_id uuid,
  p_school_id uuid DEFAULT NULL,
  p_bimester_number integer DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  rec_priority text,
  rec_category text,
  target_type text,
  target_id uuid,
  target_name text,
  action_text text,
  reason_text text,
  impact_text text,
  impact_score integer,
  deadline_days integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_data AS (
    SELECT * FROM public.get_teacher_bi_summary(
      p_org_id, p_school_id, NULL, p_bimester_number, 1000, 0
    )
  ),
  -- Critical teachers needing immediate orientation
  critical_recs AS (
    SELECT
      'alta'::text AS priority,
      'Intervenção Pedagógica'::text AS category,
      'teacher'::text AS t_type,
      td.teacher_id AS t_id,
      td.teacher_name::text AS t_name,
      ('Agendar orientação prioritária — foco em ' ||
        CASE
          WHEN td.planning_score <= td.attendance_score AND td.planning_score <= td.grades_score THEN 'Planejamento'
          WHEN td.attendance_score <= td.grades_score THEN 'Frequência'
          ELSE 'Notas'
        END
      )::text AS action,
      ('Conformidade em ' || ROUND(td.compliance_score) || '%, risco ' || ROUND(td.risk_score) || '%')::text AS reason,
      'Evitar agravamento e regularizar pendências críticas'::text AS impact,
      GREATEST(1, ROUND(100 - td.compliance_score))::integer AS i_score,
      7 AS d_days
    FROM teacher_data td
    WHERE td.compliance_score < 60
    ORDER BY td.compliance_score ASC
    LIMIT 5
  ),
  -- Attendance regularization
  attendance_recs AS (
    SELECT
      'media'::text,
      'Regularização de Frequência'::text,
      'teacher'::text,
      td.teacher_id,
      td.teacher_name::text,
      ('Regularizar ' || GREATEST(0, td.total_expected_attendance - td.total_recorded_attendance) || ' lançamento(s) pendente(s)')::text,
      ('Score de frequência em ' || ROUND(td.attendance_score) || '%')::text,
      'Garantir acompanhamento de presença dos alunos'::text,
      GREATEST(1, ROUND(50 - td.attendance_score))::integer,
      15
    FROM teacher_data td
    WHERE td.attendance_score < 40 AND td.compliance_score >= 60
    ORDER BY td.attendance_score ASC
    LIMIT 5
  ),
  -- Grade closure
  grade_recs AS (
    SELECT
      CASE WHEN td.grades_score < 20 THEN 'alta' ELSE 'media' END::text,
      'Fechamento de Notas'::text,
      'teacher'::text,
      td.teacher_id,
      td.teacher_name::text,
      ('Fechar ' || GREATEST(0, td.total_expected_grades - td.total_completed_grades) || ' configuração(ões) de nota')::text,
      ('Score de notas em ' || ROUND(td.grades_score) || '%')::text,
      'Viabilizar boletins e relatórios acadêmicos'::text,
      GREATEST(1, ROUND(50 - td.grades_score))::integer,
      CASE WHEN td.grades_score < 20 THEN 7 ELSE 15 END
    FROM teacher_data td
    WHERE td.grades_score < 40 AND td.total_expected_grades > 0
    ORDER BY td.grades_score ASC
    LIMIT 5
  ),
  -- Student risk-based recommendations
  student_recs AS (
    SELECT
      'alta'::text,
      'Risco de Aluno'::text,
      'school'::text,
      sr.school_id,
      sr.school_name::text,
      ('Investigar ' || COUNT(*) || ' aluno(s) em risco pedagógico na turma ' || sr.class_group_name)::text,
      ('Alunos com faltas >20% ou notas abaixo da média em 2+ disciplinas')::text,
      'Prevenir evasão e reprovação'::text,
      80,
      7
    FROM public.get_student_risk_predictions(p_org_id, p_school_id, p_bimester_number) sr
    WHERE sr.risk_level = 'CRITICO'
    GROUP BY sr.school_id, sr.school_name, sr.class_group_name
    LIMIT 5
  ),
  all_recs AS (
    SELECT * FROM critical_recs
    UNION ALL SELECT * FROM attendance_recs
    UNION ALL SELECT * FROM grade_recs
    UNION ALL SELECT * FROM student_recs
  )
  SELECT * FROM all_recs
  ORDER BY
    CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
    i_score DESC
  LIMIT p_limit;
END;
$$;
