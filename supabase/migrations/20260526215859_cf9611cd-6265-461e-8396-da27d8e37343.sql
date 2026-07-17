ALTER TABLE public.orientations DROP CONSTRAINT IF EXISTS orientations_planning_slot_id_fkey;
ALTER TABLE public.orientations
  ADD CONSTRAINT orientations_planning_slot_id_fkey
  FOREIGN KEY (planning_slot_id) REFERENCES public.weekly_teaching_models(id) ON DELETE SET NULL;