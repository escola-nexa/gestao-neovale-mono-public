-- Function to populate LETIVO days for a calendar
-- This function creates LETIVO events for all weekdays (Monday-Friday) 
-- within the calendar's date range, excluding weekends and existing events

CREATE OR REPLACE FUNCTION public.populate_letivo_days(p_calendar_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get calendar dates
  SELECT start_date, end_date 
  INTO v_start_date, v_end_date
  FROM public.academic_calendars
  WHERE id = p_calendar_id;

  IF v_start_date IS NULL THEN
    RAISE EXCEPTION 'Calendar not found';
  END IF;

  -- Loop through all dates in the range
  v_current_date := v_start_date;
  
  WHILE v_current_date <= v_end_date LOOP
    -- Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Only add weekdays (Monday-Friday: 1-5)
    IF v_day_of_week BETWEEN 1 AND 5 THEN
      -- Check if event already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM public.calendar_events
        WHERE calendar_id = p_calendar_id
        AND event_date = v_current_date
      ) THEN
        -- Insert LETIVO event
        INSERT INTO public.calendar_events (calendar_id, event_date, event_type)
        VALUES (p_calendar_id, v_current_date, 'LETIVO');
        
        v_count := v_count + 1;
      END IF;
    END IF;
    
    -- Move to next day
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.populate_letivo_days(UUID) TO authenticated;

COMMENT ON FUNCTION public.populate_letivo_days(UUID) IS 
'Populates LETIVO (school days) events for all weekdays in a calendar period. 
Returns the number of days created. Skips weekends and existing events.';
