
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
  -- Mapeia tipo de ocorrência -> prioridade do ticket
  v_priority := CASE NEW.incident_type
    WHEN 'emergencia' THEN 'urgente'
    WHEN 'problema_saude' THEN 'urgente'
    WHEN 'falta' THEN 'alta'
    WHEN 'ausencia_nao_programada' THEN 'alta'
    WHEN 'substituicao_urgente' THEN 'alta'
    WHEN 'imprevisto_deslocamento' THEN 'alta'
    WHEN 'atraso' THEN 'media'
    WHEN 'atestado' THEN 'media'
    ELSE 'media'
  END;

  IF NEW.school_id IS NOT NULL THEN
    SELECT name INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
  END IF;

  v_title := '[Ocorrência] ' || NEW.incident_type::text
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
    COALESCE(NEW.summary, '') || E'\n\n— Gerado automaticamente a partir de ocorrência urgente.',
    v_priority,
    'aberto',
    NEW.reporter_id,
    NEW.school_id
  ) RETURNING id INTO v_ticket_id;

  NEW.ticket_id := v_ticket_id;
  RETURN NEW;
END;
$$;

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
    IF NEW.status = 'resolvido' THEN
      UPDATE public.tickets
        SET status = 'resolvido', resolved_at = now()
        WHERE id = NEW.ticket_id;
    ELSIF NEW.status IN ('ciente_rh', 'ciente_coordenacao') THEN
      UPDATE public.tickets
        SET status = 'em_andamento'
        WHERE id = NEW.ticket_id AND status = 'aberto';
    ELSIF NEW.status = 'cancelado' THEN
      UPDATE public.tickets
        SET status = 'fechado'
        WHERE id = NEW.ticket_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
