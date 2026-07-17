
-- Add city column to calendar_events (null = applies to all cities)
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS city text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.calendar_events.city IS 'City name this event applies to. NULL means all cities.';
