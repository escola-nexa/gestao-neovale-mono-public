
-- Enhanced reorder function with audit, closed_at sync, and permission checks
CREATE OR REPLACE FUNCTION public.reorder_kanban_card(
  p_ticket_id UUID,
  p_new_list_id UUID,
  p_prev_position FLOAT8 DEFAULT NULL,
  p_next_position FLOAT8 DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_position FLOAT8;
  v_mapped_status TEXT;
  v_ticket RECORD;
  v_old_list_name TEXT;
  v_new_list_name TEXT;
  v_old_list_id UUID;
  v_caller_id UUID := auth.uid();
  v_is_admin_or_coord BOOLEAN;
BEGIN
  -- Get current ticket info
  SELECT t.*, kl.name AS current_list_name
  INTO v_ticket
  FROM public.tickets t
  LEFT JOIN public.kanban_lists kl ON kl.id = t.kanban_list_id
  WHERE t.id = p_ticket_id;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket não encontrado');
  END IF;

  v_old_list_id := v_ticket.kanban_list_id;
  v_old_list_name := v_ticket.current_list_name;

  -- Permission check: admin/coordinator can move any card, others only their own
  v_is_admin_or_coord := public.is_coordinator(v_caller_id, v_ticket.organization_id);
  IF NOT v_is_admin_or_coord AND v_ticket.created_by <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para mover este cartão');
  END IF;

  -- Calculate new position
  IF p_prev_position IS NULL AND p_next_position IS NULL THEN
    v_new_position := 65536;
  ELSIF p_prev_position IS NULL THEN
    v_new_position := p_next_position / 2;
  ELSIF p_next_position IS NULL THEN
    v_new_position := p_prev_position + 65536;
  ELSE
    v_new_position := (p_prev_position + p_next_position) / 2;
  END IF;

  -- Get mapped status and name from target list
  SELECT mapped_status, name INTO v_mapped_status, v_new_list_name
  FROM public.kanban_lists WHERE id = p_new_list_id;

  -- Update ticket with status sync and closed_at handling
  UPDATE public.tickets
  SET kanban_list_id = p_new_list_id,
      kanban_position = v_new_position,
      status = COALESCE(v_mapped_status, status),
      closed_at = CASE
        WHEN v_mapped_status IN ('resolvido', 'cancelado') THEN COALESCE(closed_at, now())
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = p_ticket_id;

  -- Log audit event when list changed
  IF v_old_list_id IS DISTINCT FROM p_new_list_id THEN
    INSERT INTO public.audit_events (
      organization_id, user_id, module, action, details
    ) VALUES (
      v_ticket.organization_id,
      v_caller_id,
      'tickets',
      'kanban_move',
      jsonb_build_object(
        'ticket_id', p_ticket_id,
        'ticket_title', v_ticket.title,
        'from_list', COALESCE(v_old_list_name, 'Sem lista'),
        'to_list', COALESCE(v_new_list_name, 'Desconhecida'),
        'new_status', COALESCE(v_mapped_status, v_ticket.status)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'new_position', v_new_position,
    'new_status', COALESCE(v_mapped_status, v_ticket.status),
    'list_changed', v_old_list_id IS DISTINCT FROM p_new_list_id
  );
END;
$$;
