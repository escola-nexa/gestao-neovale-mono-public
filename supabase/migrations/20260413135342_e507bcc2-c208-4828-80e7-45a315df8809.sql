
CREATE OR REPLACE FUNCTION public.initialize_kanban_lists(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.kanban_lists WHERE organization_id = p_org_id) THEN
    INSERT INTO public.kanban_lists (organization_id, name, position, color, mapped_status) VALUES
      (p_org_id, 'Abertos',        0, '#6B7280', 'aberto'),
      (p_org_id, 'Em Andamento',   1, '#F59E0B', 'em_atendimento'),
      (p_org_id, 'Aguardando',     2, '#8B5CF6', 'aguardando_escola'),
      (p_org_id, 'Concluído',      3, '#10B981', 'resolvido');
  END IF;
END;
$$;
