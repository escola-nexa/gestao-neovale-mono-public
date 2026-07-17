ALTER TABLE public.professor_school_courses
  ADD COLUMN IF NOT EXISTS workload_filled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.professor_school_courses.workload_filled_at IS
  'Timestamp de confirmação manual da carga horária por turno. NULL = vínculo legado/sem CH real informada.';