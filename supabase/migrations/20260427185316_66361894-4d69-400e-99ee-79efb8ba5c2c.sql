
-- 1. Vínculo entre ocorrência e ticket
ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incident_reports_ticket_id ON public.incident_reports(ticket_id);

-- 2. Função: ao criar ocorrência, gerar ticket interno automaticamente
CREATE OR REPLACE FUNCTION public.create_ticket_from_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_priority text;
  v_title text;
  v_school_name text;
BEGIN
  -- Mapeia severidade da ocorrência -> prioridade do ticket
  v_priority := CASE NEW.severity
    WHEN 'critical' THEN 'urgente'
    WHEN 'high' THEN 'alta'
    WHEN 'medium' THEN 'media'
    ELSE 'baixa'
  END;

  SELECT name INTO v_school_name FROM public.schools WHERE id = NEW.school_id;

  v_title := '[Ocorrência] ' || COALESCE(NEW.title, NEW.incident_type::text)
             || COALESCE(' - ' || v_school_name, '');

  INSERT INTO public.tickets (
    organization_id,
    type,
    title,
    description,
    priority,
    status,
    created_by,
    school_id
  ) VALUES (
    NEW.organization_id,
    'interno'::ticket_type,
    v_title,
    COALESCE(NEW.description, '') || E'\n\n— Gerado automaticamente a partir de ocorrência urgente.',
    v_priority,
    'aberto',
    NEW.reported_by,
    NEW.school_id
  ) RETURNING id INTO v_ticket_id;

  NEW.ticket_id := v_ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_create_ticket ON public.incident_reports;
CREATE TRIGGER trg_incident_create_ticket
  BEFORE INSERT ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ticket_from_incident();

-- 3. Função: sincroniza status do ticket quando ocorrência muda
CREATE OR REPLACE FUNCTION public.sync_ticket_from_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'resolved' THEN
      UPDATE public.tickets
        SET status = 'resolvido', resolved_at = now()
        WHERE id = NEW.ticket_id;
    ELSIF NEW.status = 'acknowledged' THEN
      UPDATE public.tickets
        SET status = 'em_andamento'
        WHERE id = NEW.ticket_id AND status = 'aberto';
    ELSIF NEW.status = 'cancelled' THEN
      UPDATE public.tickets
        SET status = 'fechado'
        WHERE id = NEW.ticket_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_sync_ticket ON public.incident_reports;
CREATE TRIGGER trg_incident_sync_ticket
  AFTER UPDATE ON public.incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ticket_from_incident();
