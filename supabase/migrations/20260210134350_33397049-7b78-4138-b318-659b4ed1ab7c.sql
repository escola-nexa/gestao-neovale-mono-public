
-- Make professor_id nullable to allow creating schedule slots without professor
ALTER TABLE public.weekly_teaching_models 
  ALTER COLUMN professor_id DROP NOT NULL;
