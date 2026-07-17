-- Create semester enum type
CREATE TYPE subject_semester AS ENUM ('FIRST', 'SECOND');

-- Add semester and total_classes columns to subjects table
ALTER TABLE public.subjects 
ADD COLUMN semester subject_semester NOT NULL DEFAULT 'FIRST',
ADD COLUMN total_classes integer NOT NULL DEFAULT 0;

-- Create unique constraint for code + course_id + semester
ALTER TABLE public.subjects
ADD CONSTRAINT subjects_code_course_semester_unique 
UNIQUE (course_id, codigo, semester);

-- Create function to calculate total classes for a subject
CREATE OR REPLACE FUNCTION public.calculate_subject_total_classes(
  p_subject_id uuid
)
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
  -- Get subject info
  SELECT organization_id, semester, carga_horaria_semanal
  INTO v_org_id, v_semester, v_weekly_hours
  FROM public.subjects
  WHERE id = p_subject_id AND deleted_at IS NULL;
  
  IF v_org_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = v_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Determine semester date range based on bimesters
  IF v_semester = 'FIRST' THEN
    -- First semester: bimesters 1 and 2
    SELECT MIN(start_date), MAX(end_date)
    INTO v_start_date, v_end_date
    FROM public.academic_bimesters
    WHERE calendar_id = v_calendar_id AND number IN (1, 2);
  ELSE
    -- Second semester: bimesters 3 and 4
    SELECT MIN(start_date), MAX(end_date)
    INTO v_start_date, v_end_date
    FROM public.academic_bimesters
    WHERE calendar_id = v_calendar_id AND number IN (3, 4);
  END IF;
  
  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count LETIVO days in the semester range
  SELECT COUNT(*)
  INTO v_letivo_count
  FROM public.calendar_events
  WHERE calendar_id = v_calendar_id
    AND event_type = 'LETIVO'
    AND event_date >= v_start_date
    AND event_date <= v_end_date;
  
  -- Calculate total classes (weekly hours * weeks in semester)
  -- Approximation: letivo days / 5 (weekdays) * weekly hours
  v_total_classes := GREATEST(1, (v_letivo_count / 5) * v_weekly_hours);
  
  RETURN v_total_classes;
END;
$function$;

-- Create function to update total_classes on subject
CREATE OR REPLACE FUNCTION public.update_subject_total_classes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total_classes := calculate_subject_total_classes(NEW.id);
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-calculate on insert/update
CREATE TRIGGER trigger_update_subject_total_classes
BEFORE INSERT OR UPDATE OF semester, carga_horaria_semanal ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_total_classes();

-- Create function to recalculate all subjects when calendar changes
CREATE OR REPLACE FUNCTION public.recalculate_subjects_on_calendar_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get organization from calendar
  IF TG_TABLE_NAME = 'academic_calendars' THEN
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'academic_bimesters' THEN
    SELECT organization_id INTO v_org_id
    FROM public.academic_calendars
    WHERE id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'calendar_events' THEN
    SELECT organization_id INTO v_org_id
    FROM public.academic_calendars
    WHERE id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  END IF;
  
  -- Recalculate all subjects for this organization
  UPDATE public.subjects
  SET total_classes = calculate_subject_total_classes(id)
  WHERE organization_id = v_org_id AND deleted_at IS NULL;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Triggers for calendar changes
CREATE TRIGGER trigger_recalc_subjects_on_calendar
AFTER INSERT OR UPDATE OR DELETE ON public.academic_calendars
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_subjects_on_calendar_change();

CREATE TRIGGER trigger_recalc_subjects_on_bimester
AFTER INSERT OR UPDATE OR DELETE ON public.academic_bimesters
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_subjects_on_calendar_change();

CREATE TRIGGER trigger_recalc_subjects_on_event
AFTER INSERT OR UPDATE OR DELETE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_subjects_on_calendar_change();

-- Helper function to get current semester based on date
CREATE OR REPLACE FUNCTION public.get_current_semester(p_org_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS subject_semester
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
  v_second_semester_start date;
BEGIN
  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = p_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN 'FIRST';
  END IF;
  
  -- Get start of 3rd bimester (start of 2nd semester)
  SELECT MIN(start_date) INTO v_second_semester_start
  FROM public.academic_bimesters
  WHERE calendar_id = v_calendar_id AND number = 3;
  
  IF v_second_semester_start IS NULL OR p_date < v_second_semester_start THEN
    RETURN 'FIRST';
  ELSE
    RETURN 'SECOND';
  END IF;
END;
$function$;

-- Function to validate if a date is within a subject's semester
CREATE OR REPLACE FUNCTION public.is_date_in_subject_semester(
  p_subject_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_semester subject_semester;
  v_calendar_id uuid;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Get subject info
  SELECT organization_id, semester
  INTO v_org_id, v_semester
  FROM public.subjects
  WHERE id = p_subject_id AND deleted_at IS NULL;
  
  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get active calendar
  SELECT id INTO v_calendar_id
  FROM public.academic_calendars
  WHERE organization_id = v_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get semester date range
  IF v_semester = 'FIRST' THEN
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
  
  RETURN p_date >= v_start_date AND p_date <= v_end_date;
END;
$function$;