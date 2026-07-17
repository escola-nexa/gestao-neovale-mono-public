
-- Drop the existing unique constraint that doesn't account for status
ALTER TABLE public.school_time_slots DROP CONSTRAINT IF EXISTS school_time_slots_school_id_weekday_slot_number_key;

-- Create a partial unique index that only applies to ACTIVE slots
CREATE UNIQUE INDEX school_time_slots_active_unique 
ON public.school_time_slots (school_id, weekday, slot_number) 
WHERE status = 'ACTIVE';
