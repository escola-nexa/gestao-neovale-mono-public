UPDATE public.professor_school_courses
SET workload_morning_hours = 1
WHERE (COALESCE(workload_morning_hours,0) + COALESCE(workload_afternoon_hours,0) + COALESCE(workload_night_hours,0)) = 0;

ALTER TABLE public.professor_school_courses
  DROP COLUMN IF EXISTS workload_not_applicable;

ALTER TABLE public.professor_school_courses
  ADD CONSTRAINT professor_school_courses_workload_check
  CHECK ((workload_morning_hours + workload_afternoon_hours + workload_night_hours) > 0);