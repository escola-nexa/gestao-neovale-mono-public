-- Allow coordinators to manage academic calendars (not just admins)
CREATE POLICY "Coordinators can manage calendars"
ON public.academic_calendars
FOR ALL
USING (is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_coordinator(auth.uid(), organization_id));
