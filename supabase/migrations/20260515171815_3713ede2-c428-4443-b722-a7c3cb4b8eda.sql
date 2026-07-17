ALTER TABLE public.chat_channel_members
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_archived
  ON public.chat_channel_members (user_id, archived_at);

-- Trigger: nova mensagem desarquiva o chat para todos os membros (exceto o autor, que não tinha arquivado intencionalmente para si)
CREATE OR REPLACE FUNCTION public.unarchive_channel_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_channel_members
     SET archived_at = NULL
   WHERE channel_id = NEW.channel_id
     AND archived_at IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unarchive_channel_on_new_message ON public.chat_messages;
CREATE TRIGGER trg_unarchive_channel_on_new_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.unarchive_channel_on_new_message();