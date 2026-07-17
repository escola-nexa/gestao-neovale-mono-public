-- Fase 2: Execução em Campo (Rotas)

-- 1) Colunas de check-in/out com geo + fotos + ocorrências
ALTER TABLE public.visit_route_schools
  ADD COLUMN IF NOT EXISTS check_in_lat numeric,
  ADD COLUMN IF NOT EXISTS check_in_lng numeric,
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS check_in_photo_path text,
  ADD COLUMN IF NOT EXISTS check_out_lat numeric,
  ADD COLUMN IF NOT EXISTS check_out_lng numeric,
  ADD COLUMN IF NOT EXISTS check_out_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS check_out_photo_path text,
  ADD COLUMN IF NOT EXISTS occurrence_type text,
  ADD COLUMN IF NOT EXISTS occurrence_description text,
  ADD COLUMN IF NOT EXISTS executed_by uuid;

-- 2) RPC: check-in (exige foto + geo). Atualiza status p/ em_andamento se rota estava planejada.
CREATE OR REPLACE FUNCTION public.route_school_check_in(
  p_school_stop_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_accuracy_m numeric,
  p_photo_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route record;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_photo_path IS NULL OR length(p_photo_path) < 1 THEN
    RAISE EXCEPTION 'photo_required';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RAISE EXCEPTION 'geolocation_required';
  END IF;

  SELECT vrs.*, vr.supervisor_id, vr.status AS route_status, vr.organization_id AS org
    INTO v_route
  FROM public.visit_route_schools vrs
  JOIN public.visit_routes vr ON vr.id = vrs.route_id
  WHERE vrs.id = p_school_stop_id;

  IF v_route IS NULL THEN RAISE EXCEPTION 'stop_not_found'; END IF;

  -- Permissão: supervisor da rota, admin ou coordenador da org
  IF NOT (
    v_route.supervisor_id = v_uid
    OR public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'coordenador'::app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_route.check_in_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_checked_in';
  END IF;

  UPDATE public.visit_route_schools
     SET check_in_at = now(),
         check_in_lat = p_lat,
         check_in_lng = p_lng,
         check_in_accuracy_m = p_accuracy_m,
         check_in_photo_path = p_photo_path,
         executed_by = v_uid,
         status = 'em_andamento',
         updated_at = now()
   WHERE id = p_school_stop_id;

  -- Promove rota a em_andamento na 1ª parada
  UPDATE public.visit_routes
     SET status = 'em_andamento', updated_at = now()
   WHERE id = v_route.route_id AND status = 'planejada';

  INSERT INTO public.visit_route_logs(route_id, organization_id, actor_id, action, details)
  VALUES (v_route.route_id, v_route.org, v_uid, 'check_in',
          jsonb_build_object('stop_id', p_school_stop_id, 'lat', p_lat, 'lng', p_lng, 'accuracy_m', p_accuracy_m));
END;
$$;

-- 3) RPC: check-out (exige foto + geo; ocorrência opcional)
CREATE OR REPLACE FUNCTION public.route_school_check_out(
  p_school_stop_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_accuracy_m numeric,
  p_photo_path text,
  p_occurrence_type text DEFAULT NULL,
  p_occurrence_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route record;
  v_uid uuid := auth.uid();
  v_pending int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_photo_path IS NULL OR length(p_photo_path) < 1 THEN RAISE EXCEPTION 'photo_required'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN RAISE EXCEPTION 'geolocation_required'; END IF;

  SELECT vrs.*, vr.supervisor_id, vr.organization_id AS org
    INTO v_route
  FROM public.visit_route_schools vrs
  JOIN public.visit_routes vr ON vr.id = vrs.route_id
  WHERE vrs.id = p_school_stop_id;

  IF v_route IS NULL THEN RAISE EXCEPTION 'stop_not_found'; END IF;

  IF NOT (
    v_route.supervisor_id = v_uid
    OR public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'coordenador'::app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_route.check_in_at IS NULL THEN RAISE EXCEPTION 'check_in_required_first'; END IF;
  IF v_route.check_out_at IS NOT NULL THEN RAISE EXCEPTION 'already_checked_out'; END IF;

  UPDATE public.visit_route_schools
     SET check_out_at = now(),
         check_out_lat = p_lat,
         check_out_lng = p_lng,
         check_out_accuracy_m = p_accuracy_m,
         check_out_photo_path = p_photo_path,
         occurrence_type = p_occurrence_type,
         occurrence_description = p_occurrence_description,
         status = 'finalizada',
         updated_at = now()
   WHERE id = p_school_stop_id;

  INSERT INTO public.visit_route_logs(route_id, organization_id, actor_id, action, details)
  VALUES (v_route.route_id, v_route.org, v_uid, 'check_out',
          jsonb_build_object('stop_id', p_school_stop_id, 'lat', p_lat, 'lng', p_lng,
                             'accuracy_m', p_accuracy_m, 'occurrence_type', p_occurrence_type));

  -- Se todas as paradas concluídas, finaliza rota
  SELECT count(*) INTO v_pending
  FROM public.visit_route_schools
  WHERE route_id = v_route.route_id AND check_out_at IS NULL;

  IF v_pending = 0 THEN
    UPDATE public.visit_routes
       SET status = 'finalizada', updated_at = now()
     WHERE id = v_route.route_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_school_check_in(uuid, numeric, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.route_school_check_out(uuid, numeric, numeric, numeric, text, text, text) TO authenticated;