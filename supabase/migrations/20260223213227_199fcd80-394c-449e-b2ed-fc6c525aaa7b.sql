
-- Add new columns for weekly format
ALTER TABLE public.pre_plannings 
  ADD COLUMN IF NOT EXISTS class_days_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS class_days_detail jsonb DEFAULT '[]'::jsonb;

-- Set defaults for pedagogical fields (allow empty on generation)
ALTER TABLE public.pre_plannings 
  ALTER COLUMN objective SET DEFAULT '',
  ALTER COLUMN competencies SET DEFAULT '',
  ALTER COLUMN contents SET DEFAULT '',
  ALTER COLUMN methodology SET DEFAULT '',
  ALTER COLUMN resources SET DEFAULT '',
  ALTER COLUMN evaluation SET DEFAULT '',
  ALTER COLUMN product SET DEFAULT '',
  ALTER COLUMN next_steps SET DEFAULT '';

-- Drop old unique index on class_date (daily format)
DROP INDEX IF EXISTS idx_pre_plannings_unique_class_date;

-- Create new unique index on week_number (weekly format)
CREATE UNIQUE INDEX idx_pre_plannings_unique_week 
ON public.pre_plannings (organization_id, professor_id, school_id, course_id, class_group_id, subject_id, bimester_number, week_number) 
WHERE deleted_at IS NULL;

-- Clean up old daily pre-plannings (user requested)
DELETE FROM public.planning_audit_log WHERE pre_planning_id IS NOT NULL;
UPDATE public.teacher_plannings SET pre_planning_id = NULL WHERE pre_planning_id IS NOT NULL;
DELETE FROM public.pre_plannings;
