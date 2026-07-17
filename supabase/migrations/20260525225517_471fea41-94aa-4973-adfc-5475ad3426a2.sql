
ALTER TABLE public.teacher_substitution_requests
  ADD COLUMN IF NOT EXISTS substitute_professor_phone text;
