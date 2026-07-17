-- Allow admins to delete planning audit logs
CREATE POLICY "Admins can delete audit logs"
ON public.planning_audit_log
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to delete digital signatures
CREATE POLICY "Admins can delete digital signatures"
ON public.digital_signatures
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));