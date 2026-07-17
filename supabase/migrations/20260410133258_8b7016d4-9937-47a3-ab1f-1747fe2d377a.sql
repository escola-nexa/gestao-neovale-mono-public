
-- 1. Trigger: notify on new ticket message (opposite party)
CREATE OR REPLACE FUNCTION public.notify_ticket_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_notify_user_id UUID;
  v_sender_display TEXT;
BEGIN
  -- Skip internal notes
  IF NEW.is_internal_note = true THEN
    RETURN NEW;
  END IF;

  SELECT t.*, s.nome AS school_name
  INTO v_ticket
  FROM public.tickets t
  LEFT JOIN public.schools s ON s.id = t.school_id
  WHERE t.id = NEW.ticket_id;

  IF v_ticket IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine sender display name
  IF NEW.author_id IS NOT NULL THEN
    SELECT full_name INTO v_sender_display FROM public.profiles WHERE user_id = NEW.author_id;
  ELSE
    v_sender_display := 'Usuário Externo';
  END IF;

  -- If sender is the school responsible or external, notify NEXA admin
  IF NEW.author_id IS NULL OR NEW.author_id = v_ticket.school_responsible_id THEN
    IF v_ticket.nexa_responsible_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (v_ticket.nexa_responsible_id, 'Nova Mensagem no Ticket',
        COALESCE(v_sender_display, 'Externo') || ' respondeu no ticket "' || v_ticket.title || '"',
        'TICKET_MESSAGE', v_ticket.id);
    END IF;
  END IF;

  -- If sender is NEXA admin, notify school responsible
  IF NEW.author_id = v_ticket.nexa_responsible_id THEN
    IF v_ticket.school_responsible_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (v_ticket.school_responsible_id, 'Nova Mensagem no Ticket',
        COALESCE(v_sender_display, 'Admin') || ' respondeu no ticket "' || v_ticket.title || '"',
        'TICKET_MESSAGE', v_ticket.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_new_message
AFTER INSERT ON public.ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_new_message();

-- 2. Update auto_assign to find school-specific coordinator
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
  -- Find coordinator linked to this specific school
  IF NEW.school_responsible_id IS NULL AND NEW.school_id IS NOT NULL THEN
    SELECT DISTINCT ur.user_id INTO v_coordinator_id
    FROM public.user_roles ur
    JOIN public.professors p ON p.user_id = ur.user_id AND p.organization_id = NEW.organization_id
    JOIN public.professor_school_courses psc ON psc.professor_id = p.id AND psc.school_id = NEW.school_id AND psc.status = 'ACTIVE'
    WHERE ur.organization_id = NEW.organization_id
      AND ur.role = 'coordenador'
    LIMIT 1;

    -- Fallback: any coordinator in the org
    IF v_coordinator_id IS NULL THEN
      SELECT ur.user_id INTO v_coordinator_id
      FROM public.user_roles ur
      WHERE ur.organization_id = NEW.organization_id
        AND ur.role = 'coordenador'
      LIMIT 1;
    END IF;

    NEW.school_responsible_id := v_coordinator_id;
  END IF;

  -- Auto-assign admin (NEXA responsible)
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

-- 3. SLA escalation function (to be called periodically)
CREATE OR REPLACE FUNCTION public.escalate_ticket_sla()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Escalate tickets with no messages in 24h to 'critica' priority
  UPDATE public.tickets t
  SET priority = 'critica', updated_at = now()
  WHERE t.status IN ('aberto', 'em_atendimento', 'aguardando_escola')
    AND t.priority != 'critica'
    AND NOT EXISTS (
      SELECT 1 FROM public.ticket_messages tm
      WHERE tm.ticket_id = t.id
        AND tm.created_at > (now() - interval '24 hours')
    )
    AND t.created_at < (now() - interval '24 hours');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
