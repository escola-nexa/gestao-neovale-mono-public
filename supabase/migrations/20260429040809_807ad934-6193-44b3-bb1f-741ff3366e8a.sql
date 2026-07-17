-- Tabela de reações de emoji em mensagens do chat
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user ON public.chat_message_reactions(user_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;

-- Helper: usuário pode ver/reagir se for membro do canal da mensagem
CREATE OR REPLACE FUNCTION public.user_is_member_of_message_channel(_message_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_channel_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = _message_id AND cm.user_id = _user_id
  );
$$;

CREATE POLICY "Members can view reactions"
ON public.chat_message_reactions FOR SELECT
TO authenticated
USING (public.user_is_member_of_message_channel(message_id, auth.uid()));

CREATE POLICY "Members can add own reactions"
ON public.chat_message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_is_member_of_message_channel(message_id, auth.uid())
);

CREATE POLICY "Users can delete own reactions"
ON public.chat_message_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Habilita realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;