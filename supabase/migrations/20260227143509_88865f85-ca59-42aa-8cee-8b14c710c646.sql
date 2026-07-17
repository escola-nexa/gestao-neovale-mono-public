
-- Add separate address fields to schools table
ALTER TABLE public.schools 
  ADD COLUMN IF NOT EXISTS endereco_cep text DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco_rua text DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco_numero text DEFAULT '',
  ADD COLUMN IF NOT EXISTS endereco_bairro text DEFAULT '';
