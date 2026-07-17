ALTER TABLE public.professor_school_courses
  ADD COLUMN IF NOT EXISTS workload_morning_hours numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workload_afternoon_hours numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workload_night_hours numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workload_not_applicable boolean NOT NULL DEFAULT false;

UPDATE public.professor_school_courses
SET workload_not_applicable = true
WHERE (COALESCE(workload_morning_hours,0) + COALESCE(workload_afternoon_hours,0) + COALESCE(workload_night_hours,0)) = 0;

ALTER TABLE public.professor_school_courses
  DROP CONSTRAINT IF EXISTS professor_school_courses_workload_check;

ALTER TABLE public.professor_school_courses
  ADD CONSTRAINT professor_school_courses_workload_check
  CHECK (
    workload_not_applicable = true
    OR (workload_morning_hours + workload_afternoon_hours + workload_night_hours) > 0
  );