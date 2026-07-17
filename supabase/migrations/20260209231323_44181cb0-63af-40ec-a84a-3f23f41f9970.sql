
-- Add justification column for finalizing without professor signature
ALTER TABLE public.teacher_plannings ADD COLUMN IF NOT EXISTS finalization_justification text;

-- Update RLS policy to allow professors to update when status is AGUARDANDO_ASSINATURA_COORDENADOR
DROP POLICY IF EXISTS "Professors can update own draft plannings" ON public.teacher_plannings;
CREATE POLICY "Professors can update own draft plannings"
ON public.teacher_plannings
FOR UPDATE
USING (
  professor_id = auth.uid()
  AND status = ANY(ARRAY[
    'DRAFT'::teacher_planning_status,
    'REJECTED'::teacher_planning_status,
    'DEVOLVIDO'::teacher_planning_status,
    'AGUARDANDO_ASSINATURA'::teacher_planning_status,
    'AGUARDANDO_ASSINATURA_COORDENADOR'::teacher_planning_status
  ])
)
WITH CHECK (
  professor_id = auth.uid()
  AND status = ANY(ARRAY[
    'DRAFT'::teacher_planning_status,
    'ENVIADO'::teacher_planning_status,
    'REJECTED'::teacher_planning_status,
    'DEVOLVIDO'::teacher_planning_status,
    'AGUARDANDO_ASSINATURA'::teacher_planning_status,
    'AGUARDANDO_ASSINATURA_COORDENADOR'::teacher_planning_status
  ])
);
