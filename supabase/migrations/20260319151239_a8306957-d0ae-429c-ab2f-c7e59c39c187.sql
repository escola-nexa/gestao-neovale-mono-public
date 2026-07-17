
-- Snapshot tables for BI historical data
CREATE TABLE IF NOT EXISTS public.bi_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  bimester_number integer,
  academic_year integer,
  scope_type text NOT NULL DEFAULT 'global',
  scope_id text,
  scope_name text,
  avg_compliance_score numeric DEFAULT 0,
  avg_risk_score numeric DEFAULT 0,
  total_teachers integer DEFAULT 0,
  teachers_critical integer DEFAULT 0,
  teachers_attention integer DEFAULT 0,
  teachers_excellent integer DEFAULT 0,
  total_pending integer DEFAULT 0,
  avg_planning_score numeric DEFAULT 0,
  avg_attendance_score numeric DEFAULT 0,
  avg_grades_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, snapshot_date, bimester_number, scope_type, scope_id)
);

ALTER TABLE public.bi_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org snapshots" ON public.bi_metric_snapshots
  FOR SELECT TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id));

CREATE INDEX idx_bi_snapshots_org_date ON public.bi_metric_snapshots(organization_id, snapshot_date);
CREATE INDEX idx_bi_snapshots_scope ON public.bi_metric_snapshots(organization_id, scope_type, scope_id);

-- BI quality audit results
CREATE TABLE IF NOT EXISTS public.bi_quality_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  screen_name text NOT NULL,
  route text NOT NULL,
  audit_type text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  issue_description text,
  severity text DEFAULT 'info',
  checked_at timestamptz DEFAULT now()
);

ALTER TABLE public.bi_quality_audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org audits" ON public.bi_quality_audit_results
  FOR SELECT TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins can insert audit results" ON public.bi_quality_audit_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid(), organization_id));

-- Function to capture a snapshot of current BI metrics
CREATE OR REPLACE FUNCTION public.capture_bi_snapshot(p_org_id uuid, p_bimester integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_global record;
  v_school record;
  v_city record;
BEGIN
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::integer INTO v_year;

  -- Global snapshot
  SELECT * INTO v_global FROM public.get_bi_summary_kpis(p_org_id, NULL, p_bimester);
  
  INSERT INTO public.bi_metric_snapshots (
    organization_id, snapshot_date, bimester_number, academic_year,
    scope_type, scope_id, scope_name,
    avg_compliance_score, avg_risk_score, total_teachers,
    teachers_critical, teachers_attention, teachers_excellent,
    total_pending, avg_planning_score, avg_attendance_score, avg_grades_score
  ) VALUES (
    p_org_id, CURRENT_DATE, p_bimester, v_year,
    'global', 'global', 'Global',
    COALESCE(v_global.avg_compliance_score, 0),
    COALESCE(v_global.avg_risk_score, 0),
    COALESCE(v_global.total_active_teachers, 0),
    COALESCE(v_global.teachers_critical, 0),
    COALESCE(v_global.teachers_attention, 0),
    COALESCE(v_global.teachers_full_compliance, 0),
    COALESCE(v_global.total_pending, 0),
    0, 0, 0
  )
  ON CONFLICT (organization_id, snapshot_date, bimester_number, scope_type, scope_id) 
  DO UPDATE SET
    avg_compliance_score = EXCLUDED.avg_compliance_score,
    avg_risk_score = EXCLUDED.avg_risk_score,
    total_teachers = EXCLUDED.total_teachers,
    teachers_critical = EXCLUDED.teachers_critical,
    teachers_attention = EXCLUDED.teachers_attention,
    teachers_excellent = EXCLUDED.teachers_excellent,
    total_pending = EXCLUDED.total_pending;

  -- School snapshots
  FOR v_school IN SELECT * FROM public.get_school_bi_summary(p_org_id, p_bimester)
  LOOP
    INSERT INTO public.bi_metric_snapshots (
      organization_id, snapshot_date, bimester_number, academic_year,
      scope_type, scope_id, scope_name,
      avg_compliance_score, avg_risk_score, total_teachers
    ) VALUES (
      p_org_id, CURRENT_DATE, p_bimester, v_year,
      'school', v_school.school_id::text, v_school.school_name,
      v_school.compliance_avg, v_school.risk_avg, v_school.total_teachers
    )
    ON CONFLICT (organization_id, snapshot_date, bimester_number, scope_type, scope_id)
    DO UPDATE SET
      avg_compliance_score = EXCLUDED.avg_compliance_score,
      avg_risk_score = EXCLUDED.avg_risk_score,
      total_teachers = EXCLUDED.total_teachers;
  END LOOP;

  -- City snapshots
  FOR v_city IN SELECT * FROM public.get_city_bi_summary(p_org_id, p_bimester)
  LOOP
    INSERT INTO public.bi_metric_snapshots (
      organization_id, snapshot_date, bimester_number, academic_year,
      scope_type, scope_id, scope_name,
      avg_compliance_score, avg_risk_score, total_teachers
    ) VALUES (
      p_org_id, CURRENT_DATE, p_bimester, v_year,
      'city', v_city.city_name, v_city.city_name,
      v_city.compliance_avg, v_city.risk_avg, v_city.total_teachers
    )
    ON CONFLICT (organization_id, snapshot_date, bimester_number, scope_type, scope_id)
    DO UPDATE SET
      avg_compliance_score = EXCLUDED.avg_compliance_score,
      avg_risk_score = EXCLUDED.avg_risk_score,
      total_teachers = EXCLUDED.total_teachers;
  END LOOP;
END;
$$;
