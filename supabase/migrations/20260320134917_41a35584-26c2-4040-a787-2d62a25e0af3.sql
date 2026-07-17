-- 1. Deactivate all professor_school_courses for soft-deleted professors
UPDATE public.professor_school_courses
SET status = 'INACTIVE'
WHERE professor_id IN (
  SELECT id FROM public.professors WHERE deleted_at IS NOT NULL
) AND status = 'ACTIVE';

-- 2. Create trigger to auto-deactivate bindings when professor is soft-deleted
CREATE OR REPLACE FUNCTION public.deactivate_bindings_on_professor_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE public.professor_school_courses
    SET status = 'INACTIVE'
    WHERE professor_id = NEW.id AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_bindings_on_professor_delete ON public.professors;
CREATE TRIGGER trg_deactivate_bindings_on_professor_delete
  BEFORE UPDATE ON public.professors
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_bindings_on_professor_delete();