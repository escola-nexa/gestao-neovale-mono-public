
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.chat_channel_type AS ENUM (
    'coordenacao', 'professores', 'projeto', 'rh', 'escola', 'curso', 'direct'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_attachment_kind AS ENUM ('file', 'image', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new notification types if enum exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'CHAT_MENTION'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INCIDENT_NEW'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INCIDENT_ACK'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'INCIDENT_RESOLVED'; EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type public.chat_channel_type NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON public.chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_school ON public.chat_channels(school_id);

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.chat_member_role NOT NULL DEFAULT 'member',
  can_post BOOLEAN NOT NULL DEFAULT true,
  last_read_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_channel_members(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_channel_created ON public.chat_messages(channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  kind public.chat_attachment_kind NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_attach_msg ON public.chat_message_attachments(message_id);

CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON public.chat_message_reads(user_id);

-- ============ HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_chat_channel_member(_channel_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_post_in_channel(_channel_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id AND can_post = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_chat_channel_org(_channel_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.chat_channels WHERE id = _channel_id; $$;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_chat_channels_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS chat_channels_set_updated_at ON public.chat_channels;
CREATE TRIGGER chat_channels_set_updated_at
BEFORE UPDATE ON public.chat_channels
FOR EACH ROW EXECUTE FUNCTION public.tg_chat_channels_updated_at();

-- Auto-add creator as owner
CREATE OR REPLACE FUNCTION public.tg_chat_channel_add_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.chat_channel_members (channel_id, user_id, role, can_post)
  VALUES (NEW.id, NEW.created_by, 'owner', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chat_channels_add_creator ON public.chat_channels;
CREATE TRIGGER chat_channels_add_creator
AFTER INSERT ON public.chat_channels
FOR EACH ROW EXECUTE FUNCTION public.tg_chat_channel_add_creator();

-- Notify members on new message (skip author)
CREATE OR REPLACE FUNCTION public.tg_chat_notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel RECORD;
  v_author_name TEXT;
  v_member RECORD;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_channel FROM public.chat_channels WHERE id = NEW.channel_id;
  IF v_channel IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_author_name FROM public.profiles WHERE user_id = NEW.author_id;
  v_author_name := COALESCE(v_author_name, 'Alguém');

  FOR v_member IN
    SELECT user_id FROM public.chat_channel_members
    WHERE channel_id = NEW.channel_id
      AND user_id <> NEW.author_id
      AND (muted_until IS NULL OR muted_until < now())
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        v_member.user_id,
        CASE WHEN NEW.is_announcement THEN 'Comunicado: ' || v_channel.name ELSE 'Nova mensagem em ' || v_channel.name END,
        v_author_name || ': ' || LEFT(COALESCE(NEW.body, '[anexo]'), 120),
        'CHAT_MESSAGE',
        NEW.channel_id
      );
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chat_messages_notify ON public.chat_messages;
CREATE TRIGGER chat_messages_notify
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_chat_notify_new_message();

-- ============ RLS ============
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

-- chat_channels
CREATE POLICY "channels_select_member" ON public.chat_channels
FOR SELECT TO authenticated
USING (public.is_chat_channel_member(id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "channels_insert_admin_coord_or_dm" ON public.chat_channels
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.has_organization_access(auth.uid(), organization_id)
  AND (
    type = 'direct'
    OR public.is_coordinator(auth.uid(), organization_id)
  )
);

CREATE POLICY "channels_update_admin_or_owner" ON public.chat_channels
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channels.id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  )
);

CREATE POLICY "channels_delete_admin_or_owner" ON public.chat_channels
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- chat_channel_members
CREATE POLICY "members_select_self_or_member" ON public.chat_channel_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_chat_channel_member(channel_id, auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "members_insert_admin_coord_or_self_dm" ON public.chat_channel_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Admin/coordenador can add anyone; user can add themselves; channel owner/admin can add
  public.is_admin(auth.uid())
  OR public.is_coordinator(auth.uid(), public.get_chat_channel_org(channel_id))
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channel_members.channel_id
      AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  )
);

CREATE POLICY "members_update_self_or_admin" ON public.chat_channel_members
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channel_members.channel_id
      AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  )
);

CREATE POLICY "members_delete_self_or_admin" ON public.chat_channel_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channel_members.channel_id
      AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
  )
);

-- chat_messages
CREATE POLICY "msgs_select_member" ON public.chat_messages
FOR SELECT TO authenticated
USING (public.is_chat_channel_member(channel_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "msgs_insert_member_can_post" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.can_post_in_channel(channel_id, auth.uid())
);

CREATE POLICY "msgs_update_author_or_admin" ON public.chat_messages
FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "msgs_delete_author_or_admin" ON public.chat_messages
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- chat_message_attachments
CREATE POLICY "attach_select_member" ON public.chat_message_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_attachments.message_id
      AND (public.is_chat_channel_member(m.channel_id, auth.uid()) OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "attach_insert_author" ON public.chat_message_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_attachments.message_id
      AND m.author_id = auth.uid()
  )
);

CREATE POLICY "attach_delete_author_or_admin" ON public.chat_message_attachments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_attachments.message_id
      AND (m.author_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- chat_message_reads
CREATE POLICY "reads_select_member" ON public.chat_message_reads
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_reads.message_id
      AND public.is_chat_channel_member(m.channel_id, auth.uid())
  )
);

CREATE POLICY "reads_insert_self" ON public.chat_message_reads
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reads_delete_self" ON public.chat_message_reads
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_attach_select_member" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.chat_message_attachments a
    JOIN public.chat_messages m ON m.id = a.message_id
    WHERE a.file_path = storage.objects.name
      AND public.is_chat_channel_member(m.channel_id, auth.uid())
  )
);

CREATE POLICY "chat_attach_insert_auth" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_attach_delete_owner_or_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);

-- ============ REALTIME ============
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channel_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
