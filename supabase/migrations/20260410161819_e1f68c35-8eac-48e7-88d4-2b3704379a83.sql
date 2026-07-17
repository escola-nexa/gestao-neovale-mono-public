
-- Create kanban_lists table
CREATE TABLE public.kanban_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6B7280',
  mapped_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kanban lists of their org"
  ON public.kanban_lists FOR SELECT TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "Admins/coordinators can manage kanban lists"
  ON public.kanban_lists FOR ALL TO authenticated
  USING (public.is_coordinator(auth.uid(), organization_id))
  WITH CHECK (public.is_coordinator(auth.uid(), organization_id));

CREATE TRIGGER update_kanban_lists_updated_at
  BEFORE UPDATE ON public.kanban_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add kanban columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS kanban_list_id UUID REFERENCES public.kanban_lists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kanban_position FLOAT8 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE INDEX idx_tickets_kanban ON public.tickets (kanban_list_id, kanban_position);

-- Function to initialize default kanban lists for an org
CREATE OR REPLACE FUNCTION public.initialize_kanban_lists(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE organization_id = p_org_id) THEN
    INSERT INTO public.kanban_lists (organization_id, name, position, color, mapped_status) VALUES
      (p_org_id, 'Backlog',        0, '#6B7280', 'aberto'),
      (p_org_id, 'Em Andamento',   1, '#F59E0B', 'em_atendimento'),
      (p_org_id, 'Aguardando',     2, '#8B5CF6', 'aguardando_escola'),
      (p_org_id, 'Concluído',      3, '#10B981', 'resolvido');
  END IF;
END;
$$;

-- Function to reorder a kanban card
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
BEGIN
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

  -- Get mapped status from target list
  SELECT mapped_status INTO v_mapped_status
  FROM public.kanban_lists WHERE id = p_new_list_id;

  -- Update ticket
  UPDATE public.tickets
  SET kanban_list_id = p_new_list_id,
      kanban_position = v_new_position,
      status = COALESCE(v_mapped_status, status),
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'new_position', v_new_position,
    'new_status', COALESCE(v_mapped_status, v_ticket.status)
  );
END;
$$;

-- Enable realtime for kanban
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_lists;
