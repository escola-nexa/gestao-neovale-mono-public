
-- Allow coordinators to manage ticket categories too
CREATE POLICY "Coordinators manage categories" ON public.ticket_categories
  FOR ALL USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));
