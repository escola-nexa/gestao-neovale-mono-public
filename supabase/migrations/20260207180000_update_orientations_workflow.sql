-- Update orientations table with new fields for rejection and signature
-- Add new status values and fields for the complete workflow

-- First, update the status check constraint to include new statuses
ALTER TABLE public.orientations 
DROP CONSTRAINT IF EXISTS orientations_status_check;

ALTER TABLE public.orientations 
ADD CONSTRAINT orientations_status_check 
CHECK (status IN ('PENDENTE', 'ACEITA', 'REJEITADA', 'FINALIZADA', 'AGENDADO', 'REALIZADO', 'CANCELADO'));

-- Add new fields for rejection
ALTER TABLE public.orientations
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add new fields for signature
ALTER TABLE public.orientations
ADD COLUMN IF NOT EXISTS signature_photo_url text;

ALTER TABLE public.orientations
ADD COLUMN IF NOT EXISTS signed_at timestamptz;

ALTER TABLE public.orientations
ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);

-- Update RLS policies to allow professors to update their orientations
CREATE POLICY "Professors can update their orientations"
ON public.orientations
FOR UPDATE
USING (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  has_organization_access(auth.uid(), organization_id)
  AND EXISTS (
    SELECT 1 FROM public.professors p
    WHERE p.id = orientations.professor_id
    AND p.user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON COLUMN public.orientations.rejection_reason IS 'Justificativa fornecida pelo professor ao rejeitar a orientação';
COMMENT ON COLUMN public.orientations.signature_photo_url IS 'URL da foto/selfie capturada no momento da assinatura';
COMMENT ON COLUMN public.orientations.signed_at IS 'Data e hora em que a orientação foi assinada pelo professor';
COMMENT ON COLUMN public.orientations.signed_by IS 'ID do usuário que assinou a orientação';
