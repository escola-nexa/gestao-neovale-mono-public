ALTER TABLE public.teacher_substitution_requests DROP CONSTRAINT IF EXISTS chk_tsr_phase;
ALTER TABLE public.teacher_substitution_requests ADD CONSTRAINT chk_tsr_phase
  CHECK (workflow_phase = ANY (ARRAY['phase_1_demand_routing','phase_2_execution_closure','completed','cancelled']));