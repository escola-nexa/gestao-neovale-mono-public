CREATE POLICY "Admins can delete external_access_logs"
ON public.external_access_logs
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));