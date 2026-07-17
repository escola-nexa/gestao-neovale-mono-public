
-- Create school_time_slots table
CREATE TABLE public.school_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  weekday public.weekday NOT NULL,
  slot_number integer NOT NULL,
  slot_label text NOT NULL DEFAULT '',
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, weekday, slot_number)
);

-- Trigger to update updated_at
CREATE TRIGGER update_school_time_slots_updated_at
  BEFORE UPDATE ON public.school_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: start_time < end_time
CREATE OR REPLACE FUNCTION public.validate_school_time_slot()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de término';
  END IF;

  -- Check for overlap on same school + weekday (excluding self)
  IF EXISTS (
    SELECT 1 FROM public.school_time_slots
    WHERE school_id = NEW.school_id
      AND weekday = NEW.weekday
      AND status = 'ACTIVE'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Conflito: já existe um horário que se sobrepõe neste dia';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_school_time_slot_trigger
  BEFORE INSERT OR UPDATE ON public.school_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_school_time_slot();

-- Enable RLS
ALTER TABLE public.school_time_slots ENABLE ROW LEVEL SECURITY;

-- Coordinators/admins: full CRUD
CREATE POLICY "Coordinators can manage school time slots"
  ON public.school_time_slots
  FOR ALL
  USING (
    public.has_organization_access(auth.uid(), organization_id)
    AND public.is_coordinator(auth.uid(), organization_id)
  )
  WITH CHECK (
    public.has_organization_access(auth.uid(), organization_id)
    AND public.is_coordinator(auth.uid(), organization_id)
  );

-- Professors: read-only
CREATE POLICY "Professors can view school time slots"
  ON public.school_time_slots
  FOR SELECT
  USING (
    public.has_organization_access(auth.uid(), organization_id)
  );

-- Add school_time_slot_id to weekly_teaching_models
ALTER TABLE public.weekly_teaching_models
  ADD COLUMN school_time_slot_id uuid REFERENCES public.school_time_slots(id);
