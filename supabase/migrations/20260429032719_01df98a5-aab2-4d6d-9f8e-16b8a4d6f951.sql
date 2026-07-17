
-- =========================================================
-- 1) chat_channel_labels (etiquetas reutilizáveis de canal)
-- =========================================================
CREATE TABLE public.chat_channel_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_chat_channel_labels_org ON public.chat_channel_labels(organization_id);
ALTER TABLE public.chat_channel_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccl_select_org_member" ON public.chat_channel_labels
FOR SELECT TO authenticated
USING (has_organization_access(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "ccl_modify_admin_coord" ON public.chat_channel_labels
FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_admin(auth.uid()) OR is_coordinator(auth.uid(), organization_id));

-- =========================================================
-- 2) chat_channel_label_assignments
-- =========================================================
CREATE TABLE public.chat_channel_label_assignments (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.chat_channel_labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, label_id)
);
CREATE INDEX idx_ccla_label ON public.chat_channel_label_assignments(label_id);
ALTER TABLE public.chat_channel_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccla_select_member" ON public.chat_channel_label_assignments
FOR SELECT TO authenticated
USING (is_chat_channel_member(channel_id, auth.uid()) OR is_admin(auth.uid())
  OR is_coordinator(auth.uid(), get_chat_channel_org(channel_id)));

CREATE POLICY "ccla_modify_admin_coord" ON public.chat_channel_label_assignments
FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR is_coordinator(auth.uid(), get_chat_channel_org(channel_id))
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channel_label_assignments.channel_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR is_coordinator(auth.uid(), get_chat_channel_org(channel_id))
  OR EXISTS (
    SELECT 1 FROM public.chat_channel_members m
    WHERE m.channel_id = chat_channel_label_assignments.channel_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

-- =========================================================
-- 3) chat_message_labels
-- =========================================================
CREATE TABLE public.chat_message_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#F59E0B',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_chat_message_labels_org ON public.chat_message_labels(organization_id);
ALTER TABLE public.chat_message_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cml_select_org_member" ON public.chat_message_labels
FOR SELECT TO authenticated
USING (has_organization_access(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "cml_modify_admin_coord" ON public.chat_message_labels
FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR is_coordinator(auth.uid(), organization_id))
WITH CHECK (is_admin(auth.uid()) OR is_coordinator(auth.uid(), organization_id));

-- =========================================================
-- 4) chat_message_label_assignments
-- =========================================================
CREATE TABLE public.chat_message_label_assignments (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.chat_message_labels(id) ON DELETE CASCADE,
  applied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, label_id)
);
CREATE INDEX idx_cmla_label ON public.chat_message_label_assignments(label_id);
ALTER TABLE public.chat_message_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmla_select_member" ON public.chat_message_label_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_label_assignments.message_id
      AND (is_chat_channel_member(m.channel_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "cmla_modify_author_or_admin" ON public.chat_message_label_assignments
FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_label_assignments.message_id
      AND (
        m.author_id = auth.uid()
        OR is_coordinator(auth.uid(), get_chat_channel_org(m.channel_id))
        OR EXISTS (
          SELECT 1 FROM public.chat_channel_members cm
          WHERE cm.channel_id = m.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
      )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_label_assignments.message_id
      AND (
        m.author_id = auth.uid()
        OR is_coordinator(auth.uid(), get_chat_channel_org(m.channel_id))
        OR EXISTS (
          SELECT 1 FROM public.chat_channel_members cm
          WHERE cm.channel_id = m.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
      )
  )
);

-- =========================================================
-- 5) chat_message_tickets (vínculo mensagem ↔ ticket)
-- =========================================================
CREATE TABLE public.chat_message_tickets (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, ticket_id)
);
CREATE INDEX idx_cmt_ticket ON public.chat_message_tickets(ticket_id);
ALTER TABLE public.chat_message_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmt_select_member" ON public.chat_message_tickets
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_tickets.message_id
      AND (is_chat_channel_member(m.channel_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "cmt_insert_member" ON public.chat_message_tickets
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_tickets.message_id
      AND (is_chat_channel_member(m.channel_id, auth.uid()) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "cmt_delete_creator_or_admin" ON public.chat_message_tickets
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_tickets.message_id
      AND is_coordinator(auth.uid(), get_chat_channel_org(m.channel_id))
  )
);

-- =========================================================
-- 6) Seed de etiquetas iniciais por organização
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_default_chat_labels(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_message_labels (organization_id, name, color) VALUES
    (p_org_id, 'Urgente', '#EF4444'),
    (p_org_id, 'Decisão', '#10B981'),
    (p_org_id, 'Pauta', '#3B82F6'),
    (p_org_id, 'Pendência', '#F59E0B')
  ON CONFLICT (organization_id, name) DO NOTHING;

  INSERT INTO public.chat_channel_labels (organization_id, name, color) VALUES
    (p_org_id, 'Projeto', '#8B5CF6'),
    (p_org_id, 'Pedagógico', '#10B981'),
    (p_org_id, 'Administrativo', '#3B82F6'),
    (p_org_id, 'Confidencial', '#EF4444')
  ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_seed_chat_labels_on_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_chat_labels(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_chat_labels_on_org ON public.organizations;
CREATE TRIGGER trg_seed_chat_labels_on_org
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_chat_labels_on_org();

-- Seed para organizações já existentes
DO $$
DECLARE
  o RECORD;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_chat_labels(o.id);
  END LOOP;
END $$;

-- =========================================================
-- 7) Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_label_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_label_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_tickets;
