
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
    SELECT nome INTO v_school_name FROM public.schools WHERE id = NEW.school_id;
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
