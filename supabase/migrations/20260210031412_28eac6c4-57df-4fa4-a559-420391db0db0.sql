-- Add scheduling fields to orientations table
ALTER TABLE public.orientations 
  ADD COLUMN scheduled_date date,
  ADD COLUMN scheduled_start_time time without time zone,
  ADD COLUMN scheduled_end_time time without time zone,
  ADD COLUMN occurrence_id uuid REFERENCES public.annual_class_occurrences(id);

-- Create index for efficient date-based queries
CREATE INDEX idx_orientations_scheduled_date ON public.orientations(scheduled_date) WHERE deleted_at IS NULL;
