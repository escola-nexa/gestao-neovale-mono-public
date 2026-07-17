
CREATE POLICY "Admins can delete any planning"
ON public.teacher_plannings
FOR DELETE
USING (is_admin(auth.uid()));
