
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS diretor_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS diretor_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS diretor_adjunto text DEFAULT '',
  ADD COLUMN IF NOT EXISTS diretor_adjunto_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS diretor_adjunto_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_1_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_1_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_2_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_2_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_3_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_3_email text DEFAULT '';
