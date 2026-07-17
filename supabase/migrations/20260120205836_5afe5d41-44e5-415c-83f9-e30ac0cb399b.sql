-- Add missing foreign keys to weekly_teaching_models for proper joins
ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT weekly_teaching_models_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT weekly_teaching_models_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT weekly_teaching_models_class_group_id_fkey 
FOREIGN KEY (class_group_id) REFERENCES public.class_groups(id) ON DELETE SET NULL;

ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT weekly_teaching_models_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Create performance index for schedule conflict checks
CREATE INDEX IF NOT EXISTS idx_weekly_teaching_models_professor_schedule 
ON public.weekly_teaching_models (professor_id, weekday, start_time, end_time)
WHERE status = 'ACTIVE';