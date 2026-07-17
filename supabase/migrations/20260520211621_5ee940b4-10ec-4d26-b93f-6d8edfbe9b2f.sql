ALTER TABLE public.professor_school_courses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_psc_updated_at ON public.professor_school_courses;
CREATE TRIGGER trg_psc_updated_at
  BEFORE UPDATE ON public.professor_school_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();