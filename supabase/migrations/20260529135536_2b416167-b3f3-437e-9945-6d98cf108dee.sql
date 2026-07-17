-- Remove a constraint antiga (school_id, weekday, slot_number) que bloqueava
-- incorretamente turnos diferentes que reutilizam o mesmo "número de aula"
DROP INDEX IF EXISTS public.school_time_slots_active_unique;

-- Nova unicidade: o que de fato identifica um bloco de horário é o intervalo
CREATE UNIQUE INDEX school_time_slots_active_unique
  ON public.school_time_slots (school_id, weekday, start_time, end_time)
  WHERE status = 'ACTIVE';

-- Índice auxiliar para ordenar/consultar por slot_number (não único)
CREATE INDEX IF NOT EXISTS school_time_slots_slot_number_idx
  ON public.school_time_slots (school_id, weekday, slot_number)
  WHERE status = 'ACTIVE';