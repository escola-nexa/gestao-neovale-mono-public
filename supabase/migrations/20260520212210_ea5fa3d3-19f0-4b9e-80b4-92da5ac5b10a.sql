CREATE OR REPLACE FUNCTION public.generate_annual_occurrences(
  p_model_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model RECORD;
  v_dow int;
  v_inserted int := 0;
BEGIN
  SELECT id, organization_id, weekday, start_time, end_time, status
    INTO v_model
    FROM weekly_teaching_models
   WHERE id = p_model_id;

  IF v_model.id IS NULL OR v_model.status <> 'ACTIVE' THEN
    RETURN 0;
  END IF;

  v_dow := CASE v_model.weekday::text
             WHEN 'SEGUNDA' THEN 1
             WHEN 'TERCA'   THEN 2
             WHEN 'QUARTA'  THEN 3
             WHEN 'QUINTA'  THEN 4
             WHEN 'SEXTA'   THEN 5
           END;
  IF v_dow IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO annual_class_occurrences
    (organization_id, weekly_model_id, occurrence_date, start_time, end_time, status)
  SELECT v_model.organization_id, v_model.id, ce.event_date,
         v_model.start_time, v_model.end_time, 'SCHEDULED'
    FROM calendar_events ce
    JOIN academic_calendars ac
      ON ac.id = ce.calendar_id
     AND ac.organization_id = v_model.organization_id
     AND ac.status = 'ACTIVE'
   WHERE ce.event_type = 'LETIVO'
     AND ce.event_date BETWEEN p_start_date AND p_end_date
     AND EXTRACT(DOW FROM ce.event_date)::int = v_dow
     AND NOT EXISTS (
       SELECT 1 FROM annual_class_occurrences x
        WHERE x.weekly_model_id = v_model.id
          AND x.occurrence_date = ce.event_date
     );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_annual_occurrences(uuid, date, date) FROM anon;
GRANT  EXECUTE ON FUNCTION public.generate_annual_occurrences(uuid, date, date) TO authenticated;