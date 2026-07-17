ALTER TABLE public.professor_documents
  ADD COLUMN IF NOT EXISTS registration_code text,
  ADD COLUMN IF NOT EXISTS specialization text;