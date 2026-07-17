
-- Table to track user audit events (login, module access, actions)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  user_role text,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  module text NOT NULL,
  action text NOT NULL,
  action_result text DEFAULT 'success',
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_audit_events_org_user ON public.audit_events(organization_id, user_id);
CREATE INDEX idx_audit_events_org_created ON public.audit_events(organization_id, created_at DESC);
CREATE INDEX idx_audit_events_module ON public.audit_events(organization_id, module);

-- Table to track user activity summary (last access, total accesses, etc.)
CREATE TABLE public.user_activity_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  user_email text,
  user_name text,
  user_role text,
  last_access_at timestamptz,
  first_access_at timestamptz,
  total_access_count integer DEFAULT 0,
  access_today boolean DEFAULT false,
  last_7_days_count integer DEFAULT 0,
  last_30_days_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_org ON public.user_activity_summary(organization_id);
CREATE INDEX idx_user_activity_last_access ON public.user_activity_summary(organization_id, last_access_at DESC);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_events: admin sees all, coordinator sees org scope
CREATE POLICY "Admins can read all audit events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Coordinators can read org audit events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "System can insert audit events"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

-- RLS Policies for user_activity_summary
CREATE POLICY "Admins can read all activity"
  ON public.user_activity_summary FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Coordinators can read org activity"
  ON public.user_activity_summary FOR SELECT TO authenticated
  USING (is_coordinator(auth.uid(), organization_id));

CREATE POLICY "System can insert activity"
  ON public.user_activity_summary FOR INSERT TO authenticated
  WITH CHECK (has_organization_access(auth.uid(), organization_id));

CREATE POLICY "System can update activity"
  ON public.user_activity_summary FOR UPDATE TO authenticated
  USING (has_organization_access(auth.uid(), organization_id));

-- Function to record a login and update activity summary
CREATE OR REPLACE FUNCTION public.record_user_login(
  p_org_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert audit event
  INSERT INTO public.audit_events (organization_id, user_id, user_email, user_name, user_role, module, action, ip_address, user_agent)
  VALUES (p_org_id, p_user_id, p_email, p_name, p_role, 'auth', 'login', p_ip, p_user_agent);

  -- Upsert activity summary
  INSERT INTO public.user_activity_summary (organization_id, user_id, user_email, user_name, user_role, last_access_at, first_access_at, total_access_count, access_today)
  VALUES (p_org_id, p_user_id, p_email, p_name, p_role, now(), now(), 1, true)
  ON CONFLICT (user_id) DO UPDATE SET
    last_access_at = now(),
    user_email = EXCLUDED.user_email,
    user_name = EXCLUDED.user_name,
    user_role = EXCLUDED.user_role,
    total_access_count = user_activity_summary.total_access_count + 1,
    access_today = true,
    updated_at = now();
END;
$$;

-- Function to get audit dashboard KPIs
CREATE OR REPLACE FUNCTION public.get_audit_dashboard_kpis(p_org_id uuid)
RETURNS TABLE(
  total_users bigint,
  active_today bigint,
  active_7_days bigint,
  active_30_days bigint,
  never_accessed bigint,
  inactive_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_users AS (
    SELECT ur.user_id, uas.last_access_at, uas.total_access_count
    FROM public.user_roles ur
    LEFT JOIN public.user_activity_summary uas ON uas.user_id = ur.user_id
    WHERE ur.organization_id = p_org_id
  )
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE last_access_at >= CURRENT_DATE)::bigint,
    COUNT(*) FILTER (WHERE last_access_at >= CURRENT_DATE - INTERVAL '7 days')::bigint,
    COUNT(*) FILTER (WHERE last_access_at >= CURRENT_DATE - INTERVAL '30 days')::bigint,
    COUNT(*) FILTER (WHERE last_access_at IS NULL)::bigint,
    COUNT(*) FILTER (WHERE last_access_at IS NOT NULL AND last_access_at < CURRENT_DATE - INTERVAL '30 days')::bigint
  FROM all_users;
END;
$$;
