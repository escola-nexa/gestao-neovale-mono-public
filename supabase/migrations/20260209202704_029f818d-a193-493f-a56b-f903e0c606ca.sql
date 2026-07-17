
-- Drop the old unique index based on week_number
DROP INDEX IF EXISTS public.idx_pre_plannings_unique_professor_context;

-- Create new unique index based on class_date (one pre-planning per actual class day)
CREATE UNIQUE INDEX idx_pre_plannings_unique_class_date
ON public.pre_plannings (organization_id, professor_id, school_id, course_id, class_group_id, subject_id, class_date)
WHERE deleted_at IS NULL AND class_date IS NOT NULL;
