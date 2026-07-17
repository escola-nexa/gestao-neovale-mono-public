-- Drop the incorrect foreign key that references auth.users
ALTER TABLE public.weekly_teaching_models 
DROP CONSTRAINT IF EXISTS weekly_teaching_models_professor_id_fkey;

-- Create the correct foreign key that references professors table
ALTER TABLE public.weekly_teaching_models 
ADD CONSTRAINT weekly_teaching_models_professor_id_fkey 
FOREIGN KEY (professor_id) REFERENCES public.professors(id) ON DELETE CASCADE;