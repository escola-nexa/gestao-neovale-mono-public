-- Drop existing policy
DROP POLICY IF EXISTS "Professors can update own draft plannings" ON public.teacher_plannings;

-- Recreate with proper USING + WITH CHECK
-- USING: professor can update rows where status is DRAFT, REJECTED, DEVOLVIDO, or AGUARDANDO_ASSINATURA
-- WITH CHECK: the resulting row can have status DRAFT, ENVIADO, REJECTED, DEVOLVIDO, or AGUARDANDO_ASSINATURA
CREATE POLICY "Professors can update own draft plannings"
ON public.teacher_plannings
FOR UPDATE
USING (
  (professor_id = auth.uid()) 
  AND (status = ANY (ARRAY[
    'DRAFT'::teacher_planning_status, 
    'REJECTED'::teacher_planning_status, 
    'DEVOLVIDO'::teacher_planning_status, 
    'AGUARDANDO_ASSINATURA'::teacher_planning_status
  ]))
)
WITH CHECK (
  (professor_id = auth.uid()) 
  AND (status = ANY (ARRAY[
    'DRAFT'::teacher_planning_status, 
    'ENVIADO'::teacher_planning_status, 
    'REJECTED'::teacher_planning_status, 
    'DEVOLVIDO'::teacher_planning_status, 
    'AGUARDANDO_ASSINATURA'::teacher_planning_status
  ]))
);