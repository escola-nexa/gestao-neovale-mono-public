
-- Allow professors to update their own orientations (for signing)
CREATE POLICY "Professors can sign their orientations"
ON public.orientations
FOR UPDATE
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
  AND status = 'AGUARDANDO_ASSINATURA_PROFESSOR'
)
WITH CHECK (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
  AND status = 'ASSINADO_PROFESSOR'
);
