
-- Drop the old constraint that forces PLANNING to have NULL class_group_id and subject_id
ALTER TABLE public.weekly_teaching_models DROP CONSTRAINT IF EXISTS check_class_type_requirements;

-- Add new constraint: both CLASS and PLANNING require class_group_id and subject_id
ALTER TABLE public.weekly_teaching_models ADD CONSTRAINT check_class_type_requirements
  CHECK (class_group_id IS NOT NULL AND subject_id IS NOT NULL);
