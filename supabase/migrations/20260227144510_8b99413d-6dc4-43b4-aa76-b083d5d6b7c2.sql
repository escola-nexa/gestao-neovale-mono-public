
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_1_turno text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_2_turno text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supervisor_tecnico_3_turno text DEFAULT '';
