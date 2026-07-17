CREATE POLICY "Admins and coordinators can delete logs"
ON public.external_access_logs
FOR DELETE
TO authenticated
USING (has_organization_access(auth.uid(), organization_id));