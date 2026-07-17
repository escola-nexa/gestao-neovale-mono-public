
-- Fix: The trigger function must use NEW record fields directly on INSERT
-- because the row doesn't exist in the table yet during BEFORE INSERT
CREATE OR REPLACE FUNCTION public.update_subject_total_classes()
RETURNS trigger
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
  -- Use NEW record fields directly (works for both INSERT and UPDATE)
  v_org_id := NEW.organization_id;
  v_semester := NEW.semester;
  v_weekly_hours := NEW.carga_horaria_semanal;

  IF v_org_id IS NULL THEN
    NEW.total_classes := 0;
    RETURN NEW;
  END IF;

  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = v_org_id AND status = 'ACTIVE'
  LIMIT 1;

  IF v_calendar_id IS NULL THEN
    NEW.total_classes := 0;
    RETURN NEW;
  END IF;

  -- Determine semester date range based on bimesters
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

  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    NEW.total_classes := 0;
    RETURN NEW;
  END IF;

  -- Count LETIVO days in the semester range
  SELECT COUNT(*)
  INTO v_letivo_count
  FROM public.calendar_events
  WHERE calendar_id = v_calendar_id
    AND event_type = 'LETIVO'
    AND event_date >= v_start_date
    AND event_date <= v_end_date;

  -- Calculate total classes: letivo days / 5 weekdays * weekly hours
  v_total_classes := GREATEST(1, (v_letivo_count / 5) * v_weekly_hours);

  NEW.total_classes := v_total_classes;
  RETURN NEW;
END;
$function$;

-- Recreate triggers to cover all relevant column changes
DROP TRIGGER IF EXISTS calculate_subject_total_classes_on_insert ON public.subjects;
DROP TRIGGER IF EXISTS update_subject_total_classes ON public.subjects;
DROP TRIGGER IF EXISTS trigger_update_subject_total_classes ON public.subjects;

CREATE TRIGGER calculate_subject_total_classes_on_insert
BEFORE INSERT ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_total_classes();

CREATE TRIGGER update_subject_total_classes
BEFORE UPDATE OF semester, carga_horaria_semanal, organization_id ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_total_classes();

-- Recalculate all existing subjects
UPDATE public.subjects
SET total_classes = total_classes
WHERE deleted_at IS NULL;
