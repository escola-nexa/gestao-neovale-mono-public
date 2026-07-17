ALTER TABLE public.chat_channel_members
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_pinned
  ON public.chat_channel_members (user_id, pinned_at);