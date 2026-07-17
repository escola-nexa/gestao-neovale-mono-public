
-- Fix orphaned enrollments: cancel enrollments for inactive students
UPDATE public.enrollments 
SET status = 'cancelada', data_encerramento = CURRENT_DATE, updated_at = now()
WHERE status = 'ativa' 
AND student_id IN (
  SELECT id FROM public.students WHERE status = 'inativo'
);

-- Create trigger to auto-cancel enrollments when student becomes inactive
CREATE OR REPLACE FUNCTION public.cancel_enrollments_on_student_inactive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'inativo' AND OLD.status = 'ativo' THEN
    UPDATE public.enrollments
    SET status = 'cancelada', data_encerramento = CURRENT_DATE, updated_at = now()
    WHERE student_id = NEW.id AND status = 'ativa';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cancel_enrollments_on_student_inactive ON public.students;
CREATE TRIGGER trg_cancel_enrollments_on_student_inactive
  AFTER UPDATE OF status ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_enrollments_on_student_inactive();
