-- Fix: generate_annual_occurrences must respect subject.semester to avoid duplicating
-- classes when the same slot has two ACTIVE weekly_teaching_models for a UCP pair
-- (FIRST + SECOND semester subjects sharing the same weekday/time).

CREATE OR REPLACE FUNCTION public.generate_annual_occurrences(p_model_id uuid, p_start_date date, p_end_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_model RECORD;
  v_dow int;
  v_inserted int := 0;
  v_subj_semester text;
  v_calendar_id uuid;
  v_eff_start date := p_start_date;
  v_eff_end date := p_end_date;
  v_sem_start date;
  v_sem_end date;
BEGIN
  SELECT id, organization_id, weekday, start_time, end_time, status, subject_id, schedule_type
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

  -- Only CLASS rows with a subject filter by semester. PLANNING and rows without
  -- subject keep the full range provided by the caller.
  IF v_model.schedule_type = 'CLASS' AND v_model.subject_id IS NOT NULL THEN
    SELECT semester::text INTO v_subj_semester FROM subjects WHERE id = v_model.subject_id;
    IF v_subj_semester IN ('FIRST','SECOND') THEN
      SELECT ac.id INTO v_calendar_id
        FROM academic_calendars ac
       WHERE ac.organization_id = v_model.organization_id
         AND ac.status = 'ACTIVE'
       LIMIT 1;
      IF v_calendar_id IS NOT NULL THEN
        IF v_subj_semester = 'FIRST' THEN
          SELECT MIN(start_date), MAX(end_date) INTO v_sem_start, v_sem_end
            FROM academic_bimesters
           WHERE calendar_id = v_calendar_id AND number IN (1,2);
        ELSE
          SELECT MIN(start_date), MAX(end_date) INTO v_sem_start, v_sem_end
            FROM academic_bimesters
           WHERE calendar_id = v_calendar_id AND number IN (3,4);
        END IF;
        IF v_sem_start IS NOT NULL AND v_sem_end IS NOT NULL THEN
          v_eff_start := GREATEST(p_start_date, v_sem_start);
          v_eff_end   := LEAST(p_end_date, v_sem_end);
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_eff_start > v_eff_end THEN
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
     AND ce.event_date BETWEEN v_eff_start AND v_eff_end
     AND EXTRACT(DOW FROM ce.event_date)::int = v_dow
     AND NOT EXISTS (
       SELECT 1 FROM annual_class_occurrences x
        WHERE x.weekly_model_id = v_model.id
          AND x.occurrence_date = ce.event_date
     );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;

-- Clean up duplicate occurrences created BEFORE this fix for CLASS rows whose subject
-- has a defined semester but the occurrence date is outside that semester.
DELETE FROM annual_class_occurrences ao
USING weekly_teaching_models wtm,
      subjects s,
      academic_calendars ac,
      academic_bimesters ab
WHERE ao.weekly_model_id = wtm.id
  AND wtm.schedule_type = 'CLASS'
  AND wtm.status = 'ACTIVE'
  AND wtm.subject_id = s.id
  AND s.semester IN ('FIRST','SECOND')
  AND ac.organization_id = wtm.organization_id
  AND ac.status = 'ACTIVE'
  AND ab.calendar_id = ac.id
  AND ao.occurrence_date BETWEEN ab.start_date AND ab.end_date
  AND (
    (s.semester = 'FIRST'  AND ab.number IN (3,4)) OR
    (s.semester = 'SECOND' AND ab.number IN (1,2))
  );