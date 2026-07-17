
-- ============================================================
-- 1) GEOCODING NAS ESCOLAS
-- ============================================================
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

-- ============================================================
-- 2) ENUM DE STATUS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.visit_route_status AS ENUM ('planejada','em_andamento','finalizada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3) TABELA visit_routes (cabeçalho)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  code text,
  name text NOT NULL,
  supervisor_id uuid NOT NULL,
  departure_point text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.visit_route_status NOT NULL DEFAULT 'planejada',
  shift_start time NOT NULL DEFAULT '08:00',
  shift_end time NOT NULL DEFAULT '17:00',
  break_start time DEFAULT '12:00',
  break_end time DEFAULT '13:00',
  default_visit_minutes int NOT NULL DEFAULT 60,
  fuel_cost_per_km numeric NOT NULL DEFAULT 0.85,
  toll_estimated numeric NOT NULL DEFAULT 0,
  kml_per_liter numeric NOT NULL DEFAULT 10,
  fuel_price_per_liter numeric NOT NULL DEFAULT 6.0,
  total_km numeric NOT NULL DEFAULT 0,
  total_travel_minutes int NOT NULL DEFAULT 0,
  total_visit_minutes int NOT NULL DEFAULT 0,
  total_estimated_cost numeric NOT NULL DEFAULT 0,
  efficiency_score text,
  notes text,
  optimization_payload jsonb,
  legacy_visit_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text,
  CONSTRAINT visit_routes_dates_ck CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_visit_routes_org ON public.visit_routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_visit_routes_supervisor ON public.visit_routes(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_visit_routes_status ON public.visit_routes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visit_routes_dates ON public.visit_routes(start_date, end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_routes TO authenticated;
GRANT ALL ON public.visit_routes TO service_role;

ALTER TABLE public.visit_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_select_org" ON public.visit_routes
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'coordenador')
      OR public.has_role(auth.uid(),'rh')
      OR supervisor_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "routes_insert_managers" ON public.visit_routes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordenador') OR public.has_role(auth.uid(),'rh'))
    AND created_by = auth.uid()
  );

CREATE POLICY "routes_update_managers_or_supervisor" ON public.visit_routes
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'coordenador')
      OR public.has_role(auth.uid(),'rh')
      OR supervisor_id = auth.uid()
    )
  );

CREATE POLICY "routes_delete_admin" ON public.visit_routes
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.has_role(auth.uid(),'admin')
  );

-- ============================================================
-- 4) visit_route_cities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_route_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.visit_routes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  city text NOT NULL,
  uf text,
  school_count int NOT NULL DEFAULT 0,
  cluster_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vrc_route ON public.visit_route_cities(route_id);
CREATE INDEX IF NOT EXISTS idx_vrc_org_city ON public.visit_route_cities(organization_id, city);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_route_cities TO authenticated;
GRANT ALL ON public.visit_route_cities TO service_role;
ALTER TABLE public.visit_route_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vrc_all_via_route" ON public.visit_route_cities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visit_routes r WHERE r.id = visit_route_cities.route_id AND r.organization_id = public.get_user_organization_id(auth.uid())))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 5) visit_route_schools
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_route_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.visit_routes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NOT NULL,
  city text,
  uf text,
  lat numeric,
  lng numeric,
  route_order int NOT NULL DEFAULT 0,
  day_order int,
  planned_date date,
  planned_arrival time,
  planned_departure time,
  travel_from_previous_minutes int NOT NULL DEFAULT 0,
  distance_from_previous_km numeric NOT NULL DEFAULT 0,
  visit_minutes int,
  status text NOT NULL DEFAULT 'pendente',
  check_in_at timestamptz,
  check_out_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vrs_route ON public.visit_route_schools(route_id);
CREATE INDEX IF NOT EXISTS idx_vrs_school ON public.visit_route_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_vrs_org_city_date ON public.visit_route_schools(organization_id, city, planned_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_route_schools TO authenticated;
GRANT ALL ON public.visit_route_schools TO service_role;
ALTER TABLE public.visit_route_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vrs_all_via_route" ON public.visit_route_schools
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visit_routes r WHERE r.id = visit_route_schools.route_id AND r.organization_id = public.get_user_organization_id(auth.uid())))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 6) visit_route_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_route_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.visit_routes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vrl_route ON public.visit_route_logs(route_id, created_at DESC);

GRANT SELECT, INSERT ON public.visit_route_logs TO authenticated;
GRANT ALL ON public.visit_route_logs TO service_role;
ALTER TABLE public.visit_route_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vrl_select_via_route" ON public.visit_route_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visit_routes r WHERE r.id = visit_route_logs.route_id AND r.organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "vrl_insert_via_route" ON public.visit_route_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 7) visit_route_ai_recommendations (placeholder)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_route_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.visit_routes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vrar_route ON public.visit_route_ai_recommendations(route_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_route_ai_recommendations TO authenticated;
GRANT ALL ON public.visit_route_ai_recommendations TO service_role;
ALTER TABLE public.visit_route_ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vrar_all_via_route" ON public.visit_route_ai_recommendations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visit_routes r WHERE r.id = visit_route_ai_recommendations.route_id AND r.organization_id = public.get_user_organization_id(auth.uid())))
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================
-- 8) Trigger updated_at
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_visit_routes_updated ON public.visit_routes;
CREATE TRIGGER trg_visit_routes_updated BEFORE UPDATE ON public.visit_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vrs_updated ON public.visit_route_schools;
CREATE TRIGGER trg_vrs_updated BEFORE UPDATE ON public.visit_route_schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9) RPC: bloqueio de município por janela sobreposta
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_city_route_conflict(
  p_org uuid,
  p_city text,
  p_start date,
  p_end date,
  p_ignore_route uuid DEFAULT NULL
) RETURNS TABLE(route_id uuid, route_name text, start_date date, end_date date, status public.visit_route_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.start_date, r.end_date, r.status
  FROM public.visit_routes r
  JOIN public.visit_route_cities c ON c.route_id = r.id
  WHERE r.organization_id = p_org
    AND r.deleted_at IS NULL
    AND r.status IN ('planejada','em_andamento')
    AND lower(c.city) = lower(p_city)
    AND r.start_date <= p_end
    AND r.end_date   >= p_start
    AND (p_ignore_route IS NULL OR r.id <> p_ignore_route);
$$;

GRANT EXECUTE ON FUNCTION public.check_city_route_conflict(uuid,text,date,date,uuid) TO authenticated;

-- ============================================================
-- 10) RPC: transição de status com log
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_route_status(
  p_route uuid,
  p_new_status public.visit_route_status
) RETURNS public.visit_routes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_route public.visit_routes;
BEGIN
  UPDATE public.visit_routes SET status = p_new_status, updated_at = now()
    WHERE id = p_route
      AND organization_id = public.get_user_organization_id(auth.uid())
    RETURNING * INTO v_route;
  IF v_route.id IS NULL THEN RAISE EXCEPTION 'Rota não encontrada ou sem permissão'; END IF;

  INSERT INTO public.visit_route_logs(route_id, organization_id, actor_id, action, details)
    VALUES (p_route, v_route.organization_id, auth.uid(), 'status_change', jsonb_build_object('to', p_new_status));
  RETURN v_route;
END $$;

GRANT EXECUTE ON FUNCTION public.update_route_status(uuid, public.visit_route_status) TO authenticated;

-- ============================================================
-- 11) Migrar visitas legadas (idempotente)
-- ============================================================
DO $$
DECLARE v public.school_visits%ROWTYPE;
        v_route_id uuid;
        v_status public.visit_route_status;
        v_order int;
BEGIN
  FOR v IN SELECT * FROM public.school_visits WHERE deleted_at IS NULL LOOP
    -- skip if already migrated
    IF EXISTS (SELECT 1 FROM public.visit_routes WHERE legacy_visit_id = v.id) THEN CONTINUE; END IF;

    v_status := CASE LOWER(COALESCE(v.status,'planejada'))
      WHEN 'concluida' THEN 'finalizada'::public.visit_route_status
      WHEN 'concluída' THEN 'finalizada'::public.visit_route_status
      WHEN 'finalizada' THEN 'finalizada'::public.visit_route_status
      WHEN 'cancelada' THEN 'cancelada'::public.visit_route_status
      WHEN 'em_andamento' THEN 'em_andamento'::public.visit_route_status
      WHEN 'em andamento' THEN 'em_andamento'::public.visit_route_status
      ELSE 'planejada'::public.visit_route_status
    END;

    INSERT INTO public.visit_routes(
      organization_id, name, supervisor_id, departure_point,
      start_date, end_date, status, shift_start, shift_end,
      default_visit_minutes, notes, legacy_visit_id, created_by, created_at, updated_at
    ) VALUES (
      v.organization_id,
      COALESCE(NULLIF(v.action_name,''), 'Rota legada'),
      COALESCE(v.responsible_user_id, v.created_by),
      v.departure_point,
      COALESCE(v.start_datetime::date, CURRENT_DATE),
      COALESCE(v.end_datetime::date, v.start_datetime::date, CURRENT_DATE),
      v_status,
      COALESCE(v.daily_start_time, '08:00'),
      COALESCE(v.daily_end_time, '17:00'),
      COALESCE(v.visit_duration_minutes, 60),
      v.logistics_notes,
      v.id,
      COALESCE(v.created_by, v.responsible_user_id),
      v.created_at, v.updated_at
    ) RETURNING id INTO v_route_id;

    -- cities (distintas)
    INSERT INTO public.visit_route_cities(route_id, organization_id, city, school_count)
    SELECT v_route_id, v.organization_id, vs.city, COUNT(*)
      FROM public.school_visit_schools vs
      WHERE vs.visit_id = v.id AND vs.city IS NOT NULL
      GROUP BY vs.city;

    -- schools
    v_order := 0;
    INSERT INTO public.visit_route_schools(
      route_id, organization_id, school_id, city, route_order, day_order,
      planned_date, planned_arrival, planned_departure, status
    )
    SELECT v_route_id, v.organization_id, vs.school_id, vs.city,
           COALESCE(vs.route_order, ROW_NUMBER() OVER (ORDER BY vs.planned_date, vs.day_order, vs.created_at)),
           vs.day_order, vs.planned_date, vs.planned_arrival, vs.planned_departure,
           COALESCE(vs.visit_status, 'pendente')
      FROM public.school_visit_schools vs
      WHERE vs.visit_id = v.id;

    INSERT INTO public.visit_route_logs(route_id, organization_id, actor_id, action, details)
      VALUES (v_route_id, v.organization_id, v.created_by, 'legacy_migrated', jsonb_build_object('legacy_visit_id', v.id));
  END LOOP;
END $$;
