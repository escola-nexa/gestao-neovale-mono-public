
-- Add logistics fields to school_visits
ALTER TABLE public.school_visits
  ADD COLUMN IF NOT EXISTS departure_point text DEFAULT '',
  ADD COLUMN IF NOT EXISTS daily_start_time time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS daily_end_time time DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS visit_duration_minutes integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS interval_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS travel_time_minutes integer DEFAULT 15;

-- Add planned schedule fields to school_visit_schools
ALTER TABLE public.school_visit_schools
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS planned_arrival time,
  ADD COLUMN IF NOT EXISTS planned_departure time,
  ADD COLUMN IF NOT EXISTS day_order integer DEFAULT 0;
