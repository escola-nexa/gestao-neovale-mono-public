
-- Add bimester and week columns to lesson_materials for weekly calendar integration
ALTER TABLE public.lesson_materials 
  ADD COLUMN bimester_number integer,
  ADD COLUMN week_number integer;

-- Index for fast lookup by subject + bimester + week
CREATE INDEX idx_lesson_materials_subject_week 
  ON public.lesson_materials (subject_id, bimester_number, week_number);
