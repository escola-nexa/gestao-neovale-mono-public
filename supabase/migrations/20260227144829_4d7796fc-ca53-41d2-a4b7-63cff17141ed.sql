
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS coordenador_pedagogico text DEFAULT '',
  ADD COLUMN IF NOT EXISTS coordenador_pedagogico_telefone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS coordenador_pedagogico_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS coordenador_pedagogico_turno text DEFAULT '';
