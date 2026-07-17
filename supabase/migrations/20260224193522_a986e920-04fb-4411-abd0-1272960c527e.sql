
-- Add BEFORE INSERT trigger to also calculate total_classes on new subjects
CREATE OR REPLACE TRIGGER calculate_subject_total_classes_on_insert
BEFORE INSERT ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_total_classes();

-- Ensure the UPDATE trigger also exists
DROP TRIGGER IF EXISTS update_subject_total_classes ON public.subjects;
CREATE TRIGGER update_subject_total_classes
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_total_classes();

-- Recalculate all existing subjects to ensure they're up to date
UPDATE public.subjects
SET total_classes = calculate_subject_total_classes(id)
WHERE deleted_at IS NULL;
