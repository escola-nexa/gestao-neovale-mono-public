-- Drop the old constraint and add updated one with ticket notification types
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'ORIENTATION_CREATED',
    'ORIENTATION_ACCEPTED',
    'ORIENTATION_REJECTED',
    'ORIENTATION_SIGNED',
    'GENERAL',
    'TICKET_CREATED',
    'TICKET_RESOLVED',
    'TICKET_STATUS_CHANGED'
  ]));
