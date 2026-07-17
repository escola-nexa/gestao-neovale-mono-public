ALTER TABLE public.teacher_substitution_audit_logs DROP CONSTRAINT IF EXISTS chk_tsa_action;
ALTER TABLE public.teacher_substitution_audit_logs ADD CONSTRAINT chk_tsa_action CHECK (action = ANY (ARRAY[
  'substitution_created','ticket_created','channel_notified','routed_to_channel',
  'candidate_suggested','substitute_confirmed','execution_confirmed',
  'declaration_generated','receipt_generated','document_uploaded','signed_report_uploaded',
  'payment_calculated','payment_approved','approved_for_payment','payment_scheduled','payment_completed',
  'returned_for_correction','status_changed','cancelled','substitution_cancelled','substitution_reopened',
  'settings_changed','financial_access_granted','financial_access_revoked','financial_details_viewed',
  'rh_take','rh_return','coord_notify_school','coord_return_to_rh'
]));