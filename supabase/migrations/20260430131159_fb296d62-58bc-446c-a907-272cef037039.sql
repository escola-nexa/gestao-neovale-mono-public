-- Permitir vinculo professor x escola sem curso
ALTER TABLE public.professor_school_courses
  ALTER COLUMN course_id DROP NOT NULL;

-- Substituir constraint unique por dois indices unicos parciais
-- (1) com curso definido, nao permite duplicidade exata
-- (2) sem curso, garante apenas 1 vinculo "somente escola" por (prof, escola)
ALTER TABLE public.professor_school_courses
  DROP CONSTRAINT IF EXISTS professor_school_course_unique;

CREATE UNIQUE INDEX IF NOT EXISTS professor_school_course_unique_with_course
  ON public.professor_school_courses (professor_id, school_id, course_id)
  WHERE course_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS professor_school_course_unique_without_course
  ON public.professor_school_courses (professor_id, school_id)
  WHERE course_id IS NULL;