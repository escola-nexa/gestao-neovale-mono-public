-- 1) Realtime: REPLICA IDENTITY FULL + publication
ALTER TABLE public.school_time_slots REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_teaching_models REPLICA IDENTITY FULL;
ALTER TABLE public.annual_class_occurrences REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='school_time_slots') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_time_slots;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='weekly_teaching_models') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_teaching_models;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='annual_class_occurrences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_class_occurrences;
  END IF;
END $$;

-- 2) Trigger: ao alterar horário de um school_time_slot, propaga para os
-- weekly_teaching_models vinculados e para as ocorrências futuras agendadas.
CREATE OR REPLACE FUNCTION public.propagate_slot_time_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN

    -- Atualiza modelos que referenciam esse slot
    UPDATE public.weekly_teaching_models
       SET start_time = NEW.start_time,
           end_time   = NEW.end_time,
           updated_at = now()
     WHERE school_time_slot_id = NEW.id
       AND (start_time IS DISTINCT FROM NEW.start_time
            OR end_time IS DISTINCT FROM NEW.end_time);

    -- Atualiza ocorrências futuras SCHEDULED
    UPDATE public.annual_class_occurrences AS aco
       SET start_time = NEW.start_time,
           end_time   = NEW.end_time,
           updated_at = now()
      FROM public.weekly_teaching_models AS wtm
     WHERE aco.weekly_model_id = wtm.id
       AND wtm.school_time_slot_id = NEW.id
       AND aco.status = 'SCHEDULED'
       AND aco.occurrence_date >= CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_slot_time ON public.school_time_slots;
CREATE TRIGGER trg_propagate_slot_time
AFTER UPDATE OF start_time, end_time ON public.school_time_slots
FOR EACH ROW
EXECUTE FUNCTION public.propagate_slot_time_change();