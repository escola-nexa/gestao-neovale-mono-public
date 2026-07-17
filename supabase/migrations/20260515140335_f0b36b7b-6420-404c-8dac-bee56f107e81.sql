
-- 1) chat_message_mentions
CREATE TABLE IF NOT EXISTS public.chat_message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_user ON public.chat_message_mentions(mentioned_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_channel ON public.chat_message_mentions(channel_id);

ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentions select for channel members" ON public.chat_message_mentions;
CREATE POLICY "mentions select for channel members"
ON public.chat_message_mentions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_message_mentions.channel_id AND m.user_id = auth.uid()
  )
);

-- inserts são feitos via trigger SECURITY DEFINER; bloqueia inserts diretos para usuários comuns
DROP POLICY IF EXISTS "mentions insert blocked" ON public.chat_message_mentions;
CREATE POLICY "mentions insert blocked"
ON public.chat_message_mentions FOR INSERT TO authenticated WITH CHECK (false);

-- 2) chat_saved_messages
CREATE TABLE IF NOT EXISTS public.chat_saved_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_saved_user ON public.chat_saved_messages(user_id, saved_at DESC);

ALTER TABLE public.chat_saved_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved select own" ON public.chat_saved_messages;
CREATE POLICY "saved select own" ON public.chat_saved_messages
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved insert own" ON public.chat_saved_messages;
CREATE POLICY "saved insert own" ON public.chat_saved_messages
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved delete own" ON public.chat_saved_messages;
CREATE POLICY "saved delete own" ON public.chat_saved_messages
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3) chat_user_inbox_state
CREATE TABLE IF NOT EXISTS public.chat_user_inbox_state (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_user_inbox_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inbox state select own" ON public.chat_user_inbox_state;
CREATE POLICY "inbox state select own" ON public.chat_user_inbox_state
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "inbox state upsert own" ON public.chat_user_inbox_state;
CREATE POLICY "inbox state upsert own" ON public.chat_user_inbox_state
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "inbox state update own" ON public.chat_user_inbox_state;
CREATE POLICY "inbox state update own" ON public.chat_user_inbox_state
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4) Trigger: extrai menções e gera notificações específicas
CREATE OR REPLACE FUNCTION public.tg_chat_extract_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel RECORD;
  v_author_name TEXT;
  v_match TEXT[];
  v_user_id uuid;
  v_muted boolean;
BEGIN
  IF NEW.body IS NULL OR NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_channel FROM public.chat_channels WHERE id = NEW.channel_id;
  IF v_channel IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_author_name FROM public.profiles WHERE user_id = NEW.author_id;
  v_author_name := COALESCE(v_author_name, 'Alguém');

  FOR v_match IN
    SELECT regexp_matches(NEW.body, '@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)', 'g')
  LOOP
    BEGIN
      v_user_id := v_match[2]::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;

    IF v_user_id = NEW.author_id THEN CONTINUE; END IF;

    -- só conta menções a membros do canal
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_channel_members
      WHERE channel_id = NEW.channel_id AND user_id = v_user_id
    ) THEN CONTINUE; END IF;

    BEGIN
      INSERT INTO public.chat_message_mentions (message_id, channel_id, mentioned_user_id, author_id)
      VALUES (NEW.id, NEW.channel_id, v_user_id, NEW.author_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN NULL;
    END;

    -- respeita mute do canal
    SELECT (muted_until IS NOT NULL AND muted_until > now()) INTO v_muted
    FROM public.chat_channel_members
    WHERE channel_id = NEW.channel_id AND user_id = v_user_id;

    IF COALESCE(v_muted, false) THEN CONTINUE; END IF;

    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        v_user_id,
        v_author_name || ' mencionou você em ' || v_channel.name,
        LEFT(COALESCE(NEW.body, ''), 160),
        'CHAT_MENTION',
        NEW.channel_id
      );
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chat_messages_extract_mentions ON public.chat_messages;
CREATE TRIGGER chat_messages_extract_mentions
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_chat_extract_mentions();
