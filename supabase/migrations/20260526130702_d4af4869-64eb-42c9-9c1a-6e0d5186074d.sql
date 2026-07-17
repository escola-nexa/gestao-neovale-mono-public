ALTER TABLE public.ticket_messages
  ADD COLUMN IF NOT EXISTS parent_message_id uuid NULL REFERENCES public.ticket_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_parent ON public.ticket_messages(parent_message_id);