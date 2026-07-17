
-- 1) Permitir NULL nos campos que migram para occurrences
ALTER TABLE public.teacher_substitution_requests
  ALTER COLUMN absence_date DROP NOT NULL;

-- 2) Coluna denormalizada com todas as datas
ALTER TABLE public.teacher_substitution_requests
  ADD COLUMN IF NOT EXISTS absence_dates date[] NOT NULL DEFAULT ARRAY[]::date[];

-- 3) Trigger function: recalcula request pai a partir das occurrences
CREATE OR REPLACE FUNCTION public.tg_tsr_recalc_from_occurrences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_min_date date;
  v_dates date[];
  v_total numeric(10,2);
BEGIN
  v_request_id := COALESCE(NEW.substitution_request_id, OLD.substitution_request_id);
  IF v_request_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    MIN(scheduled_date),
    COALESCE(array_agg(DISTINCT scheduled_date ORDER BY scheduled_date), ARRAY[]::date[]),
    COALESCE(SUM(class_hours), 0)
  INTO v_min_date, v_dates, v_total
  FROM public.teacher_substitution_occurrences
  WHERE substitution_request_id = v_request_id;

  UPDATE public.teacher_substitution_requests
  SET
    absence_date     = COALESCE(v_min_date, absence_date),
    absence_dates    = v_dates,
    total_class_hours = v_total
  WHERE id = v_request_id
    AND (
      absence_date IS DISTINCT FROM COALESCE(v_min_date, absence_date)
      OR absence_dates IS DISTINCT FROM v_dates
      OR total_class_hours IS DISTINCT FROM v_total
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tso_recalc_parent_ins ON public.teacher_substitution_occurrences;
DROP TRIGGER IF EXISTS trg_tso_recalc_parent_upd ON public.teacher_substitution_occurrences;
DROP TRIGGER IF EXISTS trg_tso_recalc_parent_del ON public.teacher_substitution_occurrences;

CREATE TRIGGER trg_tso_recalc_parent_ins
AFTER INSERT ON public.teacher_substitution_occurrences
FOR EACH ROW EXECUTE FUNCTION public.tg_tsr_recalc_from_occurrences();

CREATE TRIGGER trg_tso_recalc_parent_upd
AFTER UPDATE OF scheduled_date, class_hours, substitution_request_id
ON public.teacher_substitution_occurrences
FOR EACH ROW EXECUTE FUNCTION public.tg_tsr_recalc_from_occurrences();

CREATE TRIGGER trg_tso_recalc_parent_del
AFTER DELETE ON public.teacher_substitution_occurrences
FOR EACH ROW EXECUTE FUNCTION public.tg_tsr_recalc_from_occurrences();
