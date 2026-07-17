ALTER TABLE public.teacher_substitution_requests DROP CONSTRAINT IF EXISTS chk_tsr_status;

ALTER TABLE public.teacher_substitution_requests ADD CONSTRAINT chk_tsr_status CHECK (status = ANY (ARRAY[
  'draft','identified_absence','request_created','ticket_created','routed_to_channel',
  'awaiting_substitute_indication','substitute_suggested','substitute_confirmed',
  'in_execution','execution_completed','report_pending','report_generated',
  'signed_report_pending','signed_report_uploaded','pending_rh_validation',
  'approved_for_payment','payment_pending','payment_completed','cancelled','reopened',
  'rh_in_progress','returned_to_coordinator','substitution_completed'
]));