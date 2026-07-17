-- Drop the existing constraint that requires class_group_id and subject_id for ALL rows
ALTER TABLE public.weekly_teaching_models DROP CONSTRAINT check_class_type_requirements;

-- Re-create constraint: only CLASS type requires class_group_id and subject_id
ALTER TABLE public.weekly_teaching_models ADD CONSTRAINT check_class_type_requirements 
  CHECK (
    (schedule_type = 'PLANNING') OR 
    (schedule_type = 'CLASS' AND class_group_id IS NOT NULL AND subject_id IS NOT NULL)
  );