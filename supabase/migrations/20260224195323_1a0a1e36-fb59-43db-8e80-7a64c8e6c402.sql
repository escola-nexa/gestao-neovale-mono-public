
-- Allow coordinators to manage calendar events
CREATE POLICY "Coordinators can manage calendar events"
ON public.calendar_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM academic_calendars ac
    WHERE ac.id = calendar_events.calendar_id
    AND is_coordinator(auth.uid(), ac.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM academic_calendars ac
    WHERE ac.id = calendar_events.calendar_id
    AND is_coordinator(auth.uid(), ac.organization_id)
  )
);

-- Allow coordinators to manage academic bimesters
CREATE POLICY "Coordinators can manage bimesters"
ON public.academic_bimesters
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM academic_calendars ac
    WHERE ac.id = academic_bimesters.calendar_id
    AND is_coordinator(auth.uid(), ac.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM academic_calendars ac
    WHERE ac.id = academic_bimesters.calendar_id
    AND is_coordinator(auth.uid(), ac.organization_id)
  )
);
