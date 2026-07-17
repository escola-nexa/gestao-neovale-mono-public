ALTER TABLE public.teacher_substitution_requests
  ADD COLUMN IF NOT EXISTS absence_attachments JSONB NOT NULL DEFAULT '[]'::jsonb;