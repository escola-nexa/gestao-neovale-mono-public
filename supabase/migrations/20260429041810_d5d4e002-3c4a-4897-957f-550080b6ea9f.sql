-- Add deleted_by tracking and deleter profile lookup support
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_by ON public.chat_messages(deleted_by);