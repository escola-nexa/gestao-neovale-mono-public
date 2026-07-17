ALTER TABLE public.weekly_teaching_models ADD COLUMN IF NOT EXISTS observation TEXT;
ALTER TABLE public.annual_class_occurrences ADD COLUMN IF NOT EXISTS observation TEXT;