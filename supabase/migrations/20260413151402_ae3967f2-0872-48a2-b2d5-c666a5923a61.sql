
-- 1. Fix notify_ticket_created: replace ticket_number with title
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_name TEXT;
  v_author_name TEXT;
  v_msg TEXT;
BEGIN
  IF NEW.school_id IS NOT NULL THEN
    SELECT nome INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
  END IF;

  IF NEW.opened_by_id IS NOT NULL THEN
    SELECT full_name INTO v_author_name FROM public.profiles WHERE user_id = NEW.opened_by_id;
  ELSIF NEW.external_author_name IS NOT NULL THEN
    v_author_name := NEW.external_author_name;
  END IF;

  IF NEW.school_responsible_id IS NOT NULL THEN
    v_msg := 'Ticket "' || NEW.title || '" aberto por ' || COALESCE(v_author_name, 'Usuário') || COALESCE(' na escola ' || v_school_name, ' (interno)');
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.school_responsible_id, 'Novo Ticket Aberto', v_msg, 'TICKET_CREATED', NEW.id);
  END IF;

  IF NEW.nexa_responsible_id IS NOT NULL AND NEW.nexa_responsible_id IS DISTINCT FROM NEW.school_responsible_id THEN
    v_msg := 'Ticket: ' || NEW.title || COALESCE(' — ' || v_school_name, ' (interno)');
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (NEW.nexa_responsible_id, 'Novo Ticket Aberto', v_msg, 'TICKET_CREATED', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix notify_ticket_status_change: replace ticket_number with title
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('fechado', 'cancelado') AND OLD.status NOT IN ('fechado', 'cancelado') THEN
      NEW.closed_at := now();
    END IF;

    IF NEW.status = 'resolvido' AND NEW.opened_by_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.opened_by_id,
        'Ticket Resolvido',
        'Seu ticket "' || NEW.title || '" foi marcado como resolvido.',
        'TICKET_RESOLVED',
        NEW.id
      );
    END IF;

    IF NEW.nexa_responsible_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        NEW.nexa_responsible_id,
        'Ticket Atualizado',
        'Ticket "' || NEW.title || '" mudou para: ' || REPLACE(NEW.status, '_', ' '),
        'TICKET_STATUS_CHANGED',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
