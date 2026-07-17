
-- Ticket categories
CREATE TABLE public.ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories" ON public.ticket_categories
  FOR SELECT USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins manage categories" ON public.ticket_categories
  FOR ALL USING (public.is_admin(auth.uid()) AND public.has_organization_access(auth.uid(), organization_id));

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.ticket_categories(id),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_andamento','aguardando_resposta','resolvido','fechado')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','urgente')),
  created_by UUID,
  school_responsible_id UUID,
  nexa_responsible_id UUID,
  external_token TEXT UNIQUE,
  external_author_name TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_org ON public.tickets(organization_id);
CREATE INDEX idx_tickets_school ON public.tickets(school_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_external_token ON public.tickets(external_token) WHERE external_token IS NOT NULL;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage all tickets" ON public.tickets
  FOR ALL USING (public.is_admin(auth.uid()) AND public.has_organization_access(auth.uid(), organization_id));

-- Coordinators: full access on their school's tickets
CREATE POLICY "Coordinators manage school tickets" ON public.tickets
  FOR ALL USING (
    public.is_coordinator(auth.uid(), organization_id)
    AND public.has_organization_access(auth.uid(), organization_id)
  );

-- Professors: view tickets from their schools
CREATE POLICY "Professors view school tickets" ON public.tickets
  FOR SELECT USING (
    public.is_professor(auth.uid(), organization_id)
    AND school_id IN (
      SELECT psc.school_id FROM public.professor_school_courses psc
      JOIN public.professors p ON p.id = psc.professor_id
      WHERE p.user_id = auth.uid() AND psc.status = 'ACTIVE'
    )
  );

-- Professors: create tickets
CREATE POLICY "Professors create tickets" ON public.tickets
  FOR INSERT WITH CHECK (
    public.has_organization_access(auth.uid(), organization_id)
    AND created_by = auth.uid()
  );

-- Ticket messages
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Admins: full access to messages
CREATE POLICY "Admins manage all messages" ON public.ticket_messages
  FOR ALL USING (public.is_admin(auth.uid()) AND public.has_organization_access(auth.uid(), organization_id));

-- Coordinators: full access to messages in their org
CREATE POLICY "Coordinators manage messages" ON public.ticket_messages
  FOR ALL USING (
    public.is_coordinator(auth.uid(), organization_id)
    AND public.has_organization_access(auth.uid(), organization_id)
  );

-- Professors: view non-internal messages for their school tickets
CREATE POLICY "Professors view messages" ON public.ticket_messages
  FOR SELECT USING (
    public.is_professor(auth.uid(), organization_id)
    AND is_internal_note = false
    AND ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.professor_school_courses psc ON psc.school_id = t.school_id
      JOIN public.professors p ON p.id = psc.professor_id
      WHERE p.user_id = auth.uid() AND psc.status = 'ACTIVE'
    )
  );

-- Professors: create messages (not internal notes)
CREATE POLICY "Professors create messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    public.has_organization_access(auth.uid(), organization_id)
    AND sender_id = auth.uid()
    AND is_internal_note = false
  );

-- Triggers for updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification triggers for tickets
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_name TEXT;
  v_author_name TEXT;
BEGIN
  SELECT nome INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
  v_author_name := COALESCE(NEW.external_author_name, (SELECT full_name FROM public.profiles WHERE user_id = NEW.created_by));

  -- Notify school coordinator
  IF NEW.school_responsible_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.school_responsible_id,
      'Novo Ticket Aberto',
      'Ticket #' || NEW.ticket_number || ' aberto por ' || COALESCE(v_author_name, 'Externo') || ' na escola ' || v_school_name,
      'TICKET_CREATED',
      NEW.id
    );
  END IF;

  -- Notify admin
  IF NEW.nexa_responsible_id IS NOT NULL AND NEW.nexa_responsible_id != NEW.school_responsible_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.nexa_responsible_id,
      'Novo Ticket Aberto',
      'Ticket #' || NEW.ticket_number || ': ' || NEW.title || ' — ' || v_school_name,
      'TICKET_CREATED',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_created();

-- Notify on status change to resolved
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Set resolved_at/closed_at timestamps
    IF NEW.status = 'resolvido' AND OLD.status != 'resolvido' THEN
      NEW.resolved_at := now();
    END IF;
    IF NEW.status = 'fechado' AND OLD.status != 'fechado' THEN
      NEW.closed_at := now();
    END IF;

    -- Notify ticket creator when resolved
    IF NEW.status = 'resolvido' AND NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.created_by,
        'Ticket Resolvido',
        'Seu ticket #' || NEW.ticket_number || ' foi marcado como resolvido.',
        'TICKET_RESOLVED',
        NEW.id
      );
    END IF;

    -- Notify admin on any update from school side
    IF NEW.nexa_responsible_id IS NOT NULL AND NEW.status IN ('em_andamento', 'aguardando_resposta') THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.nexa_responsible_id,
        'Ticket Atualizado',
        'Ticket #' || NEW.ticket_number || ' mudou para: ' || REPLACE(NEW.status, '_', ' '),
        'TICKET_UPDATED',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_ticket_status_change
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_status_change();

-- Auto-assign admin as nexa_responsible
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_responsible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coordinator_id UUID;
  v_admin_id UUID;
BEGIN
  -- Auto-assign school coordinator if not set
  IF NEW.school_responsible_id IS NULL THEN
    SELECT ur.user_id INTO v_coordinator_id
    FROM public.user_roles ur
    WHERE ur.organization_id = NEW.organization_id
      AND ur.role = 'coordenador'
    LIMIT 1;
    NEW.school_responsible_id := v_coordinator_id;
  END IF;

  -- Auto-assign admin if not set
  IF NEW.nexa_responsible_id IS NULL THEN
    SELECT ur.user_id INTO v_admin_id
    FROM public.user_roles ur
    WHERE ur.organization_id = NEW.organization_id
      AND ur.role = 'admin'
    LIMIT 1;
    NEW.nexa_responsible_id := v_admin_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_assign_ticket_responsible
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_ticket_responsible();

-- Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false);

CREATE POLICY "Authenticated users can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view ticket attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
