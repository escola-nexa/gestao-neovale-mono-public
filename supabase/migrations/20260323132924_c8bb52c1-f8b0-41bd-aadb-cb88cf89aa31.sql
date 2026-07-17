
-- Also update the standalone calculate function to handle ANNUAL semester
CREATE OR REPLACE FUNCTION public.calculate_subject_total_classes(p_subject_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_semester subject_semester;
  v_weekly_hours integer;
  v_calendar_id uuid;
  v_start_date date;
  v_end_date date;
  v_letivo_count integer;
  v_total_classes integer;
BEGIN
  SELECT organization_id, semester, carga_horaria_semanal
  INTO v_org_id, v_semester, v_weekly_hours
  FROM public.subjects
  WHERE id = p_subject_id AND deleted_at IS NULL;
  
  IF v_org_id IS NULL THEN RETURN 0; END IF;
  
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = v_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN RETURN 0; END IF;
  
  IF v_semester = 'ANNUAL' THEN
    SELECT MIN(start_date), MAX(end_date)
    INTO v_start_date, v_end_date
    FROM public.academic_bimesters
    WHERE calendar_id = v_calendar_id;
  ELSIF v_semester = 'FIRST' THEN
    SELECT MIN(start_date), MAX(end_date)
    INTO v_start_date, v_end_date
    FROM public.academic_bimesters
    WHERE calendar_id = v_calendar_id AND number IN (1, 2);
  ELSE
    SELECT MIN(start_date), MAX(end_date)
    INTO v_start_date, v_end_date
    FROM public.academic_bimesters
    WHERE calendar_id = v_calendar_id AND number IN (3, 4);
  END IF;
  
  IF v_start_date IS NULL OR v_end_date IS NULL THEN RETURN 0; END IF;
  
  SELECT COUNT(*)
  INTO v_letivo_count
  FROM public.calendar_events
  WHERE calendar_id = v_calendar_id
    AND event_type = 'LETIVO'
    AND event_date >= v_start_date
    AND event_date <= v_end_date;
  
  v_total_classes := GREATEST(1, (v_letivo_count / 5) * v_weekly_hours);
  
  RETURN v_total_classes;
END;
$function$;

-- Now force recalculation of ALL subjects using the fixed function
UPDATE public.subjects
SET total_classes = calculate_subject_total_classes(id)
WHERE deleted_at IS NULL;
